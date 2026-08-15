'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Entity Types ───────────────────────────────────────────

export interface Project {
  id: string
  name: string
  genre: string
  description: string
  updatedAt: string
  createdAt: string
  totalWordCount: number
  chapters: { id: string }[]
  characters: { id: string }[]
}

export interface Chapter {
  id: string
  projectId: string
  title: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Scene {
  id: string
  chapterId: string
  projectId: string
  title: string
  content: string
  order: number
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: string
  projectId: string
  name: string
  role: string
  description: string
  motivation: string
  backstory: string
  age: string
  occupation: string
  personality: string
  appearance: string
  goals: string
  fears: string
  tags: string
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: string
  projectId: string
  name: string
  type: string
  description: string
  atmosphere: string
  history: string
  features: string
  parentLocationId: string
  tags: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  category: string
  linkedType: string
  linkedId: string
  priority: number
  resolved: boolean
  tags: string
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  projectId: string
  title: string
  description: string
  date: string
  chapterId: string | null
  time: string
  duration: string
  location: string
  characters: string
  objects: string
  cause: string
  consequence: string
  eventType: string
  tags: string
  createdAt: string
  updatedAt: string
}

export interface WorldElement {
  id: string
  projectId: string
  name: string
  category: string
  description: string
  parent: string
  rules: string
  history: string
  tags: string
  createdAt: string
  updatedAt: string
}

export interface StoryObject {
  id: string
  projectId: string
  name: string
  type: string
  description: string
  owner: string
  location: string
  history: string
  appearance: string
  significance: string
  tags: string
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  projectId: string
  type: string
  target: number
  current: number
  deadline: string | null
  label: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  projectId: string
  sceneId: string | null
  chapterId: string | null
  text: string
  resolved: boolean
  createdAt: string
  updatedAt: string
}

export interface Version {
  id: string
  projectId: string
  sceneId: string
  content: string
  label: string
  wordCount: number
  isMilestone: boolean
  isAutosave: boolean
  createdAt: string
}

export interface WritingSession {
  id: string
  projectId: string
  wordsWritten: number
  duration: number
  date: string
  createdAt: string
}

export interface Relationship {
  id: string
  projectId: string
  sourceId: string
  sourceType: string
  targetId: string
  targetType: string
  type: string
  description: string
  strength: number
  createdAt: string
  updatedAt: string
}

export interface AgentTask {
  id: string
  projectId: string
  intent: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result: string
  createdAt: string
  updatedAt: string
}

export interface Backup {
  id: string
  projectId: string
  label: string
  data: string
  createdAt: string
}

// ─── Data Store State ───────────────────────────────────────

export interface DataState {
  projects: Project[]
  chapters: Chapter[]
  scenes: Scene[]
  characters: Character[]
  locations: Location[]
  notes: Note[]
  timeline: TimelineEvent[]
  world: WorldElement[]
  objects: StoryObject[]
  goals: Goal[]
  comments: Comment[]
  versions: Version[]
  sessions: WritingSession[]
  relationships: Relationship[]
  agentTasks: AgentTask[]
  backups: Backup[]

  // Computed helpers
  getProject: (id: string) => Project | undefined
  getChaptersByProject: (projectId: string) => Chapter[]
  getScenesByChapter: (chapterId: string) => Scene[]
  getScene: (id: string) => Scene | undefined
  getChapter: (id: string) => Chapter | undefined
  getCharactersByProject: (projectId: string) => Character[]
  getCharacter: (id: string) => Character | undefined
  getLocationsByProject: (projectId: string) => Location[]
  getLocation: (id: string) => Location | undefined
  getNotesByProject: (projectId: string) => Note[]
  getNote: (id: string) => Note | undefined
  getTimelineByProject: (projectId: string) => TimelineEvent[]
  getTimelineEvent: (id: string) => TimelineEvent | undefined
  getWorldByProject: (projectId: string) => WorldElement[]
  getWorldElement: (id: string) => WorldElement | undefined
  getObjectsByProject: (projectId: string) => StoryObject[]
  getObject: (id: string) => StoryObject | undefined
  getGoalsByProject: (projectId: string) => Goal[]
  getCommentsByProject: (projectId: string) => Comment[]
  getVersionsByProject: (projectId: string) => Version[]
  getSessionsByProject: (projectId: string) => WritingSession[]
  getRelationshipsByProject: (projectId: string) => Relationship[]
  getBackupsByProject: (projectId: string) => Backup[]
  getProjectWordCount: (projectId: string) => number

