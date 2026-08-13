'use client'

import { create } from 'zustand'

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
  | 'relationships'
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
  searchQuery: string
  
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
  setSearchQuery: (query: string) => void
}

export const useWriterStore = create<WriterState>((set) => ({
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
  searchQuery: '',

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
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
