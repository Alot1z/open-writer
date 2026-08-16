import fs from "node:fs"

const CR = "\r\n"

function patch(path, pairs) {
  let src = fs.readFileSync(path, "utf8")
  const crlf = src.includes(CR)
  const norm = (s) => (crlf ? s.split("\n").join(CR) : s)
  let miss = 0
  for (const [oldS, newS] of pairs) {
    const oldN = norm(oldS)
    if (!src.includes(oldN)) {
      console.log(`MISS ${path}: ${JSON.stringify(oldN.slice(0, 80))}`)
      miss++
      continue
    }
    src = src.split(oldN).join(norm(newS))
  }
  fs.writeFileSync(path, src)
  console.log(`patched ${path}${miss ? ` (${miss} misses)` : ""}`)
}

// 1) services.ts: scene status from body + version retention pruning
patch("src/lib/local-api/services.ts", [
  [
    "import * as db from \"./storage\"\nimport type {",
    "import * as db from \"./storage\"\nimport { loadWritingSettings } from \"@/lib/settings\"\nimport type {",
  ],
  [
    '    status: "draft",\n    povCharacterId: "",\n    locationId: "",\n    timeOfDay: "",\n    notes: "",\n    wordCount: 0,\n    metadata: "{}",\n    createdAt: t,\n    updatedAt: t,\n  }\n  await db.putRecord("scenes", scene)\n  return scene\n}',
    '    status: typeof body.status === "string" ? body.status : "draft",\n    povCharacterId: "",\n    locationId: "",\n    timeOfDay: "",\n    notes: "",\n    wordCount: 0,\n    metadata: "{}",\n    createdAt: t,\n    updatedAt: t,\n  }\n  await db.putRecord("scenes", scene)\n  return scene\n}',
  ],
  [
    "export async function createVersion(body: Record<string, unknown>): Promise<ManuscriptVersion> {\n  const projectId = String(body.projectId ?? \"\")\n  if (!projectId) throw new ApiError(\"projectId is required\", 400)\n  const content = String(body.content ?? \"\")\n  const version: ManuscriptVersion = {\n    id: newId(),\n    projectId,\n    sceneId: body.sceneId ? String(body.sceneId) : null,\n    content,\n    wordCount: content ? countWords(content) : 0,\n    label: String(body.label ?? \"\"),\n    isMilestone: Boolean(body.isMilestone ?? false),\n    isAutosave: Boolean(body.isAutosave ?? true),\n    snapshot: String(body.snapshot ?? \"{}\"),\n    createdAt: now(),\n  }\n  await db.putRecord(\"versions\", version)\n  return version\n}",
    "export async function createVersion(body: Record<string, unknown>): Promise<ManuscriptVersion> {\n  const projectId = String(body.projectId ?? \"\")\n  if (!projectId) throw new ApiError(\"projectId is required\", 400)\n  const content = String(body.content ?? \"\")\n  const version: ManuscriptVersion = {\n    id: newId(),\n    projectId,\n    sceneId: body.sceneId ? String(body.sceneId) : null,\n    content,\n    wordCount: content ? countWords(content) : 0,\n    label: String(body.label ?? \"\"),\n    isMilestone: Boolean(body.isMilestone ?? false),\n    isAutosave: Boolean(body.isAutosave ?? true),\n    snapshot: String(body.snapshot ?? \"{}\"),\n    createdAt: now(),\n  }\n  await db.putRecord(\"versions\", version)\n  // Enforce the version retention setting from Writing settings\n  await pruneOldVersions(projectId)\n  return version\n}\n\n/**\n * Deletes autosave versions older than the configured retention period\n * (milestones are always kept).\n */\nexport async function pruneOldVersions(projectId: string, retentionDays?: number): Promise<void> {\n  const retention = retentionDays ?? loadWritingSettings().versionHistoryRetention\n  if (retention <= 0) return\n  const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000\n  const versions = await db.getAll<ManuscriptVersion>(\"versions\")\n  const keep = versions.filter(\n    (v) => v.projectId !== projectId || !v.isAutosave || v.isMilestone || new Date(v.createdAt).getTime() >= cutoff\n  )\n  if (keep.length !== versions.length) {\n    await db.bulkPut(\"versions\", keep)\n  }\n}",
  ],
])