  // CRUD actions
  addProject: (data: Partial<Project>) => Project
  updateProject: (id: string, data: Partial<Project>) => void
  deleteProject: (id: string) => void

  addChapter: (data: Partial<Chapter>) => Chapter
  updateChapter: (id: string, data: Partial<Chapter>) => void
  deleteChapter: (id: string) => void

  addScene: (data: Partial<Scene>) => Scene
  updateScene: (id: string, data: Partial<Scene>) => void
  deleteScene: (id: string) => void

  addCharacter: (data: Partial<Character>) => Character
  updateCharacter: (id: string, data: Partial<Character>) => void
  deleteCharacter: (id: string) => void

  addLocation: (data: Partial<Location>) => Location
  updateLocation: (id: string, data: Partial<Location>) => void
  deleteLocation: (id: string) => void

  addNote: (data: Partial<Note>) => Note
  updateNote: (id: string, data: Partial<Note>) => void
  deleteNote: (id: string) => void

  addTimelineEvent: (data: Partial<TimelineEvent>) => TimelineEvent
  updateTimelineEvent: (id: string, data: Partial<TimelineEvent>) => void
  deleteTimelineEvent: (id: string) => void

  addWorldElement: (data: Partial<WorldElement>) => WorldElement
  updateWorldElement: (id: string, data: Partial<WorldElement>) => void
  deleteWorldElement: (id: string) => void

  addObject: (data: Partial<StoryObject>) => StoryObject
  updateObject: (id: string, data: Partial<StoryObject>) => void
  deleteObject: (id: string) => void

  addGoal: (data: Partial<Goal>) => Goal
  updateGoal: (id: string, data: Partial<Goal>) => void
  deleteGoal: (id: string) => void

  addComment: (data: Partial<Comment>) => Comment
  updateComment: (id: string, data: Partial<Comment>) => void
  deleteComment: (id: string) => void

  addVersion: (data: Partial<Version>) => Version

  addSession: (data: Partial<WritingSession>) => WritingSession

  addRelationship: (data: Partial<Relationship>) => Relationship
  updateRelationship: (id: string, data: Partial<Relationship>) => void
  deleteRelationship: (id: string) => void

  addAgentTask: (data: Partial<AgentTask>) => AgentTask
  updateAgentTask: (id: string, data: Partial<AgentTask>) => void

  addBackup: (data: Partial<Backup>) => Backup
  deleteBackup: (id: string) => void

  // Seed demo data
  seedDemoData: () => void
}

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      projects: [],
      chapters: [],
      scenes: [],
      characters: [],
      locations: [],
      notes: [],
      timeline: [],
      world: [],
      objects: [],
      goals: [],
      comments: [],
      versions: [],
      sessions: [],
      relationships: [],
      agentTasks: [],
      backups: [],

      // ─── Computed Helpers ──────────────────────────────────

      getProject: (id) => get().projects.find(p => p.id === id),
      getChaptersByProject: (projectId) => get().chapters.filter(c => c.projectId === projectId).sort((a, b) => a.order - b.order),
      getScenesByChapter: (chapterId) => get().scenes.filter(s => s.chapterId === chapterId).sort((a, b) => a.order - b.order),
      getScene: (id) => get().scenes.find(s => s.id === id),
      getChapter: (id) => get().chapters.find(c => c.id === id),
      getCharactersByProject: (projectId) => get().characters.filter(c => c.projectId === projectId),
      getCharacter: (id) => get().characters.find(c => c.id === id),
      getLocationsByProject: (projectId) => get().locations.filter(l => l.projectId === projectId),
      getLocation: (id) => get().locations.find(l => l.id === id),
      getNotesByProject: (projectId) => get().notes.filter(n => n.projectId === projectId),
      getNote: (id) => get().notes.find(n => n.id === id),
      getTimelineByProject: (projectId) => get().timeline.filter(t => t.projectId === projectId),
      getTimelineEvent: (id) => get().timeline.find(t => t.id === id),
      getWorldByProject: (projectId) => get().world.filter(w => w.projectId === projectId),
      getWorldElement: (id) => get().world.find(w => w.id === id),
      getObjectsByProject: (projectId) => get().objects.filter(o => o.projectId === projectId),
      getObject: (id) => get().objects.find(o => o.id === id),
      getGoalsByProject: (projectId) => get().goals.filter(g => g.projectId === projectId),
      getCommentsByProject: (projectId) => get().comments.filter(c => c.projectId === projectId),
      getVersionsByProject: (projectId) => get().versions.filter(v => v.projectId === projectId),
      getSessionsByProject: (projectId) => get().sessions.filter(s => s.projectId === projectId),
      getRelationshipsByProject: (projectId) => get().relationships.filter(r => r.projectId === projectId),
      getBackupsByProject: (projectId) => get().backups.filter(b => b.projectId === projectId),
      getProjectWordCount: (projectId) => {
        const chapters = get().chapters.filter(c => c.projectId === projectId)
        const chapterIds = new Set(chapters.map(c => c.id))
        return get().scenes
          .filter(s => chapterIds.has(s.chapterId))
          .reduce((sum, s) => sum + (s.wordCount || 0), 0)
      },

