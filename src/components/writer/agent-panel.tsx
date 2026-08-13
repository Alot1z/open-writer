"use client"

import { useState, useRef, useEffect } from "react"
import { useWriterStore } from "@/store/writer-store"
import { useAIAssistant } from "@/lib/ai/use-ai-assistant"
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
}

export function AgentPanel() {
  const [input, setInput] = useState("")
  const [showActions, setShowActions] = useState(true)
  const [contextInfo, setContextInfo] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { currentProjectId, currentProjectName, currentSceneId } =
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

  const getContextString = (): string => {
    const parts: string[] = []
    if (currentProjectName) parts.push(`Project: ${currentProjectName}`)
    if (currentSceneId) parts.push(`Current scene active`)
    return parts.join(", ") || "No context available"
  }

  const handleSend = async () => {
    if (!input.trim() || isThinking) return
    const context = getContextString()
    setContextInfo(context)

    await sendMessage(input.trim(), context)
    setInput("")
  }

  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {
    if (isThinking) return
    const context = getContextString()
    setContextInfo(`Using: ${context}`)
    await executeAction(action.prompt, context)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const providerName = PROVIDER_NAMES[providerType] || providerType

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
                  {contextInfo && (
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
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
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
      {providerType === "zai" && isAvailable && (
        <div className="border-t bg-amber-50 dark:bg-amber-950/20 px-3 py-1 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <Shield className="size-3" />
          Data sent to Z.ai for processing
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
