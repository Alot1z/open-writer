"use client"

import { useEffect, useCallback } from "react"
import { useWriterStore } from "@/store/writer-store"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  FolderOpen,
  BookOpen,
  Users,
  MapPin,
  Package,
  Globe,
  Clock,
  StickyNote,
  GitBranch,
  Search,
  Download,
  Database,
  Bot,
  Settings,
  Focus,
  Type,
  Plus,
  FileText,
  PenLine,
  Map,
  Calendar,
  MessageSquare,
  Zap,
  Target,
  Upload,
} from "lucide-react"

interface Command {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const store = useWriterStore()

  const navigationCommands: Command[] = [
    {
      id: "nav-project",
      label: "Open Project",
      icon: FolderOpen,
      shortcut: "Ctrl+P",
      action: () => store.setLeftPanel("chapters"),
    },
    {
      id: "nav-focus",
      label: "Focus Mode",
      icon: Focus,
      shortcut: "Ctrl+\\",
      action: () => store.setFocusMode(!store.isFocusMode),
    },
    {
      id: "nav-timeline",
      label: "Timeline",
      icon: Clock,
      action: () => store.setLeftPanel("timeline"),
    },
    {
      id: "nav-characters",
      label: "Characters",
      icon: Users,
      action: () => store.setLeftPanel("characters"),
    },
    {
      id: "nav-locations",
      label: "Locations",
      icon: MapPin,
      action: () => store.setLeftPanel("locations"),
    },
    {
      id: "nav-objects",
      label: "Objects",
      icon: Package,
      action: () => store.setLeftPanel("objects"),
    },
    {
      id: "nav-world",
      label: "World Building",
      icon: Globe,
      action: () => store.setLeftPanel("world"),
    },
    {
      id: "nav-notes",
      label: "Notes",
      icon: StickyNote,
      action: () => store.setLeftPanel("notes"),
    },
    {
      id: "nav-relationships",
      label: "Relationships",
      icon: GitBranch,
      action: () => store.setLeftPanel("relationships"),
    },
    {
      id: "nav-analytics",
      label: "Analytics",
      icon: BookOpen,
      action: () => store.setLeftPanel("analytics"),
    },
  ]

  const createCommands: Command[] = [
    {
      id: "create-chapter",
      label: "New Chapter",
      icon: Plus,
      action: () => store.setLeftPanel("chapters"),
    },
    {
      id: "create-scene",
      label: "New Scene",
      icon: FileText,
      action: () => store.setLeftPanel("chapters"),
    },
    {
      id: "create-character",
      label: "New Character",
      icon: Plus,
      action: () => store.setLeftPanel("characters"),
    },
    {
      id: "create-location",
      label: "New Location",
      icon: Plus,
      action: () => store.setLeftPanel("locations"),
    },
    {
      id: "create-note",
      label: "New Note",
      icon: Plus,
      action: () => store.setLeftPanel("notes"),
    },
    {
      id: "create-event",
      label: "New Timeline Event",
      icon: Plus,
      action: () => store.setLeftPanel("timeline"),
    },
  ]

  const actionCommands: Command[] = [
    {
      id: "action-search",
      label: "Search",
      icon: Search,
      shortcut: "Ctrl+Shift+F",
      action: () => store.setSearchOpen(true),
    },
    {
      id: "action-import",
      label: "Import",
      icon: Upload,
      action: () => store.setSettingsOpen(true, "import"),
    },
    {
      id: "action-export",
      label: "Export",
      icon: Download,
      action: () => store.setSettingsOpen(true, "export"),
    },
    {
      id: "action-backup",
      label: "Backup",
      icon: Database,
      action: () => store.setSettingsOpen(true, "backup"),
    },
    {
      id: "action-agent",
      label: "AI Agent",
      icon: Bot,
      action: () => store.setLeftPanel("agent"),
    },
    {
      id: "action-settings",
      label: "Settings",
      icon: Settings,
      shortcut: "Ctrl+,",
      action: () => store.setSettingsOpen(true),
    },
  ]

  const editorCommands: Command[] = [
    {
      id: "editor-focus",
      label: "Toggle Focus Mode",
      icon: Focus,
      shortcut: "Ctrl+\\",
      action: () => store.setFocusMode(!store.isFocusMode),
    },
    {
      id: "editor-typewriter",
      label: "Toggle Typewriter Mode",
      icon: Type,
      action: () => store.setTypewriterMode(!store.isTypewriterMode),
    },
    {
      id: "sprint-start",
      label: "Start Sprint",
      icon: Zap,
      action: () => {
        store.setLeftPanel("analytics")
        store.setSprintPanelOpen(true)
      },
    },
    {
      id: "goal-create",
      label: "Create Goal",
      icon: Target,
      action: () => {
        store.setLeftPanel("analytics")
        store.setGoalsPanelOpen(true)
      },
    },
  ]

  const runCommand = useCallback(
    (command: Command) => {
      command.action()
      store.setCommandPaletteOpen(false)
    },
    [store]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        store.setCommandPaletteOpen(!store.isCommandPaletteOpen)
      } else if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        store.setSettingsOpen(true)
      } else if (e.key === "\\" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        store.setFocusMode(!store.isFocusMode)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [store])

  return (
    <CommandDialog
      open={store.isCommandPaletteOpen}
      onOpenChange={store.setCommandPaletteOpen}
      title="Command Palette"
      description="Search for a command to run..."
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => runCommand(cmd)}
              className="cursor-pointer"
            >
              <cmd.icon className="size-4" />
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <CommandShortcut>{cmd.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Create">
          {createCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => runCommand(cmd)}
              className="cursor-pointer"
            >
              <cmd.icon className="size-4" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => runCommand(cmd)}
              className="cursor-pointer"
            >
              <cmd.icon className="size-4" />
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <CommandShortcut>{cmd.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Editor">
          {editorCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => runCommand(cmd)}
              className="cursor-pointer"
            >
              <cmd.icon className="size-4" />
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <CommandShortcut>{cmd.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