      // ─── Project CRUD ─────────────────────────────────────

      addProject: (data) => {
        const project: Project = {
          id: uid(),
          name: data.name || 'Untitled Project',
          genre: data.genre || '',
          description: data.description || '',
          updatedAt: now(),
          createdAt: now(),
          totalWordCount: 0,
          chapters: [],
          characters: [],
          ...data,
        }
        set(s => ({ projects: [...s.projects, project] }))
        return project
      },
      updateProject: (id, data) => set(s => ({
        projects: s.projects.map(p => p.id === id ? { ...p, ...data, updatedAt: now() } : p)
      })),
      deleteProject: (id) => set(s => ({
        projects: s.projects.filter(p => p.id !== id),
        chapters: s.chapters.filter(c => c.projectId !== id),
        scenes: s.scenes.filter(sc => {
          if (sc.projectId === id) return false
          const chapter = s.chapters.find(c => c.id === sc.chapterId)
          return chapter?.projectId !== id
        }),
        characters: s.characters.filter(c => c.projectId !== id),
        locations: s.locations.filter(l => l.projectId !== id),
        notes: s.notes.filter(n => n.projectId !== id),
        timeline: s.timeline.filter(t => t.projectId !== id),
        world: s.world.filter(w => w.projectId !== id),
        objects: s.objects.filter(o => o.projectId !== id),
        goals: s.goals.filter(g => g.projectId !== id),
        comments: s.comments.filter(c => c.projectId !== id),
        versions: s.versions.filter(v => v.projectId !== id),
        sessions: s.sessions.filter(se => se.projectId !== id),
        relationships: s.relationships.filter(r => r.projectId !== id),
      })),

      // ─── Chapter CRUD ─────────────────────────────────────

