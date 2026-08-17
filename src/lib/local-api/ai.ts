/**
 * Browser-side AI chat client.
 *
 * The former server used the `z-ai-web-dev-sdk` (Node-only: reads
 * `.z-ai-config` from disk). In the browser we call the same
 * OpenAI-compatible `POST {baseUrl}/chat/completions` endpoint
 * directly, using credentials the user configures in
 * Settings → AI (stored only in their own browser's localStorage).
 *
 * AI is entirely optional: provider "none" disables it and the rest
 * of the application works without it. Manuscript content is only
 * ever sent to the endpoint the user configured.
 */

import { loadAISettings, loadPrivacySettings } from "@/lib/settings"

export interface AIConfig {
  provider: "none" | "zai" | "ollama" | "custom"
  model: string
  temperature: number
  baseUrl: string
  apiKey: string
}

export function loadAIConfig(): AIConfig {
  const ai = loadAISettings()
  return {
    provider: ai.provider,
    model: ai.model || "default",
    temperature: ai.temperature,
    baseUrl: ai.baseUrl,
    apiKey: ai.apiKey,
  }
}

export function isAIConfigured(): boolean {
  const cfg = loadAIConfig()
  const privacy = loadPrivacySettings()
  if (privacy.localOnlyMode && cfg.provider !== "none" && cfg.provider !== "ollama") return false
  return cfg.provider !== "none" && cfg.baseUrl.trim() !== ""
}

export function aiPrivacyLabel(): string {
  const cfg = loadAIConfig()
  if (cfg.provider === "none") return "AI is disabled. Nothing is sent."
  if (cfg.provider === "ollama") return "Ollama runs locally on your machine."
  return `AI requests are sent to ${cfg.baseUrl}`
}

export interface ChatMessage {
  role: string
  content: string
}

export interface ModelInfo {
  id: string
  name: string
}

export interface LocalAIDetection {
  detected: "ollama" | "openai" | "none"
  models: ModelInfo[]
  baseUrl: string
}

/**
 * Probe a base URL for a local/remote OpenAI-compatible server and list
 * its models. Works for Ollama (/api/tags + /v1/models), LM Studio and
 * OpenAI-compatible servers (/v1/models). Never throws — returns "none"
 * on any failure.
 */
export async function detectAI(baseUrl?: string, timeoutMs = 2500): Promise<LocalAIDetection> {
  const base = (baseUrl ?? loadAIConfig().baseUrl).trim().replace(/\/+$/, "")
  if (!base) return { detected: "none", models: [], baseUrl: "" }

  // The configured base may or may not include the OpenAI-compat "/v1"
  // segment (Ollama defaults to http://localhost:11434/v1, Z.ai to
  // https://api.z.ai/api/v1, LM Studio/OpenAI to .../v1). Try candidate
  // roots so /api/tags and /v1/models resolve regardless.
  const root = base.replace(/\/v1$/, "")
  const roots = [base, root].filter((r, i, a) => r && a.indexOf(r) === i)

  const tryFetch = async (url: string): Promise<ModelInfo[]> => {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      clearTimeout(t)
      if (!res.ok) return []
      const data = await res.json()
      // Ollama: { models: [{ name }] }; OpenAI-compatible: { data: [{ id }] }
      if (Array.isArray(data.models)) {
        return data.models
          .map((m: { name?: string; model?: string }) => ({ id: m.model ?? m.name ?? "", name: m.name ?? m.model ?? "" }))
          .filter((m: ModelInfo) => m.id)
      }
      if (Array.isArray(data.data)) {
        return data.data
          .map((m: { id?: string }) => ({ id: m.id ?? "", name: m.id ?? "" }))
          .filter((m: ModelInfo) => m.id)
      }
      return []
    } catch {
      return []
    }
  }

  // Ollama-first: its native tags endpoint is the most reliable signal.
  for (const r of roots) {
    const ollamaModels = await tryFetch(`${r}/api/tags`)
    if (ollamaModels.length > 0) {
      return { detected: "ollama", models: ollamaModels, baseUrl: base }
    }
  }
  // OpenAI-compatible model listing — try both the bare base and the /v1 root.
  for (const r of [base, `${root}/v1`].filter((v, i, a) => v && a.indexOf(v) === i)) {
    const openaiModels = await tryFetch(`${r}/models`)
    if (openaiModels.length > 0) {
      return { detected: "openai", models: openaiModels, baseUrl: base }
    }
  }
  return { detected: "none", models: [], baseUrl: base }
}

/**
 * Streaming chat over the OpenAI-compatible SSE contract. Calls onToken
 * for each delta; resolves with the full text. Throws on HTTP failure.
 */
export async function streamChat(
  messages: ChatMessage[],
  options: { temperature?: number; model?: string; systemPrompt?: string; onToken?: (token: string) => void; signal?: AbortSignal } = {}
): Promise<string> {
  const cfg = loadAIConfig()
  const privacy = loadPrivacySettings()
  if (cfg.provider === "none") throw new Error("AI is disabled. Enable it in Settings → AI.")
  if (privacy.localOnlyMode && cfg.provider !== "ollama") {
    throw new Error("Local-only mode is enabled: remote AI providers are blocked. Use Ollama or turn off local-only mode in Settings → Privacy.")
  }
  const baseUrl = cfg.baseUrl.trim().replace(/\/+$/, "")
  if (!baseUrl) throw new Error("AI is not configured. Open Settings → AI and set a provider endpoint.")

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (cfg.apiKey.trim()) headers["Authorization"] = `Bearer ${cfg.apiKey.trim()}`

  const body: Record<string, unknown> = {
    model: options.model ?? cfg.model ?? "default",
    temperature: options.temperature ?? cfg.temperature,
    stream: true,
    messages: [
      ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
      ...messages,
    ],
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`AI request failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`)
  }
  if (!res.body) throw new Error("AI stream returned no body.")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ""
  let buffer = ""
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const payload = trimmed.slice(5).trim()
        if (payload === "[DONE]") continue
        try {
          const json = JSON.parse(payload)
          const delta =
            json?.choices?.[0]?.delta?.content ??
            json?.choices?.[0]?.message?.content ??
            json?.choices?.[0]?.text ??
            ""
          if (typeof delta === "string" && delta) {
            full += delta
            options.onToken?.(delta)
          }
        } catch {
          // skip malformed keep-alive / partial lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  return full
}

/**
 * Calls the configured OpenAI-compatible endpoint. Throws an Error
 * with a human-readable message on failure.
 */
export async function chatWithAI(
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<string> {
  const cfg = loadAIConfig()
  const privacy = loadPrivacySettings()
  if (cfg.provider === "none") {
    throw new Error("AI is disabled. Enable it in Settings → AI.")
  }
  if (privacy.localOnlyMode && cfg.provider !== "ollama") {
    throw new Error(
      "Local-only mode is enabled: remote AI providers are blocked. Use Ollama or turn off local-only mode in Settings → Privacy."
    )
  }
  const baseUrl = cfg.baseUrl.trim().replace(/\/+$/, "")
  if (!baseUrl) {
    throw new Error("AI is not configured. Open Settings → AI and set a provider endpoint.")
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (cfg.apiKey.trim()) {
    headers["Authorization"] = `Bearer ${cfg.apiKey.trim()}`
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: cfg.model || "default",
      temperature,
      messages,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`AI request failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`)
  }

  const data = await res.json()
  if (data && Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0]
    const content = choice?.message?.content ?? choice?.text ?? ""
    if (typeof content === "string" && content.trim()) return content
  }
  if (typeof data === "string" && data.trim()) return data
  throw new Error("AI returned an empty response.")
}
