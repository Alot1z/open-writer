"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWriterStore } from "@/store/writer-store"
import {
  Type,
  PenLine,
  Target,
  Palette,
  Bot,
  Shield,
  Keyboard,
} from "lucide-react"

interface EditorSettings {
  fontFamily: "serif" | "sans" | "mono"
  fontSize: number
  lineHeight: number
  maxWidth: number
  paragraphSpacing: number
}

interface WritingSettings {
  defaultSceneStatus: string
  autosaveInterval: number
  versionHistoryRetention: number
}

interface GoalSettings {
  dailyWordGoal: number
  projectDeadline: string
}

interface AppearanceSettings {
  theme: "light" | "dark" | "system"
  accentColor: string
  focusModeDefaults: boolean
}

interface AISettings {
  provider: "none" | "zai" | "ollama" | "custom"
  model: string
  temperature: number
  contextScope: string
  permissionLevel: string
}

interface PrivacySettings {
  showDataTransmission: boolean
  localOnlyMode: boolean
}

const DEFAULT_EDITOR: EditorSettings = {
  fontFamily: "serif",
  fontSize: 16,
  lineHeight: 1.8,
  maxWidth: 700,
  paragraphSpacing: 1,
}

const DEFAULT_WRITING: WritingSettings = {
  defaultSceneStatus: "draft",
  autosaveInterval: 30,
  versionHistoryRetention: 90,
}

const DEFAULT_GOALS: GoalSettings = {
  dailyWordGoal: 1000,
  projectDeadline: "",
}

const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "system",
  accentColor: "emerald",
  focusModeDefaults: false,
}

const DEFAULT_AI: AISettings = {
  provider: "zai",
  model: "default",
  temperature: 0.7,
  contextScope: "current-scene",
  permissionLevel: "suggest",
}

const DEFAULT_PRIVACY: PrivacySettings = {
  showDataTransmission: true,
  localOnlyMode: false,
}

function loadSettings<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults
  try {
    const stored = localStorage.getItem(`openwriter-${key}`)
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults
  } catch {
    return defaults
  }
}

function saveSettings(key: string, values: Record<string, unknown>) {
  if (typeof window === "undefined") return
  localStorage.setItem(`openwriter-${key}`, JSON.stringify(values))
}