// 2) use-ai-assistant: initial provider/permission/temperature from settings
patch("src/lib/ai/use-ai-assistant.ts", [
  [
    "import { PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from \"@/lib/ai/provider\"",
    "import { PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from \"@/lib/ai/provider\"\nimport { loadAISettings, loadPrivacySettings } from \"@/lib/settings\"",
  ],
  [
    "  const [providerType, setProviderTypeState] = useState<AIProviderType>(\"zai\")\n  const [permission, setPermission] = useState<PermissionLevel>(\"suggest\")\n  const [isThinking, setIsThinking] = useState(false)\n  const [actions, setActions] = useState<AgentAction[]>([])\n  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([])\n  const [error, setError] = useState<string | null>(null)\n  const [temperature, setTemperature] = useState(0.7)",
    "  const initialAI = loadAISettings()\n  const initialPrivacy = loadPrivacySettings()\n  // Privacy → local-only mode forces the AI off entirely\n  const aiBlocked = initialPrivacy.localOnlyMode && initialAI.provider !== \"none\" && initialAI.provider !== \"ollama\"\n  const [providerType, setProviderTypeState] = useState<AIProviderType>(() =>\n    aiBlocked || initialAI.provider === \"none\" ? \"none\" : \"zai\"\n  )\n  const [permission, setPermission] = useState<PermissionLevel>(() =>\n    (initialAI.permissionLevel as PermissionLevel) || \"suggest\"\n  )\n  const [isThinking, setIsThinking] = useState(false)\n  const [actions, setActions] = useState<AgentAction[]>([])\n  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([])\n  const [error, setError] = useState<string | null>(null)\n  const [temperature, setTemperature] = useState(initialAI.temperature)",
  ],
])

// 3) ai.ts: source config from settings.ts + local-only enforcement
patch("src/lib/local-api/ai.ts", [
  [
    "export interface AIConfig {\n  provider: \"none\" | \"zai\" | \"ollama\" | \"custom\"\n  model: string\n  temperature: number\n  baseUrl: string\n  apiKey: string\n}\n\nconst DEFAULTS: AIConfig = {\n  provider: \"none\",\n  model: \"glm-4.5-flash\",\n  temperature: 0.7,\n  baseUrl: \"https://api.z.ai/api/v1\",\n  apiKey: \"\",\n}\n\nexport function loadAIConfig(): AIConfig {\n  if (typeof window === \"undefined\") return DEFAULTS\n  try {\n    const raw = localStorage.getItem(\"openwriter-ai\")\n    const stored = raw ? JSON.parse(raw) : {}\n    return { ...DEFAULTS, ...stored }\n  } catch {\n    return DEFAULTS\n  }\n}",
    "import { loadAISettings, loadPrivacySettings } from \"@/lib/settings\"\n\nexport interface AIConfig {\n  provider: \"none\" | \"zai\" | \"ollama\" | \"custom\"\n  model: string\n  temperature: number\n  baseUrl: string\n  apiKey: string\n}\n\nexport function loadAIConfig(): AIConfig {\n  const ai = loadAISettings()\n  return {\n    provider: ai.provider,\n    model: ai.model || \"default\",\n    temperature: ai.temperature,\n    baseUrl: ai.baseUrl,\n    apiKey: ai.apiKey,\n  }\n}",
  ],
  [
    "export function isAIConfigured(): boolean {\n  const cfg = loadAIConfig()\n  return cfg.provider !== \"none\" && cfg.baseUrl.trim() !== \"\"\n}",
    "export function isAIConfigured(): boolean {\n  const cfg = loadAIConfig()\n  const privacy = loadPrivacySettings()\n  if (privacy.localOnlyMode && cfg.provider !== \"none\" && cfg.provider !== \"ollama\") return false\n  return cfg.provider !== \"none\" && cfg.baseUrl.trim() !== \"\"\n}",
  ],
  [
    "  const cfg = loadAIConfig()\n  if (cfg.provider === \"none\") {\n    throw new Error(\"AI is disabled. Enable it in Settings → AI.\")\n  }\n  const baseUrl = cfg.baseUrl.trim().replace(/\\/+$/, \"\")\n  if (!baseUrl) {\n    throw new Error(\"AI is not configured. Open Settings → AI and set a provider endpoint.\")\n  }",
    "  const cfg = loadAIConfig()\n  const privacy = loadPrivacySettings()\n  if (cfg.provider === \"none\") {\n    throw new Error(\"AI is disabled. Enable it in Settings → AI.\")\n  }\n  if (privacy.localOnlyMode && cfg.provider !== \"ollama\") {\n    throw new Error(\n      \"Local-only mode is enabled: remote AI providers are blocked. Use Ollama or turn off local-only mode in Settings → Privacy.\"\n    )\n  }\n  const baseUrl = cfg.baseUrl.trim().replace(/\\/+$/, \"\")\n  if (!baseUrl) {\n    throw new Error(\"AI is not configured. Open Settings → AI and set a provider endpoint.\")\n  }",
  ],
])

