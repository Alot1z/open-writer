"use client"

import React, { useEffect, useState } from "react"
import { useWriterStore } from "@/store/writer-store"
import { useDataStore } from "@/store/data-store"
import { ProjectPicker } from "@/components/writer/project-picker"
import { TopBar } from "@/components/writer/top-bar"
import { LeftSidebar } from "@/components/writer/left-sidebar"
import { EditorArea } from "@/components/writer/editor-area"
import { StatusBar } from "@/components/writer/status-bar"
import { CommandPalette } from "@/components/writer/command-palette"
import { GlobalSearch } from "@/components/writer/global-search"
import { SettingsDialogWithTrigger } from "@/components/writer/settings-dialog"
import { CharacterDetail } from "@/components/writer/character-detail"
import { LocationDetail } from "@/components/writer/location-detail"
import { ObjectDetail } from "@/components/writer/object-detail"
import { WorldDetail } from "@/components/writer/world-detail"
import { TimelineDetail } from "@/components/writer/timeline-detail"
import { NoteDetail } from "@/components/writer/note-detail"
import { AgentTaskView } from "@/components/writer/agent-task-view"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { PenLine } from "lucide-react"
import { FlowWidget } from "@/components/writer/flow-widget"
import { useWritingSession } from "@/hooks/use-writing-session"

export default function Home() {
  const {
    currentProjectId,
    currentChapterId,
    currentSceneId,
    isFocusMode,
    setFocusMode,
  } = useWriterStore()

  const store = useDataStore()

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")

  // Seed demo data on mount if no projects exist
  useEffect(() => {
    if (store.projects.length === 0) {
      store.seedDemoData()
    }
  }, [])

  // Compute total word count from data store
  const totalWordCount = currentProjectId
    ? store.getProjectWordCount(currentProjectId)
    : 0

  // Get chapter/scene titles directly from data store
  const chapterTitle = currentChapterId
    ? (store.getChapter(currentChapterId)?.title || "")
    : ""

  const sceneTitle = currentSceneId
    ? (store.getScene(currentSceneId)?.title || "")
    : ""

  // Initialize automatic writing session tracking
  useWritingSession()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+\ for focus mode
      if (e.key === "\\" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setFocusMode(!isFocusMode)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isFocusMode, setFocusMode])

  // Show project picker when no project is selected
  if (!currentProjectId) {
    return (
      <TooltipProvider>
        <ProjectPicker />
      </TooltipProvider>
    )
  }

  // Focus mode: only the editor
  if (isFocusMode) {
    return (
      <TooltipProvider>
        <div className="h-screen flex flex-col bg-writer-bg">
          <TopBar
            totalWordCount={totalWordCount}
            chapterTitle={chapterTitle}
            sceneTitle={sceneTitle}
          />
          <div className="flex-1 overflow-hidden">
            <EditorArea />
          </div>
          <StatusBar
            saveStatus={saveStatus}
            totalWordCount={totalWordCount}
          />
        </div>
        <CommandPalette />
        <GlobalSearch />
        <SettingsDialogWithTrigger />
        <FlowWidget />
      </TooltipProvider>
    )
  }

  // Normal 3-panel layout
  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col">
        <TopBar
          totalWordCount={totalWordCount}
          chapterTitle={chapterTitle}
          sceneTitle={sceneTitle}
        />

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              defaultSize={18}
              minSize={12}
              maxSize={30}
              className="bg-writer-surface/50"
            >
              <LeftSidebar className="h-full" />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={60} minSize={30}>
              <EditorArea />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
              defaultSize={22}
              minSize={0}
              maxSize={35}
              collapsible
              className="bg-writer-surface/30"
            >
              <RightPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <StatusBar
          saveStatus={saveStatus}
          totalWordCount={totalWordCount}
        />
      </div>

      <CommandPalette />
      <GlobalSearch />
      <SettingsDialogWithTrigger />
      <FlowWidget />
    </TooltipProvider>
  )
}

function RightPanel() {
  const { rightPanel, rightPanelEntityId, selectedCharacterId, selectedLocationId, selectedObjectId, selectedWorldId, selectedTimelineEventId, selectedNoteId } = useWriterStore()

  const panelLabels: Record<string, string> = {
    "character-detail": "Character Details",
    "location-detail": "Location Details",
    "object-detail": "Object Details",
    "world-detail": "World Element Details",
    "timeline-detail": "Timeline Event Details",
    "note-detail": "Note Details",
    "agent-detail": "Agent Task",
    none: "Details",
  }

  if (rightPanel === "none") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
        <PenLine className="h-8 w-8 mb-3 opacity-20" />
        <p>Select an item to view details</p>
      </div>
    )
  }

  const renderDetail = () => {
    const entityId = rightPanelEntityId
    switch (rightPanel) {
      case "character-detail":
        return entityId ? <CharacterDetail characterId={entityId} /> : selectedCharacterId ? <CharacterDetail characterId={selectedCharacterId} /> : null
      case "location-detail":
        return entityId ? <LocationDetail locationId={entityId} /> : selectedLocationId ? <LocationDetail locationId={selectedLocationId} /> : null
      case "object-detail":
        return entityId ? <ObjectDetail objectId={entityId} /> : selectedObjectId ? <ObjectDetail objectId={selectedObjectId} /> : null
      case "world-detail":
        return entityId ? <WorldDetail worldId={entityId} /> : selectedWorldId ? <WorldDetail worldId={selectedWorldId} /> : null
      case "timeline-detail":
        return entityId ? <TimelineDetail eventId={entityId} /> : selectedTimelineEventId ? <TimelineDetail eventId={selectedTimelineEventId} /> : null
      case "note-detail":
        return entityId ? <NoteDetail noteId={entityId} /> : selectedNoteId ? <NoteDetail noteId={selectedNoteId} /> : null
      case "agent-detail":
        return entityId ? <AgentTaskView taskId={entityId} /> : null
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
            <p>{panelLabels[rightPanel] || "Details"}</p>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-writer-border">
        {panelLabels[rightPanel] || "Details"}
      </div>
      <ScrollArea className="flex-1">
        {renderDetail()}
      </ScrollArea>
    </div>
  )
}