export function SettingsDialog() {
  const { isCommandPaletteOpen } = useWriterStore()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("editor")

  const [editor, setEditor] = useState<EditorSettings>(() => loadSettings("editor", DEFAULT_EDITOR))
  const [writing, setWriting] = useState<WritingSettings>(() => loadSettings("writing", DEFAULT_WRITING))
  const [goals, setGoals] = useState<GoalSettings>(() => loadSettings("goals", DEFAULT_GOALS))
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(() => loadSettings("appearance", DEFAULT_APPEARANCE))
  const [ai, setAi] = useState<AISettings>(() => loadSettings("ai", DEFAULT_AI))
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => loadSettings("privacy", DEFAULT_PRIVACY))

  const handleSave = () => {
    saveSettings("editor", editor as unknown as Record<string, unknown>)
    saveSettings("writing", writing as unknown as Record<string, unknown>)
    saveSettings("goals", goals as unknown as Record<string, unknown>)
    saveSettings("appearance", appearance as unknown as Record<string, unknown>)
    saveSettings("ai", ai as unknown as Record<string, unknown>)
    saveSettings("privacy", privacy as unknown as Record<string, unknown>)
    setOpen(false)
  }

  const FONT_MAP = {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "system-ui, -apple-system, sans-serif",
    mono: "'Courier New', monospace",
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your writing environment
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="mx-6 w-auto flex-wrap h-auto gap-0.5">
            <TabsTrigger value="editor" className="text-xs gap-1">
              <Type className="size-3" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="writing" className="text-xs gap-1">
              <PenLine className="size-3" />
              Writing
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs gap-1">
              <Target className="size-3" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs gap-1">
              <Palette className="size-3" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs gap-1">
              <Bot className="size-3" />
              AI
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs gap-1">
              <Shield className="size-3" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="text-xs gap-1">
              <Keyboard className="size-3" />
              Shortcuts
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
            {/* Editor Tab */}
            <TabsContent value="editor" className="px-6 py-4 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={editor.fontFamily}
                  onValueChange={(v) =>
                    setEditor({ ...editor, fontFamily: v as EditorSettings["fontFamily"] })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serif">Serif (Georgia)</SelectItem>
                    <SelectItem value="sans">Sans-serif (System)</SelectItem>
                    <SelectItem value="mono">Monospace (Courier)</SelectItem>
                  </SelectContent>
                </Select>
                <p
                  className="text-sm text-muted-foreground"
                  style={{ fontFamily: FONT_MAP[editor.fontFamily] }}
                >
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Font Size: {editor.fontSize}px
                </Label>
                <Slider
                  value={[editor.fontSize]}
                  onValueChange={([v]) => setEditor({ ...editor, fontSize: v })}
                  min={12}
                  max={28}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Line Height: {editor.lineHeight.toFixed(1)}
                </Label>
                <Slider
                  value={[editor.lineHeight * 10]}
                  onValueChange={([v]) =>
                    setEditor({ ...editor, lineHeight: v / 10 })
                  }
                  min={10}
                  max={30}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Max Width: {editor.maxWidth}px
                </Label>
                <Slider
                  value={[editor.maxWidth]}
                  onValueChange={([v]) =>
                    setEditor({ ...editor, maxWidth: v })
                  }
                  min={500}
                  max={1000}
                  step={50}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Paragraph Spacing: {editor.paragraphSpacing}rem
                </Label>
                <Slider
                  value={[editor.paragraphSpacing * 10]}
                  onValueChange={([v]) =>
                    setEditor({ ...editor, paragraphSpacing: v / 10 })
                  }
                  min={5}
                  max={30}
                  step={1}
                />
              </div>
            </TabsContent>

            {/* Writing Tab */}
            <TabsContent value="writing" className="px-6 py-4 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">Default Status for New Scenes</Label>
                <Select
                  value={writing.defaultSceneStatus}
                  onValueChange={(v) =>
                    setWriting({ ...writing, defaultSceneStatus: v })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="revision">Revision</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Autosave Interval: {writing.autosaveInterval}s
                </Label>
                <Slider
                  value={[writing.autosaveInterval]}
                  onValueChange={([v]) =>
                    setWriting({ ...writing, autosaveInterval: v })
                  }
                  min={5}
                  max={120}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Version History Retention: {writing.versionHistoryRetention}{" "}
                  days
                </Label>
                <Slider
                  value={[writing.versionHistoryRetention]}
                  onValueChange={([v]) =>
                    setWriting({
                      ...writing,
                      versionHistoryRetention: v,
                    })
                  }
                  min={7}
                  max={365}
                  step={7}
                />
              </div>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="px-6 py-4 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">
                  Daily Word Goal: {goals.dailyWordGoal}
                </Label>
                <Slider
                  value={[goals.dailyWordGoal]}
                  onValueChange={([v]) =>
                    setGoals({ ...goals, dailyWordGoal: v })
                  }
                  min={100}
                  max={10000}
                  step={100}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Project Deadline</Label>
                <Input
                  type="date"
                  value={goals.projectDeadline}
                  onChange={(e) =>
                    setGoals({ ...goals, projectDeadline: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="px-6 py-4 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">Theme</Label>
                <Select
                  value={appearance.theme}
                  onValueChange={(v) =>
                    setAppearance({
                      ...appearance,
                      theme: v as AppearanceSettings["theme"],
                    })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Accent Color</Label>
                <Select
                  value={appearance.accentColor}
                  onValueChange={(v) =>
                    setAppearance({ ...appearance, accentColor: v })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emerald">Emerald</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="rose">Rose</SelectItem>
                    <SelectItem value="teal">Teal</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Focus Mode Defaults</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Hide sidebars on startup
                  </p>
                </div>
                <Switch
                  checked={appearance.focusModeDefaults}
                  onCheckedChange={(v) =>
                    setAppearance({ ...appearance, focusModeDefaults: v })
                  }
                />
              </div>
            </TabsContent>

            {/* AI Tab */}
            <TabsContent value="ai" className="px-6 py-4 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">AI Provider</Label>
                <Select
                  value={ai.provider}
                  onValueChange={(v) =>
                    setAi({ ...ai, provider: v as AISettings["provider"] })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Disabled)</SelectItem>
                    <SelectItem value="zai">Z.ai</SelectItem>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ai.provider !== "none" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Model</Label>
                    <Input
                      value={ai.model}
                      onChange={(e) => setAi({ ...ai, model: e.target.value })}
                      placeholder="default"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">
                      Temperature: {ai.temperature.toFixed(1)}
                    </Label>
                    <Slider
                      value={[ai.temperature * 10]}
                      onValueChange={([v]) =>
                        setAi({ ...ai, temperature: v / 10 })
                      }
                      min={0}
                      max={20}
                      step={1}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Context Scope</Label>
                    <Select
                      value={ai.contextScope}
                      onValueChange={(v) => setAi({ ...ai, contextScope: v })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-scene">
                          Current Scene Only
                        </SelectItem>
                        <SelectItem value="current-chapter">
                          Current Chapter
                        </SelectItem>
                        <SelectItem value="full-project">
                          Full Project
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Permission Level</Label>
                    <Select
                      value={ai.permissionLevel}
                      onValueChange={(v) =>
                        setAi({ ...ai, permissionLevel: v })
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read-only">Read Only</SelectItem>
                        <SelectItem value="suggest">Suggest</SelectItem>
                        <SelectItem value="write-confirm">
                          Write with Confirmation
                        </SelectItem>
                        <SelectItem value="full-access">Full Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {ai.provider === "none" && (
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  AI features are disabled. Enable a provider to use the writing
                  assistant, continuity checking, and other AI-powered tools.
                </div>
              )}
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="px-6 py-4 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">
                    Show Data Transmission Info
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Display what data is sent to AI providers
                  </p>
                </div>
                <Switch
                  checked={privacy.showDataTransmission}
                  onCheckedChange={(v) =>
                    setPrivacy({ ...privacy, showDataTransmission: v })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Default to Local-Only Mode</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Prefer local processing when available
                  </p>
                </div>
                <Switch
                  checked={privacy.localOnlyMode}
                  onCheckedChange={(v) =>
                    setPrivacy({ ...privacy, localOnlyMode: v })
                  }
                />
              </div>

              <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-medium">Data Privacy Notice</p>
                <p>
                  When using remote AI providers (Z.ai), your manuscript content
                  is sent to their servers for processing. Local providers
                  (Ollama) keep all data on your machine.
                </p>
              </div>
            </TabsContent>

            {/* Shortcuts Tab */}
            <TabsContent value="shortcuts" className="px-6 py-4 space-y-2">
              <div className="text-xs font-medium mb-3">
                Keyboard Shortcuts
              </div>
              {[
                ["Ctrl + K", "Command Palette"],
                ["Ctrl + Shift + F", "Global Search"],
                ["Ctrl + \\", "Toggle Focus Mode"],
                ["Ctrl + ,", "Settings"],
                ["Ctrl + S", "Save"],
                ["Ctrl + Z", "Undo"],
                ["Ctrl + Shift + Z", "Redo"],
                ["Ctrl + B", "Bold"],
                ["Ctrl + I", "Italic"],
                ["Ctrl + U", "Underline"],
              ].map(([shortcut, description]) => (
                <div
                  key={shortcut}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-xs text-foreground">{description}</span>
                  <kbd className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {shortcut}
                  </kbd>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="border-t px-6 py-3 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button size="sm" className="text-xs" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { SettingsDialog as SettingsDialogWithTrigger }
