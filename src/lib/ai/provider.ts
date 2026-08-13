export interface AIProvider {
  name: string
  isAvailable: boolean
  chat(
    messages: { role: string; content: string }[],
    options?: AIOptions
  ): Promise<string>
  stream?(
    messages: { role: string; content: string }[],
    options?: AIOptions
  ): AsyncIterable<string>
}

export interface AIOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export type PermissionLevel =
  | "read-only"
  | "suggest"
  | "write-confirm"
  | "full-access"

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  "read-only": "Read Only",
  suggest: "Suggest",
  "write-confirm": "Write with Confirmation",
  "full-access": "Full Access",
}

export const PERMISSION_DESCRIPTIONS: Record<PermissionLevel, string> = {
  "read-only":
    "AI can only read your manuscript and provide observations. No text suggestions.",
  suggest:
    "AI can suggest text changes, but you must apply each one manually.",
  "write-confirm":
    "AI can propose edits and apply them after your confirmation.",
  "full-access":
    "AI can make changes directly. Use with caution.",
}

export interface AgentAction {
  timestamp: string
  action: string
  detail?: string
}

export interface AgentSuggestion {
  id: string
  type: "text" | "outline" | "character" | "continuity" | "synopsis" | "dialogue"
  title: string
  content: string
  contextUsed: string
  applied: boolean
  dismissed: boolean
}
