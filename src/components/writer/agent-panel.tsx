"use client"

import { useState, useRef, useEffect } from "react"
import { useWriterStore } from "@/store/writer-store"
import { useAIAssistant } from "@/lib/ai/use-ai-assistant"
import { loadAISettings, loadPrivacySettings } from "@/lib/settings"
import { stripHtml } from "@/lib/local-api/services"
import { AgentTaskView } from "./agent-task-view"
import { PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from "@/lib/ai/provider"
import type { PermissionLevel } from "@/lib/ai/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Bot,
  Send,
  PenLine,
  RefreshCw,
  Users,
  GitBranch,
  FileText,
  MessageSquare,
  Shield,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Play,
} from "lucide-react"

const QUICK_ACTIONS = [
  {
    id: "continue",
    label: "Continue Writing",
    icon: PenLine,
    prompt: "Continue the story from where it left off, maintaining the same voice and style.",
    color: "text-emerald-600",
  },
  {
    id: "rewrite",
    label: "Rewrite Selection",
    icon: RefreshCw,
    prompt: "Rewrite this passage to improve clarity, flow, and impact while preserving the meaning.",
    color: "text-amber-600",
  },
  {
    id: "analyze",
    label: "Analyze Character",
    icon: Users,
    prompt: "Analyze this character's arc, motivations, and development throughout the story.",
    color: "text-violet-600",
  },
  {
    id: "continuity",
    label: "Check Continuity",
    icon: GitBranch,
    prompt: "Check for continuity issues, plot holes, or contradictions in the story so far.",
    color: "text-rose-600",
  },
  {
    id: "synopsis",
    label: "Generate Synopsis",
    icon: FileText,
    prompt: "Generate a concise synopsis of the current chapter or scene.",
    color: "text-teal-600",
  },
  {
    id: "dialogue",
    label: "Suggest Dialogue",
    icon: MessageSquare,
    prompt: "Suggest dialogue for this scene that fits the characters and situation.",
    color: "text-orange-600",
  },
]

const PROVIDER_NAMES: Record<string, string> = {
  zai: "Z.ai",
  none: "None",
  ollama: "Ollama (Local)",
  custom: "Custom",
}

function formatTiny(kind: string, data: Record<string, unknown>): string {
  switch (kind) {
    case "proofread": {
      const issues = (data.issues as Array<{ message: string; suggestion?: string }>) ?? []
      if (issues.length === 0) return "No deterministic proofreading issues found."
      return `${issues.length} issue${issues.length === 1 ? "" : "s"}:\n` + issues.map((i) => `- ${i.message}${i.suggestion ? ` → ${i.suggestion}` : ""}`).join("\n")
    }
    case "tags": {
      const tags = (data.tags as string[]) ?? []
      const meta = (data.metadata as { wordCount?: number; sentenceCount?: number; dialogueLines?: number }) ?? {}
      return [
        `Word count: ${meta.wordCount ?? 0} · Sentences: ${meta.sentenceCount ?? 0} · Dialogue lines: ${meta.dialogueLines ?? 0}`,
        `Suggested tags: ${tags.length ? tags.join(", ") : "none"}`,
      ].join("\n")
    }
    case "classify": {
      const scenes = (data.scenes as Array<{ title: string; category: string; confidence: number }>) ?? []
      return scenes.length === 0
        ? "No scenes to classify."
        : scenes.map((s) => `- ${s.title}: ${s.category} (${Math.round(s.confidence * 100)}%)`).join("\n")
    }
    case "continuity": {
      const issues = (data.issues as Array<{ problem: string; confidence: number; evidence: string; source: string }>) ?? []
      return issues.length === 0
        ? "No continuity issues found by deterministic rules."
        : issues.map((i) => `- [${Math.round(i.confidence * 100)}%] ${i.problem} — ${i.evidence} (${i.source})`).join("\n")
    }
    case "summary":
      return (data.summary as string) || "No summary produced."
    case "duplicates": {
      const chars = (data.characterDuplicates as Array<{ a: string; b: string; similarity: number }>) ?? []
      const locs = (data.locationDuplicates as Array<{ a: string; b: string; similarity: number }>) ?? []
      const fmt = (items: Array<{ a: string; b: string; similarity: number }>) =>
        items.length === 0
          ? "none"
          : items.map((p) => `- ${p.a} ≈ ${p.b} (${Math.round(p.similarity * 100)}%)`).join("\n")
      return `Characters:\n${fmt(chars)}\n\nLocations:\n${fmt(locs)}`
    }
    default:
      return JSON.stringify(data, null, 2)
  }
}

