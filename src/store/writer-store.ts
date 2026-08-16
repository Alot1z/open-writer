'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PanelType = 
  | 'chapters' 
  | 'characters' 
  | 'locations' 
  | 'objects' 
  | 'world' 
  | 'timeline' 
  | 'notes' 
  | 'comments' 
  | 'analytics' 
  | 'versions' 
  | 'agent' 
  | 'health' 
  | 'continuity'
  | 'relationships'
  | 'export'
  | 'docs'
  | 'search'
  | 'settings'

export type RightPanelType = 
  | 'character-detail'
  | 'location-detail'
  | 'object-detail'
  | 'world-detail'
  | 'timeline-detail'
  | 'note-detail'
  | 'agent-detail'
  | 'none'

export type SprintType = 'time' | 'words'
export type SprintStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface SprintState {
  type: SprintType
  status: SprintStatus
  targetDuration: number // seconds for time sprints
  targetWords: number // words for word sprints
  elapsedSeconds: number
  wordsWritten: number
  startWordCount: number
  startedAt: number | null // timestamp
}

export interface WriterState {
  // Project
  currentProjectId: string | null
  currentProjectName: string
  
  // Navigation
  currentChapterId: string | null
  currentSceneId: string | null
  
  // Panels
  leftPanel: PanelType
  rightPanel: RightPanelType
  rightPanelEntityId: string | null
  isFocusMode: boolean
  isTypewriterMode: boolean
  
  // Editor
  editorWordCount: number
  editorCharacterCount: number
  
  // Detail entities
  selectedCharacterId: string | null
  selectedLocationId: string | null
  selectedObjectId: string | null
  selectedWorldId: string | null
  selectedTimelineEventId: string | null
  selectedNoteId: string | null
  
  // UI
  isCommandPaletteOpen: boolean
  isSearchOpen: boolean
  isSettingsOpen: boolean
  settingsTab: string
  searchQuery: string

  // Sprint
  sprint: SprintState
  isSprintPanelOpen: boolean
  isGoalsPanelOpen: boolean
  
  // Actions
  setCurrentProject: (id: string, name: string) => void
  setCurrentChapter: (id: string | null) => void
  setCurrentScene: (id: string | null) => void
  setLeftPanel: (panel: PanelType) => void
  setRightPanel: (panel: RightPanelType, entityId?: string | null) => void
  setFocusMode: (on: boolean) => void
  setTypewriterMode: (on: boolean) => void
  setEditorStats: (words: number, chars: number) => void
  setSelectedCharacter: (id: string | null) => void
  setSelectedLocation: (id: string | null) => void
  setSelectedObject: (id: string | null) => void
  setSelectedWorld: (id: string | null) => void
  setSelectedTimelineEvent: (id: string | null) => void
  setSelectedNote: (id: string | null) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean, tab?: string) => void
  setSearchQuery: (query: string) => void

  // Sprint Actions
  startSprint: (type: SprintType, target: number, currentWordCount: number) => void
  pauseSprint: () => void
  resumeSprint: () => void
  stopSprint: () => void
  completeSprint: () => void
  tickSprint: () => void
  updateSprintWords: (currentWordCount: number) => void
  setSprintPanelOpen: (open: boolean) => void
  setGoalsPanelOpen: (open: boolean) => void
}

const defaultSprint: SprintState = {
  type: 'time',
  status: 'idle',
  targetDuration: 25 * 60,
  targetWords: 500,
  elapsedSeconds: 0,
  wordsWritten: 0,
  startWordCount: 0,
  startedAt: null,
}

