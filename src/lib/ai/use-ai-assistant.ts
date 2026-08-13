"use client"

import { useState, useCallback, useRef } from "react"
import type { AgentAction, AgentSuggestion, PermissionLevel } from "@/lib/ai/provider"
import { PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from "@/lib/ai/provider"

export type AIProviderType = "zai" | "none"

interface UseAIAssistantReturn {
  providerType: AIProviderType
  setProviderType: (type: AIProviderType) => void
  permission: PermissionLevel
  setPermission: (level: PermissionLevel) => void
  isThinking: boolean
  actions: AgentAction[]
  suggestions: AgentSuggestion[]
  error: string | null
  sendMessage: (message: string, context?: string) => Promise<string>
  executeAction: (action: string, context?: string) => Promise<void>
  applySuggestion: (id: string) => void
  dismissSuggestion: (id: string) => void
  clearActions: () => void
  clearSuggestions: () => void
  setTemperature: (t: number) => void
  temperature: number
  isAvailable: boolean
}

async function chatWithAI(
  messages: { role: string; content: string }[],
  temperature: number = 0.7
): Promise<string> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "chat",
      messages,
      temperature,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `AI request failed (${res.status})`)
  }

  const data = await res.json()
  return data.response || ""
}

export function useAIAssistant(): UseAIAssistantReturn {
  const [providerType, setProviderTypeState] = useState<AIProviderType>("zai")
  const [permission, setPermission] = useState<PermissionLevel>("suggest")
  const [isThinking, setIsThinking] = useState(false)
  const [actions, setActions] = useState<AgentAction[]>([])
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [temperature, setTemperature] = useState(0.7)
  const suggestionIdRef = useRef(0)

  const isAvailable = providerType !== "none"

  const setProviderType = useCallback((type: AIProviderType) => {
    setProviderTypeState(type)
  }, [])

  const addAction = useCallback((action: string, detail?: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    setActions((prev) => [...prev, { timestamp, action, detail }])
  }, [])

  const sendMessage = useCallback(
    async (message: string, context?: string): Promise<string> => {
      if (!isAvailable) {
        setError("AI is unavailable. Enable it in Settings → AI.")
        return ""
      }

      setIsThinking(true)
      setError(null)
      addAction("Processing request")

      try {
        const messages: { role: string; content: string }[] = []

        if (context) {
          messages.push({
            role: "user",
            content: `Here is the current context from my manuscript:\n\n${context}`,
          })
          messages.push({
            role: "assistant",
            content: "I've reviewed the context. How can I help?",
          })
        }

        messages.push({ role: "user", content: message })

        const response = await chatWithAI(messages, temperature)

        addAction("Response received", `${response.slice(0, 50)}...`)
        return response
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setError(msg)
        addAction("Error", msg)
        return ""
      } finally {
        setIsThinking(false)
      }
    },
    [temperature, addAction, isAvailable]
  )

  const executeAction = useCallback(
    async (action: string, context?: string) => {
      if (!isAvailable) {
        setError("AI is unavailable. Enable it in Settings → AI.")
        return
      }

      addAction(action)
      setIsThinking(true)
      setError(null)

      try {
        const messages: { role: string; content: string }[] = []
        if (context) {
          messages.push({
            role: "user",
            content: `Context:\n${context}`,
          })
        }
        messages.push({ role: "user", content: action })

        const response = await chatWithAI(messages, temperature)

        if (response) {
          const id = `suggestion-${++suggestionIdRef.current}`
          const newSuggestion: AgentSuggestion = {
            id,
            type: "text",
            title: action,
            content: response,
            contextUsed: context || "No additional context",
            applied: false,
            dismissed: false,
          }
          setSuggestions((prev) => [...prev, newSuggestion])
          addAction("Suggestion generated", action)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setError(msg)
        addAction("Error", msg)
      } finally {
        setIsThinking(false)
      }
    },
    [temperature, addAction, isAvailable]
  )

  const applySuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, applied: true } : s))
    )
  }, [])

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s))
    )
  }, [])

  const clearActions = useCallback(() => setActions([]), [])
  const clearSuggestions = useCallback(() => setSuggestions([]), [])

  return {
    providerType,
    setProviderType,
    permission,
    setPermission,
    isThinking,
    actions,
    suggestions,
    error,
    sendMessage,
    executeAction,
    applySuggestion,
    dismissSuggestion,
    clearActions,
    clearSuggestions,
    setTemperature,
    temperature,
    isAvailable,
  }
}