// 4) agent-panel: context scope + privacy gating for transmission info
patch("src/components/writer/agent-panel.tsx", [
  [
    "import { useAIAssistant } from \"@/lib/ai/use-ai-assistant\"",
    "import { useAIAssistant } from \"@/lib/ai/use-ai-assistant\"\nimport { loadAISettings, loadPrivacySettings } from \"@/lib/settings\"\nimport { stripHtml } from \"@/lib/local-api/services\"",
  ],
  [
    "  const { currentProjectId, currentProjectName, currentSceneId } =\n    useWriterStore()",
    "  const { currentProjectId, currentProjectName, currentSceneId, currentChapterId } =\n    useWriterStore()",
  ],
  [
    "  const getContextString = (): string => {\n    const parts: string[] = []\n    if (currentProjectName) parts.push(`Project: ${currentProjectName}`)\n    if (currentSceneId) parts.push(`Current scene active`)\n    return parts.join(\", \") || \"No context available\"\n  }",
    "  // Builds context according to the AI context-scope setting. Only the\n  // requested scope is ever included in the prompt.\n  const getContextString = async (): Promise<string> => {\n    const scope = loadAISettings().contextScope\n    const parts: string[] = []\n    if (currentProjectName) parts.push(`Project: ${currentProjectName}`)\n    try {\n      if (scope === \"current-scene\" && currentSceneId) {\n        const res = await fetch(`/api/scenes/${currentSceneId}`)\n        if (res.ok) {\n          const sc = await res.json()\n          parts.push(`Scene \\\"${sc.title}\\\":\\n${stripHtml(sc.content ?? \"\").slice(0, 4000)}`)\n        }\n      } else if (scope === \"current-chapter\" && currentChapterId) {\n        const res = await fetch(`/api/chapters/${currentChapterId}`)\n        if (res.ok) {\n          const ch = await res.json()\n          const scenes = (ch.scenes ?? [])\n            .map((s: { title: string; content?: string }) => `## ${s.title}\\n${stripHtml(s.content ?? \"\").slice(0, 1500)}`)\n            .join(\"\\n\\n\")\n          parts.push(`Chapter \\\"${ch.title}\\\":\\n${scenes.slice(0, 8000)}`)\n        }\n      } else if (scope === \"full-project\" && currentProjectId) {\n        const res = await fetch(`/api/chapters?projectId=${currentProjectId}`)\n        if (res.ok) {\n          const chapters = await res.json()\n          const text = (chapters as { title: string; scenes?: { title: string; content?: string }[] }[])\n            .map((c) => `# ${c.title}\\n` + (c.scenes ?? []).map((s) => `## ${s.title}\\n${stripHtml(s.content ?? \"\").slice(0, 500)}`).join(\"\\n\"))\n            .join(\"\\n\\n\")\n          parts.push(text.slice(0, 12000))\n        }\n      }\n    } catch {\n      // context is best-effort; never block the AI call on it\n    }\n    return parts.join(\"\\n\\n\") || \"No context available\"\n  }",
  ],
  [
    "  const handleSend = async () => {\n    if (!input.trim() || isThinking) return\n    const context = getContextString()\n    setContextInfo(context)\n\n    await sendMessage(input.trim(), context)\n    setInput(\"\")\n  }",
    "  const handleSend = async () => {\n    if (!input.trim() || isThinking) return\n    const context = await getContextString()\n    setContextInfo(context)\n\n    await sendMessage(input.trim(), context)\n    setInput(\"\")\n  }",
  ],
  [
    "  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {\n    if (isThinking) return\n    const context = getContextString()\n    setContextInfo(`Using: ${context}`)\n    await executeAction(action.prompt, context)\n  }",
    "  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {\n    if (isThinking) return\n    const context = await getContextString()\n    setContextInfo(`Using: ${context}`)\n    await executeAction(action.prompt, context)\n  }",
  ],
  [
    "  const providerName = PROVIDER_NAMES[providerType] || providerType",
    "  const providerName = PROVIDER_NAMES[providerType] || providerType\n  const showTransmissionInfo = loadPrivacySettings().showDataTransmission",
  ],
  [
    "                  {contextInfo && (\n                    <div className=\"flex items-center gap-1 text-[10px] text-muted-foreground\">\n                      <Info className=\"size-3\" />\n                      {contextInfo}\n                    </div>\n                  )}",
    "                  {showTransmissionInfo && contextInfo && (\n                    <div className=\"flex items-center gap-1 text-[10px] text-muted-foreground\">\n                      <Info className=\"size-3\" />\n                      {contextInfo}\n                    </div>\n                  )}",
  ],
])

// 5) page.tsx: focus-mode-defaults on startup
patch("src/app/page.tsx", [
  [
    "  // Initialize automatic writing session tracking\n  useWritingSession()",
    "  // Initialize automatic writing session tracking\n  useWritingSession()\n\n  // Apply the appearance setting: start in focus mode if configured\n  useEffect(() => {\n    if (loadAppearanceSettings().focusModeDefaults) {\n      setFocusMode(true)\n    }\n  }, [setFocusMode])",
  ],
])
{
  const p = "src/app/page.tsx"
  let src = fs.readFileSync(p, "utf8")
  if (!src.includes("loadAppearanceSettings")) {
    const crlf = src.includes(CR)
    const sep = crlf ? CR + CR : "\n\n"
    src = src.replace("import { useWritingSession } from \"@/hooks/use-writing-session\"", "import { useWritingSession } from \"@/hooks/use-writing-session\"" + sep + "import { loadAppearanceSettings } from \"@/lib/settings\"")
    fs.writeFileSync(p, src)
    console.log("page.tsx import added")
  }
}

console.log("round 2 patches done")
