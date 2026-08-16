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

export interface AIConfig {
  provider: "none" | "zai" | "ollama" | "custom"
  model: string
  temperature: number
  baseUrl: string
  apiKey: string
}

const DEFAULTS: AIConfig = {
  provider: "none",
  model: "glm-4.5-flash",
  temperature: 0.7,
  baseUrl: "https://api.z.ai/api/v1",
  apiKey: "",
}

export function loadAIConfig(): AIConfig {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem("openwriter-ai")
    const stored = raw ? JSON.parse(raw) : {}
    return { ...DEFAULTS, ...stored }
  } catch {
    return DEFAULTS
  }
}

export function isAIConfigured(): boolean {
  const cfg = loadAIConfig()
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

/**
 * Calls the configured OpenAI-compatible endpoint. Throws an Error
 * with a human-readable message on failure.
 */
export async function chatWithAI(
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<string> {
  const cfg = loadAIConfig()
  if (cfg.provider === "none") {
    throw new Error("AI is disabled. Enable it in Settings → AI.")
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
