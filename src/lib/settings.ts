/**
 * Single source of truth for Open Writer settings.
 *
 * Settings are persisted in localStorage under `openwriter-*` keys
 * (same keys the Settings dialog has always used). Runtime components
 * read them through these typed loaders and can subscribe to changes
 * so edits take effect immediately, not only after a reload.
 */

export interface EditorSettings {
  fontFamily: "serif" | "sans" | "mono"
  fontSize: number
  lineHeight: number
  maxWidth: number
  paragraphSpacing: number
}

export interface WritingSettings {
  defaultSceneStatus: string
  autosaveInterval: number // seconds
  versionHistoryRetention: number // days
}

export interface GoalSettings {
  dailyWordGoal: number
  projectDeadline: string
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "system"
  accentColor: string
  focusModeDefaults: boolean
}

export interface AISettings {
  provider: "none" | "zai" | "ollama" | "custom"
  model: string
  temperature: number
  baseUrl: string
  apiKey: string
  contextScope: string
  permissionLevel: string
}

export interface PrivacySettings {
  showDataTransmission: boolean
  localOnlyMode: boolean
}

export const DEFAULT_EDITOR: EditorSettings = {
  fontFamily: "serif",
  fontSize: 16,
  lineHeight: 1.8,
  maxWidth: 700,
  paragraphSpacing: 0.75,
}

export const DEFAULT_WRITING: WritingSettings = {
  defaultSceneStatus: "draft",
  autosaveInterval: 30,
  versionHistoryRetention: 90,
}

export const DEFAULT_GOALS: GoalSettings = {
  dailyWordGoal: 1000,
  projectDeadline: "",
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "system",
  accentColor: "amber",
  focusModeDefaults: false,
}

export const DEFAULT_AI: AISettings = {
  provider: "none",
  model: "default",
  temperature: 0.7,
  baseUrl: "",
  apiKey: "",
  contextScope: "current-scene",
  permissionLevel: "suggest",
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  showDataTransmission: true,
  localOnlyMode: false,
}

const SETTING_KEYS = {
  editor: "openwriter-editor",
  writing: "openwriter-writing",
  goals: "openwriter-goals",
  appearance: "openwriter-appearance",
  ai: "openwriter-ai",
  privacy: "openwriter-privacy",
} as const

function load<T>(key: keyof typeof SETTING_KEYS, defaults: T): T {
  if (typeof window === "undefined") return defaults
  try {
    const stored = localStorage.getItem(SETTING_KEYS[key])
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults
  } catch {
    return defaults
  }
}

export function loadEditorSettings(): EditorSettings {
  return load("editor", DEFAULT_EDITOR)
}

export function loadWritingSettings(): WritingSettings {
  return load("writing", DEFAULT_WRITING)
}

export function loadGoalSettings(): GoalSettings {
  return load("goals", DEFAULT_GOALS)
}

export function loadAppearanceSettings(): AppearanceSettings {
  return load("appearance", DEFAULT_APPEARANCE)
}

export function loadAISettings(): AISettings {
  return load("ai", DEFAULT_AI)
}

export function loadPrivacySettings(): PrivacySettings {
  return load("privacy", DEFAULT_PRIVACY)
}

const SETTINGS_CHANGED_EVENT = "ow-settings-changed"

/**
 * Called by the Settings dialog after saving. Runtime components that
 * subscribe re-read their settings immediately.
 */
export function notifySettingsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))
  }
}

/** Subscribe to settings changes. Returns an unsubscribe function. */
export function subscribeSettings(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(SETTINGS_CHANGED_EVENT, cb)
  return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, cb)
}

/** Font stacks used by the editor and settings preview. */
export const FONT_MAP: Record<EditorSettings["fontFamily"], string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, sans-serif",
  mono: "'Courier New', monospace",
}