const TINY_TOOLS = [
  { kind: "proofread", label: "Proofread", icon: FileText },
  { kind: "tags", label: "Tags & metadata", icon: Sparkles },
  { kind: "classify", label: "Classify scenes", icon: Bot },
  { kind: "continuity", label: "Continuity", icon: GitBranch },
  { kind: "summary", label: "Summarize", icon: FileText },
  { kind: "duplicates", label: "Duplicates", icon: Users },
] as const

export function AgentPanel() {
  const [input, setInput] = useState("")
  const [showActions, setShowActions] = useState(true)
  const [contextInfo, setContextInfo] = useState("")
  const [taskGoal, setTaskGoal] = useState("")
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskBusy, setTaskBusy] = useState(false)
  const [tinyBusy, setTinyBusy] = useState<string | null>(null)
  const [tinyResults, setTinyResults] = useState<Array<{ kind: string; label: string; content: string }>>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { currentProjectId, currentProjectName, currentSceneId, currentChapterId } =
    useWriterStore()

  const {
    isAvailable,
    isThinking,
    actions,
    suggestions,
    error,
    permission,
    setPermission,
    sendMessage,
    executeAction,
    applySuggestion,
    dismissSuggestion,
    providerType,
  } = useAIAssistant()

  const activeSuggestions = suggestions.filter(
    (s) => !s.applied && !s.dismissed
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [actions, suggestions])

  // Builds context according to the AI context-scope setting. Only the
  // requested scope is ever included in the prompt.
  const getContextString = async (): Promise<string> => {
    const aiSettings = loadAISettings()
    const scope = aiSettings.contextScope
    const parts: string[] = []
    if (currentProjectName) parts.push(`Project: ${currentProjectName}`)
    try {
      if (scope === "custom") {
        const custom = aiSettings.customContext?.trim()
        if (custom) parts.push(`Custom context:\n${custom.slice(0, 4000)}`)
      } else if (scope === "current-scene" && currentSceneId) {
        const res = await fetch(`/api/scenes/${currentSceneId}`)
        if (res.ok) {
          const sc = await res.json()
          parts.push(`Scene \"${sc.title}\":\n${stripHtml(sc.content ?? "").slice(0, 4000)}`)
        }
      } else if (scope === "current-chapter" && currentChapterId) {
        const res = await fetch(`/api/chapters/${currentChapterId}`)
        if (res.ok) {
          const ch = await res.json()
          const scenes = (ch.scenes ?? [])
            .map((s: { title: string; content?: string }) => `## ${s.title}\n${stripHtml(s.content ?? "").slice(0, 1500)}`)
            .join("\n\n")
          parts.push(`Chapter \"${ch.title}\":\n${scenes.slice(0, 8000)}`)
        }
      } else if (scope === "project-summary" && currentProjectId) {
        const [chRes, castRes, locRes] = await Promise.all([
          fetch(`/api/chapters?projectId=${currentProjectId}`),
          fetch(`/api/characters?projectId=${currentProjectId}`),
          fetch(`/api/locations?projectId=${currentProjectId}`),
        ])
        const chapters = chRes.ok ? await chRes.json() : []
        const cast = castRes.ok ? await castRes.json() : []
        const locs = locRes.ok ? await locRes.json() : []
        const sceneCount = (chapters as { scenes?: unknown[] }[]).reduce((n, c) => n + (c.scenes?.length ?? 0), 0)
        parts.push(
          `Project summary: ${(chapters as { title: string }[]).length} chapters, ${sceneCount} scenes, ${(cast as { name: string }[]).length} characters, ${(locs as { name: string }[]).length} locations.`
        )
        parts.push(`Cast: ${(cast as { name: string }[]).map((c) => c.name).join(", ") || "none"}`)
        parts.push(`Locations: ${(locs as { name: string }[]).map((l) => l.name).join(", ") || "none"}`)
      } else if (scope === "related-entities" && currentSceneId && currentProjectId) {
        const [sceneRes, castRes, locRes] = await Promise.all([
          fetch(`/api/scenes/${currentSceneId}`),
          fetch(`/api/characters?projectId=${currentProjectId}`),
          fetch(`/api/locations?projectId=${currentProjectId}`),
        ])
        const sc = sceneRes.ok ? await sceneRes.json() : null
        const cast = castRes.ok ? await castRes.json() : []
        const locs = locRes.ok ? await locRes.json() : []
        if (sc) {
          const text = stripHtml(sc.content ?? "")
          const lower = text.toLowerCase()
          const mentioned = (list: { name: string }[]) =>
            list.filter((e) => e.name && lower.includes(e.name.toLowerCase())).map((e) => e.name)
          const chars = mentioned(cast as { name: string }[])
          const places = mentioned(locs as { name: string }[])
          parts.push(`Scene \"${sc.title}\":\n${text.slice(0, 3000)}`)
          parts.push(
            `Entities mentioned in this scene: characters [${chars.join(", ") || "none"}], locations [${places.join(", ") || "none"}]`
          )
        }
      } else if (scope === "timeline" && currentProjectId) {
        const res = await fetch(`/api/timeline?projectId=${currentProjectId}`)
        if (res.ok) {
          const events = await res.json()
          const lines = (events as { title: string; date?: string; description?: string }[])
            .slice(0, 20)
            .map((e) => `- ${e.date ? `[${e.date}] ` : ""}${e.title}${e.description ? ` — ${e.description.slice(0, 120)}` : ""}`)
          if (lines.length) parts.push(`Timeline:\n${lines.join("\n")}`)
        }
      } else if (scope === "full-project" && currentProjectId) {
        const res = await fetch(`/api/chapters?projectId=${currentProjectId}`)
        if (res.ok) {
          const chapters = await res.json()
          const text = (chapters as { title: string; scenes?: { title: string; content?: string }[] }[])
            .map((c) => `# ${c.title}\n` + (c.scenes ?? []).map((s) => `## ${s.title}\n${stripHtml(s.content ?? "").slice(0, 500)}`).join("\n"))
            .join("\n\n")
          parts.push(text.slice(0, 12000))
        }
      }
    } catch {
      // context is best-effort; never block the AI call on it
    }
    return parts.join("\n\n") || "No context available"
  }

  const handleSend = async () => {
    if (!input.trim() || isThinking) return
    const context = await getContextString()
    setContextInfo(context)

    await sendMessage(input.trim(), context)
    setInput("")
  }

  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {
    if (isThinking) return
    const context = await getContextString()
    setContextInfo(`Using: ${context}`)
    await executeAction(action.prompt, context)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRunTask = async () => {
    if (!taskGoal.trim() || !currentProjectId || taskBusy) return
    setTaskBusy(true)
    setTaskId(null)
    setLocalError(null)
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run",
          projectId: currentProjectId,
          goal: taskGoal.trim(),
          permission,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Could not start the agent task.")
      }
      const task = await res.json()
      setTaskId(task.id)
      setTaskGoal("")
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not start the agent task.")
    } finally {
      setTaskBusy(false)
    }
  }

  const handleTiny = async (kind: string, label: string) => {
    if (!currentProjectId || tinyBusy) return
    setTinyBusy(kind)
    setLocalError(null)
    try {
      const res = await fetch("/api/ai/tiny/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, kind }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Analysis failed.")
      }
      const data = await res.json()
      setTinyResults((prev) => [{ kind, label, content: formatTiny(kind, data) }, ...prev].slice(0, 5))
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Analysis failed.")
    } finally {
      setTinyBusy(null)
    }
  }

  const providerName = PROVIDER_NAMES[providerType] || providerType
  const showTransmissionInfo = loadPrivacySettings().showDataTransmission

  // Poll the running task until it reaches a terminal state.
  useEffect(() => {
    if (!taskId) return
    let stopped = false
    let attempts = 0
    const timer = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/agent-tasks/${taskId}`)
        if (res.ok) {
          const t = await res.json()
          if (t?.status === "completed" || t?.status === "failed" || t?.status === "cancelled") {
            stopped = true
            clearInterval(timer)
          }
        }
      } catch {
        // keep polling
      }
      if (attempts > 40) {
        stopped = true
        clearInterval(timer)
      }
    }, 1200)
    return () => {
      clearInterval(timer)
      void stopped
    }
  }, [taskId])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-emerald-600" />
          <span className="text-sm font-medium">Writing Assistant</span>
          {isAvailable ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {providerName}
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Offline
            </Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as PermissionLevel)}
              >
                <SelectTrigger className="h-6 w-auto gap-1 border-none bg-muted px-2 text-[10px]">
                  <Shield className="size-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {(
                    Object.keys(PERMISSION_LABELS) as PermissionLevel[]
                  ).map((level) => (
                    <SelectItem key={level} value={level} className="text-xs">
                      {PERMISSION_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px] text-xs">
              {PERMISSION_DESCRIPTIONS[permission]}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Permission description bar */}
      <div className="border-b bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        {PERMISSION_DESCRIPTIONS[permission]}
      </div>

      {/* Main scrollable content */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-3 space-y-3">
          {/* Quick Actions */}
          <div>
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <Sparkles className="size-3" />
              Quick Actions
              {showActions ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
            {showActions && (
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 px-2 justify-start text-[11px] gap-1.5"
                    onClick={() => handleQuickAction(action)}
                    disabled={isThinking || !isAvailable}
                  >
                    <action.icon className={`size-3 ${action.color}`} />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Agent tasks (deterministic executor + optional LLM compose) */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Bot className="size-3" />
              Agent Tasks
            </div>
            <p className="text-[10px] text-muted-foreground">
              Runs a goal through deterministic tools — search, stats,
              continuity, health — with a plan, action log and report.
              Works with or without an AI model.
            </p>
            <div className="flex gap-1.5">
              <Input
                value={taskGoal}
                onChange={(e) => setTaskGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRunTask()}
                placeholder="e.g. Check continuity and summarize the arc"
                className="text-xs h-8"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 gap-1 text-[11px]"
                onClick={handleRunTask}
                disabled={!taskGoal.trim() || taskBusy || !currentProjectId}
              >
                {taskBusy ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                Run
              </Button>
            </div>
            {taskId && (
              <div className="rounded-lg border border-writer-border bg-muted/10">
                <AgentTaskView taskId={taskId} />
              </div>
            )}
          </div>

          <Separator />

          {/* Tiny AI — deterministic, model-free */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3" />
              Tiny AI — no model needed
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {TINY_TOOLS.map((t) => (
                <Button
                  key={t.kind}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 px-1 justify-center text-[10px] gap-1 flex-col"
                  onClick={() => handleTiny(t.kind, t.label)}
                  disabled={!!tinyBusy || !currentProjectId}
                >
                  {tinyBusy === t.kind ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <t.icon className="size-3 text-amber-600" />
                  )}
                  {t.label}
                </Button>
              ))}
            </div>
            {tinyResults.length > 0 && (
              <div className="space-y-2">
                {tinyResults.map((r, i) => (
                  <div key={`${r.kind}-${i}`} className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">{r.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-[10px] text-muted-foreground"
                        onClick={() => setTinyResults((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                    <pre className="text-[10px] whitespace-pre-wrap leading-relaxed text-foreground/80 max-h-48 overflow-y-auto font-sans">
                      {r.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* AI Suggestions */}
          {activeSuggestions.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3" />
                AI Suggestions
              </div>
              {activeSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-lg border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium">
                      {suggestion.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 shrink-0"
                    >
                      AI
                    </Badge>
                  </div>
                  <div className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {suggestion.content}
                  </div>
                  {showTransmissionInfo && contextInfo && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Info className="size-3" />
                      {contextInfo}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => applySuggestion(suggestion.id)}
                    >
                      <Check className="size-3" />
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => dismissSuggestion(suggestion.id)}
                    >
                      <X className="size-3" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Applied suggestions */}
          {suggestions.filter((s) => s.applied).length > 0 && (
            <div className="space-y-1">
              <Separator />
              <div className="text-[10px] text-muted-foreground">
                Applied ({suggestions.filter((s) => s.applied).length})
              </div>
            </div>
          )}

          {/* Action Log */}
          {actions.length > 0 && (
            <div className="space-y-1">
              <Separator />
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Activity
              </div>
              {actions.slice(-20).map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[11px] text-muted-foreground"
                >
                  <span className="shrink-0 font-mono text-[10px]">
                    {action.timestamp}
                  </span>
                  <span className="truncate">{action.action}</span>
                  {action.detail && (
                    <span className="truncate text-[10px] opacity-60">
                      — {action.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {(error || localError) && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
              <span>{error || localError}</span>
            </div>
          )}

          {/* Empty state */}
          {actions.length === 0 && activeSuggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bot className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {isAvailable
                  ? "Ask me to help with your writing, or use a quick action above."
                  : "AI is not configured. Go to Settings → AI to set up a provider."}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Context indicator */}
      {contextInfo && (
        <div className="border-t bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
          <Info className="size-3" />
          <span className="truncate">{contextInfo}</span>
        </div>
      )}

      {/* Privacy info when using remote AI */}
      {(providerType === "zai" || providerType === "custom") && isAvailable && (
        <div className="border-t bg-amber-50 dark:bg-amber-950/20 px-3 py-1 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <Shield className="size-3" />
          Data sent to {providerType === "zai" ? "Z.ai" : "your custom AI endpoint"} for processing
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-2">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAvailable
                ? "Ask the writing assistant..."
                : "AI unavailable"
            }
            disabled={isThinking || !isAvailable}
            className="text-xs h-8"
          />
          <Button
            size="sm"
            variant="default"
            className="h-8 w-8 p-0 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isThinking || !isAvailable}
          >
            {isThinking ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