      addChapter: (data) => {
        const chapter: Chapter = {
          id: uid(),
          projectId: data.projectId || '',
          title: data.title || 'Untitled Chapter',
          order: data.order ?? get().chapters.filter(c => c.projectId === data.projectId).length,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ chapters: [...s.chapters, chapter] }))
        return chapter
      },
      updateChapter: (id, data) => set(s => ({
        chapters: s.chapters.map(c => c.id === id ? { ...c, ...data, updatedAt: now() } : c)
      })),
      deleteChapter: (id) => {
        const chapter = get().chapters.find(c => c.id === id)
        if (chapter) {
          set(s => ({
            chapters: s.chapters.filter(c => c.id !== id),
            scenes: s.scenes.filter(sc => sc.chapterId !== id),
          }))
        }
      },

      // ─── Scene CRUD ───────────────────────────────────────

      addScene: (data) => {
        const scene: Scene = {
          id: uid(),
          chapterId: data.chapterId || '',
          projectId: data.projectId || '',
          title: data.title || 'Untitled Scene',
          content: data.content || '',
          order: data.order ?? get().scenes.filter(s => s.chapterId === data.chapterId).length,
          wordCount: data.wordCount || 0,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ scenes: [...s.scenes, scene] }))
        return scene
      },
      updateScene: (id, data) => set(s => ({
        scenes: s.scenes.map(sc => sc.id === id ? { ...sc, ...data, updatedAt: now() } : sc)
      })),
      deleteScene: (id) => set(s => ({
        scenes: s.scenes.filter(sc => sc.id !== id),
      })),

      // ─── Character CRUD ───────────────────────────────────

      addCharacter: (data) => {
        const character: Character = {
          id: uid(),
          projectId: data.projectId || '',
          name: data.name || 'Unnamed Character',
          role: data.role || 'supporting',
          description: data.description || '',
          motivation: data.motivation || '',
          backstory: data.backstory || '',
          age: data.age || '',
          occupation: data.occupation || '',
          personality: data.personality || '',
          appearance: data.appearance || '',
          goals: data.goals || '',
          fears: data.fears || '',
          tags: data.tags || '[]',
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ characters: [...s.characters, character] }))
        return character
      },
      updateCharacter: (id, data) => set(s => ({
        characters: s.characters.map(c => c.id === id ? { ...c, ...data, updatedAt: now() } : c)
      })),
      deleteCharacter: (id) => set(s => ({
        characters: s.characters.filter(c => c.id !== id),
      })),

      // ─── Location CRUD ────────────────────────────────────

      addLocation: (data) => {
        const location: Location = {
          id: uid(),
          projectId: data.projectId || '',
          name: data.name || 'Unnamed Location',
          type: data.type || 'setting',
          description: data.description || '',
          atmosphere: data.atmosphere || '',
          history: data.history || '',
          features: data.features || '',
          parentLocationId: data.parentLocationId || '',
          tags: data.tags || '[]',
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ locations: [...s.locations, location] }))
        return location
      },
      updateLocation: (id, data) => set(s => ({
        locations: s.locations.map(l => l.id === id ? { ...l, ...data, updatedAt: now() } : l)
      })),
      deleteLocation: (id) => set(s => ({
        locations: s.locations.filter(l => l.id !== id),
      })),

      // ─── Note CRUD ────────────────────────────────────────

      addNote: (data) => {
        const note: Note = {
          id: uid(),
          projectId: data.projectId || '',
          title: data.title || 'Untitled Note',
          content: data.content || '',
          category: data.category || 'general',
          linkedType: data.linkedType || '',
          linkedId: data.linkedId || '',
          priority: data.priority ?? 0,
          resolved: data.resolved || false,
          tags: data.tags || '[]',
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ notes: [...s.notes, note] }))
        return note
      },
      updateNote: (id, data) => set(s => ({
        notes: s.notes.map(n => n.id === id ? { ...n, ...data, updatedAt: now() } : n)
      })),
      deleteNote: (id) => set(s => ({
        notes: s.notes.filter(n => n.id !== id),
      })),

      // ─── Timeline CRUD ────────────────────────────────────

      addTimelineEvent: (data) => {
        const event: TimelineEvent = {
          id: uid(),
          projectId: data.projectId || '',
          title: data.title || 'Untitled Event',
          description: data.description || '',
          date: data.date || now(),
          chapterId: data.chapterId || null,
          time: data.time || '',
          duration: data.duration || '',
          location: data.location || '',
          characters: data.characters || '[]',
          objects: data.objects || '[]',
          cause: data.cause || '',
          consequence: data.consequence || '',
          eventType: data.eventType || 'custom',
          tags: data.tags || '[]',
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ timeline: [...s.timeline, event] }))
        return event
      },
      updateTimelineEvent: (id, data) => set(s => ({
        timeline: s.timeline.map(t => t.id === id ? { ...t, ...data, updatedAt: now() } : t)
      })),
      deleteTimelineEvent: (id) => set(s => ({
        timeline: s.timeline.filter(t => t.id !== id),
      })),

      // ─── World CRUD ───────────────────────────────────────

      addWorldElement: (data) => {
        const element: WorldElement = {
          id: uid(),
          projectId: data.projectId || '',
          name: data.name || 'Unnamed Element',
          category: data.category || 'lore',
          description: data.description || '',
          parent: data.parent || '',
          rules: data.rules || '',
          history: data.history || '',
          tags: data.tags || '[]',
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ world: [...s.world, element] }))
        return element
      },
      updateWorldElement: (id, data) => set(s => ({
        world: s.world.map(w => w.id === id ? { ...w, ...data, updatedAt: now() } : w)
      })),
      deleteWorldElement: (id) => set(s => ({
        world: s.world.filter(w => w.id !== id),
      })),

      // ─── Object CRUD ──────────────────────────────────────

      addObject: (data) => {
        const obj: StoryObject = {
          id: uid(),
          projectId: data.projectId || '',
          name: data.name || 'Unnamed Object',
          type: data.type || 'prop',
          description: data.description || '',
          owner: data.owner || '',
          location: data.location || '',
          history: data.history || '',
          appearance: data.appearance || '',
          significance: data.significance || '',
          tags: data.tags || '[]',
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ objects: [...s.objects, obj] }))
        return obj
      },
      updateObject: (id, data) => set(s => ({
        objects: s.objects.map(o => o.id === id ? { ...o, ...data, updatedAt: now() } : o)
      })),
      deleteObject: (id) => set(s => ({
        objects: s.objects.filter(o => o.id !== id),
      })),

      // ─── Goal CRUD ────────────────────────────────────────

      addGoal: (data) => {
        const goal: Goal = {
          id: uid(),
          projectId: data.projectId || '',
          type: data.type || 'daily',
          target: data.target || 1000,
          current: data.current ?? 0,
          deadline: data.deadline || null,
          label: data.label || 'Write words',
          active: data.active ?? true,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ goals: [...s.goals, goal] }))
        return goal
      },
      updateGoal: (id, data) => set(s => ({
        goals: s.goals.map(g => g.id === id ? { ...g, ...data, updatedAt: now() } : g)
      })),
      deleteGoal: (id) => set(s => ({
        goals: s.goals.filter(g => g.id !== id),
      })),

      // ─── Comment CRUD ─────────────────────────────────────

      addComment: (data) => {
        const comment: Comment = {
          id: uid(),
          projectId: data.projectId || '',
          sceneId: data.sceneId || null,
          chapterId: data.chapterId || null,
          text: data.text || '',
          resolved: data.resolved || false,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ comments: [...s.comments, comment] }))
        return comment
      },
      updateComment: (id, data) => set(s => ({
        comments: s.comments.map(c => c.id === id ? { ...c, ...data, updatedAt: now() } : c)
      })),
      deleteComment: (id) => set(s => ({
        comments: s.comments.filter(c => c.id !== id),
      })),

      // ─── Version ──────────────────────────────────────────

      addVersion: (data) => {
        const version: Version = {
          id: uid(),
          projectId: data.projectId || '',
          sceneId: data.sceneId || '',
          content: data.content || '',
          label: data.label || 'Auto-save',
          wordCount: data.wordCount || 0,
          isMilestone: data.isMilestone || false,
          isAutosave: data.isAutosave ?? true,
          createdAt: now(),
          ...data,
        }
        set(s => ({ versions: [...s.versions, version] }))
        return version
      },

      // ─── Session ──────────────────────────────────────────

      addSession: (data) => {
        const session: WritingSession = {
          id: uid(),
          projectId: data.projectId || '',
          wordsWritten: data.wordsWritten || 0,
          duration: data.duration || 0,
          date: data.date || now(),
          createdAt: now(),
          ...data,
        }
        set(s => ({ sessions: [...s.sessions, session] }))
        return session
      },

      // ─── Relationship CRUD ────────────────────────────────

      addRelationship: (data) => {
        const rel: Relationship = {
          id: uid(),
          projectId: data.projectId || '',
          sourceId: data.sourceId || '',
          sourceType: data.sourceType || 'character',
          targetId: data.targetId || '',
          targetType: data.targetType || 'character',
          type: data.type || 'related',
          description: data.description || '',
          strength: data.strength ?? 5,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ relationships: [...s.relationships, rel] }))
        return rel
      },
      updateRelationship: (id, data) => set(s => ({
        relationships: s.relationships.map(r => r.id === id ? { ...r, ...data, updatedAt: now() } : r)
      })),
      deleteRelationship: (id) => set(s => ({
        relationships: s.relationships.filter(r => r.id !== id),
      })),

      // ─── Agent Task ───────────────────────────────────────

      addAgentTask: (data) => {
        const task: AgentTask = {
          id: uid(),
          projectId: data.projectId || '',
          intent: data.intent || '',
          status: data.status || 'pending',
          result: data.result || '',
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        set(s => ({ agentTasks: [...s.agentTasks, task] }))
        return task
      },
      updateAgentTask: (id, data) => set(s => ({
        agentTasks: s.agentTasks.map(t => t.id === id ? { ...t, ...data, updatedAt: now() } : t)
      })),

      // ─── Backup ───────────────────────────────────────────

      addBackup: (data) => {
        const backup: Backup = {
          id: uid(),
          projectId: data.projectId || '',
          label: data.label || 'Manual backup',
          data: data.data || '{}',
          createdAt: now(),
          ...data,
        }
        set(s => ({ backups: [...s.backups, backup] }))
        return backup
      },
      deleteBackup: (id) => set(s => ({
        backups: s.backups.filter(b => b.id !== id),
      })),

      // ─── Seed Demo Data ───────────────────────────────────

      seedDemoData: () => {
        const state = get()
        if (state.projects.length > 0) return // Already has data

        // Create demo project
        const project = get().addProject({
          name: 'The Last Lighthouse',
          genre: 'Literary Fiction',
          description: 'A story about a lighthouse keeper who discovers messages in bottles from a civilization that no longer exists.',
        })

        // Create chapters and scenes
        const ch1 = get().addChapter({ projectId: project.id, title: 'Chapter 1: The Storm', order: 0 })
        const sc1 = get().addScene({
          projectId: project.id,
          chapterId: ch1.id,
          title: 'The Arrival',
          content: '<p>The rain came sideways that night, hammering the lighthouse windows with a fury that seemed almost personal. Maren pulled her chair closer to the fire, though the cold she felt had nothing to do with the storm outside.</p><p>She had been keeper of the North Point Light for seven years now—long enough to know every creak of the tower, every whine of wind through the lantern room. But tonight was different. Tonight, the sea was trying to tell her something.</p><p>Through the rain-streaked glass, she could see the waves breaking white against the rocks far below. Each flash of lightning froze the water mid-crash, sculpture of violence and beauty. And in that frozen moment, she saw it—a dark shape, tumbling in the surf.</p><p>A bottle. No, not just one. Dozens of them, riding the waves like a fleet of ghost ships, their glass bodies catching the lightning and throwing it back in green and amber sparks.</p>',
          order: 0,
          wordCount: 168,
        })
        get().addScene({
          projectId: project.id,
          chapterId: ch1.id,
          title: 'The Message',
          content: '<p>The first bottle washed up at dawn, tangled in a nest of kelp at the base of the lighthouse steps. Maren retrieved it with her iron hook—the one she used for fetching debris from the rocks—and carried it inside.</p><p>The paper inside was yellowed and brittle, the ink faded to a watery brown. But the words were still legible, written in a language she had never seen yet somehow understood:</p><p><em>"We are the keepers of the Southern Archipelago Light. We write to you from the year 1847. If this message reaches you, know that we have found the frequency. The light speaks. It has always spoken. You need only learn to listen."</em></p>',
          order: 1,
          wordCount: 132,
        })

        const ch2 = get().addChapter({ projectId: project.id, title: 'Chapter 2: The Frequency', order: 1 })
        get().addScene({
          projectId: project.id,
          chapterId: ch2.id,
          title: 'Listening',
          content: '<p>Maren spent the next three days adjusting the lens. Not the Fresnel lens itself—that was perfect, had been perfect since the day it was installed—but the auxiliary reflectors, the small mirrors she had added over the years to catch and redirect stray beams.</p><p>She was looking for something. A pattern. A rhythm in the light that went beyond the simple on-off pulse of the lamp. The messages had told her it existed. She just had to find it.</p>',
          order: 0,
          wordCount: 82,
        })

        const ch3 = get().addChapter({ projectId: project.id, title: 'Chapter 3: The Network', order: 2 })
        get().addScene({
          projectId: project.id,
          chapterId: ch3.id,
          title: 'Discovery',
          content: '<p>On the fourteenth night, she found it. The frequency was buried in the strobe pattern itself—a modulation so subtle that it was invisible to the naked eye, but unmistakable once you knew what to look for.</p>',
          order: 0,
          wordCount: 46,
        })

        // Create characters
        get().addCharacter({
          projectId: project.id,
          name: 'Maren Voss',
          role: 'protagonist',
          description: 'The lighthouse keeper, a woman in her early thirties with weathered hands and calm, watchful eyes. Seven years at the North Point Light have given her an intimate understanding of the sea.',
          motivation: 'To understand the messages from the other lighthouses and discover what happened to the network.',
          backstory: 'Former naval communications officer who took the lighthouse post after a personal tragedy.',
        })
        get().addCharacter({
          projectId: project.id,
          name: 'Captain Aldric',
          role: 'supporting',
          description: 'The retired sea captain who delivers supplies to the lighthouse once a month.',
          motivation: 'To help Maren while keeping his own secrets about the old lighthouse network.',
          backstory: 'Once commanded a vessel in the Southern Archipelago.',
        })
        get().addCharacter({
          projectId: project.id,
          name: 'The Keeper of 1847',
          role: 'antagonist',
          description: 'A mysterious figure from the past whose messages seem to know more than they should about the present.',
          motivation: 'Unknown — possibly to complete the network or to warn of something.',
          backstory: 'One of the original lighthouse keepers who discovered the light frequency.',
        })

        // Create locations
        get().addLocation({
          projectId: project.id,
          name: 'North Point Lighthouse',
          type: 'primary setting',
          description: 'A stone lighthouse perched on a rocky promontory, battered by the North Sea. The lantern room offers a 360-degree view of the ocean.',
          atmosphere: 'Isolated, windswept, ancient. The stone walls hold warmth from the fire but the air always carries the bite of salt.',
        })
        get().addLocation({
          projectId: project.id,
          name: 'The Rocky Shore',
          type: 'setting',
          description: 'The jagged rocks below the lighthouse where the bottles wash ashore.',
          atmosphere: 'Dangerous, beautiful, ever-changing with the tides.',
        })

        // Create notes
        get().addNote({
          projectId: project.id,
          title: 'Research: Lighthouse communication',
          content: 'Real lighthouses did use different flash patterns to identify themselves. The idea of encoding messages in light is historically grounded.',
          category: 'research',
        })
        get().addNote({
          projectId: project.id,
          title: 'Theme notes',
          content: 'The core theme is about finding connection in isolation. The lighthouses are metaphors for human communication—sending signals into the dark, hoping someone is watching.',
          category: 'outline',
        })

        // Create timeline events
        get().addTimelineEvent({
          projectId: project.id,
          title: 'The Storm',
          description: 'Maren discovers the first bottles during the storm',
          date: '2024-01-15',
          chapterId: ch1.id,
        })
        get().addTimelineEvent({
          projectId: project.id,
          title: 'Finding the Frequency',
          description: 'After 14 nights, Maren decodes the light pattern',
          date: '2024-01-29',
          chapterId: ch2.id,
        })

        // Create world elements
        get().addWorldElement({
          projectId: project.id,
          name: 'The Light Frequency',
          category: 'magic system',
          description: 'A modulation pattern in lighthouse strobe sequences that allows transmission of messages over vast distances.',
          rules: 'Requires precise alignment of Fresnel lens and auxiliary reflectors. Messages degrade over distance. Cannot transmit through fog.',
        })
        get().addWorldElement({
          projectId: project.id,
          name: 'The Lighthouse Network',
          category: 'lore',
          description: 'An ancient network of lighthouses that once communicated using the light frequency, now largely broken and forgotten.',
          rules: 'Each lighthouse has a unique signature pattern. Messages can only be received by a keeper who knows what to listen for.',
        })

        // Create objects
        get().addObject({
          projectId: project.id,
          name: 'The Iron Hook',
          type: 'prop',
          description: 'A long-handled hook Maren uses to retrieve debris from the rocks.',
          significance: 'Symbolizes her reach into the unknown—the tool that first pulls the messages from the sea.',
        })
        get().addObject({
          projectId: project.id,
          name: 'The Bottles',
          type: 'prop',
          description: 'Green glass bottles carrying messages from other lighthouses.',
          significance: 'Physical manifestation of the network—each bottle is a voice from the past.',
        })

        // Create goals
        get().addGoal({
          projectId: project.id,
          type: 'daily',
          target: 1000,
          current: 428,
          label: 'Daily word count',
        })

        // Update project word count
        get().updateProject(project.id, {
          totalWordCount: get().getProjectWordCount(project.id)
        })
      },
    }),
    {
      name: 'openwriter-data',
      version: 1,
    }
  )
)