export const useWriterStore = create<WriterState>()(
  persist(
    (set, get) => ({
  currentProjectId: null,
  currentProjectName: '',
  currentChapterId: null,
  currentSceneId: null,
  leftPanel: 'chapters',
  rightPanel: 'none',
  rightPanelEntityId: null,
  isFocusMode: false,
  isTypewriterMode: false,
  editorWordCount: 0,
  editorCharacterCount: 0,
  selectedCharacterId: null,
  selectedLocationId: null,
  selectedObjectId: null,
  selectedWorldId: null,
  selectedTimelineEventId: null,
  selectedNoteId: null,
  isCommandPaletteOpen: false,
  isSearchOpen: false,
  isSettingsOpen: false,
  settingsTab: 'editor',
  searchQuery: '',
  sprint: defaultSprint,
  isSprintPanelOpen: false,
  isGoalsPanelOpen: false,

  setCurrentProject: (id, name) => set({ 
    currentProjectId: id, 
    currentProjectName: name,
    currentChapterId: null,
    currentSceneId: null,
    selectedCharacterId: null,
    selectedLocationId: null,
    selectedObjectId: null,
    selectedWorldId: null,
    selectedTimelineEventId: null,
    selectedNoteId: null,
  }),
  setCurrentChapter: (id) => set({ currentChapterId: id, currentSceneId: null }),
  setCurrentScene: (id) => set({ currentSceneId: id }),
  setLeftPanel: (panel) => set({ leftPanel: panel }),
  setRightPanel: (panel, entityId) => set({ rightPanel: panel, rightPanelEntityId: entityId ?? null }),
  setFocusMode: (on) => set({ isFocusMode: on }),
  setTypewriterMode: (on) => set({ isTypewriterMode: on }),
  setEditorStats: (words, chars) => set({ editorWordCount: words, editorCharacterCount: chars }),
  setSelectedCharacter: (id) => set({ selectedCharacterId: id }),
  setSelectedLocation: (id) => set({ selectedLocationId: id }),
  setSelectedObject: (id) => set({ selectedObjectId: id }),
  setSelectedWorld: (id) => set({ selectedWorldId: id }),
  setSelectedTimelineEvent: (id) => set({ selectedTimelineEventId: id }),
  setSelectedNote: (id) => set({ selectedNoteId: id }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setSettingsOpen: (open, tab) => set({ isSettingsOpen: open, settingsTab: tab ?? 'editor' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Sprint Actions
  startSprint: (type, target, currentWordCount) => set({
    sprint: {
      type,
      status: 'running',
      targetDuration: type === 'time' ? target * 60 : 0,
      targetWords: type === 'words' ? target : 0,
      elapsedSeconds: 0,
      wordsWritten: 0,
      startWordCount: currentWordCount,
      startedAt: Date.now(),
    },
  }),
  pauseSprint: () => {
    const { sprint } = get()
    if (sprint.status === 'running') {
      set({ sprint: { ...sprint, status: 'paused' } })
    }
  },
  resumeSprint: () => {
    const { sprint } = get()
    if (sprint.status === 'paused') {
      set({ sprint: { ...sprint, status: 'running', startedAt: Date.now() } })
    }
  },
  stopSprint: () => set({ sprint: defaultSprint }),
  completeSprint: () => {
    const { sprint } = get()
    set({ sprint: { ...sprint, status: 'completed' } })
  },
  tickSprint: () => {
    const { sprint } = get()
    if (sprint.status !== 'running') return
    const newElapsed = sprint.elapsedSeconds + 1
    // Check if time sprint is complete
    if (sprint.type === 'time' && newElapsed >= sprint.targetDuration) {
      set({ sprint: { ...sprint, elapsedSeconds: sprint.targetDuration, status: 'completed' } })
      return
    }
    set({ sprint: { ...sprint, elapsedSeconds: newElapsed } })
  },
  updateSprintWords: (currentWordCount) => {
    const { sprint } = get()
    if (sprint.status !== 'running') return
    const newWordsWritten = Math.max(0, currentWordCount - sprint.startWordCount)
    // Check if word sprint is complete
    if (sprint.type === 'words' && newWordsWritten >= sprint.targetWords) {
      set({ sprint: { ...sprint, wordsWritten: newWordsWritten, status: 'completed' } })
      return
    }
    set({ sprint: { ...sprint, wordsWritten: newWordsWritten } })
  },
  setSprintPanelOpen: (open) => set({ isSprintPanelOpen: open }),
  setGoalsPanelOpen: (open) => set({ isGoalsPanelOpen: open }),
}),
    {
      name: 'openwriter-store',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        currentProjectName: state.currentProjectName,
        leftPanel: state.leftPanel,
        isFocusMode: state.isFocusMode,
        isTypewriterMode: state.isTypewriterMode,
      }),
    }
  )
)
