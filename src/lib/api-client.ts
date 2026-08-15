'use client'

/**
 * API Client — Uses the Zustand data store directly.
 * This makes the app fully client-side and works on GitHub Pages (static export).
 * All data is persisted to localStorage via the data store.
 */

import { useDataStore } from '@/store/data-store'
import type {
  Project, Chapter, Scene, Character, Location, Note,
  TimelineEvent, WorldElement, StoryObject, Goal, Comment,
  Version, WritingSession, Relationship, AgentTask, Backup,
} from '@/store/data-store'

// ─── Projects ───────────────────────────────────────────────

export function useProjects() {
  const store = useDataStore()
  return {
    list: store.projects,
    get: store.getProject,
    create: (data: { name: string; genre?: string; description?: string }) => {
      const p = store.addProject(data)
      // Auto-create first chapter
      const ch = store.addChapter({ projectId: p.id, title: 'Chapter 1', order: 0 })
      store.addScene({ projectId: p.id, chapterId: ch.id, title: 'Scene 1', content: '', order: 0, wordCount: 0 })
      return p
    },
    update: store.updateProject,
    delete: store.deleteProject,
    wordCount: store.getProjectWordCount,
  }
}

// ─── Chapters ───────────────────────────────────────────────

export function useChapters(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getChaptersByProject(projectId) : [],
    get: store.getChapter,
    create: (data: { projectId: string; title?: string }) => {
      const ch = store.addChapter({
        projectId: data.projectId,
        title: data.title || 'Untitled Chapter',
        order: store.getChaptersByProject(data.projectId).length,
      })
      return ch
    },
    update: store.updateChapter,
    delete: store.deleteChapter,
  }
}

// ─── Scenes ─────────────────────────────────────────────────

export function useScenes(chapterId: string | null) {
  const store = useDataStore()
  return {
    list: chapterId ? store.getScenesByChapter(chapterId) : [],
    get: store.getScene,
    create: (data: { chapterId: string; projectId: string; title?: string }) => {
      const sc = store.addScene({
        projectId: data.projectId,
        chapterId: data.chapterId,
        title: data.title || 'Untitled Scene',
        content: '',
        order: store.getScenesByChapter(data.chapterId).length,
        wordCount: 0,
      })
      return sc
    },
    update: store.updateScene,
    delete: store.deleteScene,
  }
}

// ─── Characters ─────────────────────────────────────────────

export function useCharacters(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getCharactersByProject(projectId) : [],
    get: store.getCharacter,
    create: (data: { projectId: string; name: string; role?: string }) =>
      store.addCharacter({ ...data, role: data.role || 'supporting' }),
    update: store.updateCharacter,
    delete: store.deleteCharacter,
  }
}

// ─── Locations ──────────────────────────────────────────────

export function useLocations(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getLocationsByProject(projectId) : [],
    get: store.getLocation,
    create: (data: { projectId: string; name: string; type?: string }) =>
      store.addLocation({ ...data, type: data.type || 'setting' }),
    update: store.updateLocation,
    delete: store.deleteLocation,
  }
}

// ─── Notes ──────────────────────────────────────────────────

export function useNotes(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getNotesByProject(projectId) : [],
    get: store.getNote,
    create: (data: { projectId: string; title: string; content?: string; category?: string }) =>
      store.addNote({ ...data, content: data.content || '', category: data.category || 'general' }),
    update: store.updateNote,
    delete: store.deleteNote,
  }
}

// ─── Timeline ───────────────────────────────────────────────

export function useTimeline(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getTimelineByProject(projectId) : [],
    get: store.getTimelineEvent,
    create: (data: { projectId: string; title: string; description?: string; date?: string }) =>
      store.addTimelineEvent({ ...data, description: data.description || '', date: data.date || new Date().toISOString() }),
    update: store.updateTimelineEvent,
    delete: store.deleteTimelineEvent,
  }
}

// ─── World ──────────────────────────────────────────────────

export function useWorld(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getWorldByProject(projectId) : [],
    get: store.getWorldElement,
    create: (data: { projectId: string; name: string; category?: string; description?: string }) =>
      store.addWorldElement({ ...data, category: data.category || 'lore', description: data.description || '', rules: '' }),
    update: store.updateWorldElement,
    delete: store.deleteWorldElement,
  }
}

// ─── Objects ────────────────────────────────────────────────

export function useObjects(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getObjectsByProject(projectId) : [],
    get: store.getObject,
    create: (data: { projectId: string; name: string; type?: string }) =>
      store.addObject({ ...data, type: data.type || 'prop', description: '', significance: '' }),
    update: store.updateObject,
    delete: store.deleteObject,
  }
}

// ─── Goals ──────────────────────────────────────────────────

export function useGoals(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getGoalsByProject(projectId) : [],
    create: (data: { projectId: string; type?: string; target?: number; label?: string }) =>
      store.addGoal({ ...data, type: data.type || 'daily', target: data.target || 1000, current: 0, label: data.label || 'Write words' }),
    update: store.updateGoal,
    delete: store.deleteGoal,
  }
}

// ─── Comments ───────────────────────────────────────────────

export function useComments(projectId: string | null) {
  const store = useDataStore()
  const allComments = projectId ? store.getCommentsByProject(projectId) : []
  return {
    list: allComments,
    create: (data: { projectId: string; text: string; sceneId?: string; chapterId?: string }) =>
      store.addComment({ ...data, sceneId: data.sceneId || null, chapterId: data.chapterId || null, resolved: false }),
    update: store.updateComment,
    delete: store.deleteComment,
  }
}

// ─── Versions ───────────────────────────────────────────────

export function useVersions(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getVersionsByProject(projectId) : [],
    create: (data: { projectId: string; sceneId: string; content: string; label?: string; wordCount?: number }) =>
      store.addVersion({ ...data, label: data.label || 'Auto-save', wordCount: data.wordCount || 0 }),
  }
}

// ─── Sessions ───────────────────────────────────────────────

export function useSessions(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getSessionsByProject(projectId) : [],
    create: (data: { projectId: string; wordsWritten: number; duration: number }) =>
      store.addSession({ ...data, date: new Date().toISOString() }),
  }
}

// ─── Relationships ──────────────────────────────────────────

export function useRelationships(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getRelationshipsByProject(projectId) : [],
    create: (data: { projectId: string; sourceId: string; sourceType: string; targetId: string; targetType: string; type: string; description?: string }) =>
      store.addRelationship({ ...data, description: data.description || '' }),
    update: store.updateRelationship,
    delete: store.deleteRelationship,
  }
}

// ─── Agent Tasks ────────────────────────────────────────────

export function useAgentTasks(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.agentTasks.filter(t => t.projectId === projectId) : [],
    create: (data: { projectId: string; intent: string }) =>
      store.addAgentTask({ ...data, status: 'pending', result: '' }),
    get: (id: string) => store.agentTasks.find(t => t.id === id),
    update: store.updateAgentTask,
  }
}

// ─── Backups ────────────────────────────────────────────────

export function useBackups(projectId: string | null) {
  const store = useDataStore()
  return {
    list: projectId ? store.getBackupsByProject(projectId) : [],
    create: (data: { projectId: string; label?: string }) => {
      const snapshot = JSON.stringify({
        chapters: store.chapters.filter(c => c.projectId === data.projectId),
        scenes: store.scenes.filter(s => s.projectId === data.projectId),
        characters: store.characters.filter(c => c.projectId === data.projectId),
        locations: store.locations.filter(l => l.projectId === data.projectId),
        notes: store.notes.filter(n => n.projectId === data.projectId),
        timeline: store.timeline.filter(t => t.projectId === data.projectId),
        world: store.world.filter(w => w.projectId === data.projectId),
        objects: store.objects.filter(o => o.projectId === data.projectId),
        goals: store.goals.filter(g => g.projectId === data.projectId),
        comments: store.comments.filter(c => c.projectId === data.projectId),
        relationships: store.relationships.filter(r => r.projectId === data.projectId),
      })
      return store.addBackup({ projectId: data.projectId, label: data.label || 'Manual backup', data: snapshot })
    },
    delete: store.deleteBackup,
    restore: (id: string) => {
      const backup = store.backups.find(b => b.id === id)
      if (!backup) return false
      try {
        const data = JSON.parse(backup.data)
        const pid = backup.projectId
        // Delete existing data for this project then re-add
        const existingChapters = store.chapters.filter(c => c.projectId === pid)
        existingChapters.forEach(c => store.deleteChapter(c.id))
        store.characters.filter(c => c.projectId === pid).forEach(c => store.deleteCharacter(c.id))
        store.locations.filter(l => l.projectId === pid).forEach(l => store.deleteLocation(l.id))
        store.notes.filter(n => n.projectId === pid).forEach(n => store.deleteNote(n.id))
        store.timeline.filter(t => t.projectId === pid).forEach(t => store.deleteTimelineEvent(t.id))
        store.world.filter(w => w.projectId === pid).forEach(w => store.deleteWorldElement(w.id))
        store.objects.filter(o => o.projectId === pid).forEach(o => store.deleteObject(o.id))
        store.goals.filter(g => g.projectId === pid).forEach(g => store.deleteGoal(g.id))
        store.comments.filter(c => c.projectId === pid).forEach(c => store.deleteComment(c.id))
        store.relationships.filter(r => r.projectId === pid).forEach(r => store.deleteRelationship(r.id))
        // Re-add from backup
        if (data.chapters) data.chapters.forEach((c: Chapter) => store.addChapter(c))
        if (data.scenes) data.scenes.forEach((s: Scene) => store.addScene(s))
        if (data.characters) data.characters.forEach((c: Character) => store.addCharacter(c))
        if (data.locations) data.locations.forEach((l: Location) => store.addLocation(l))
        if (data.notes) data.notes.forEach((n: Note) => store.addNote(n))
        if (data.timeline) data.timeline.forEach((t: TimelineEvent) => store.addTimelineEvent(t))
        if (data.world) data.world.forEach((w: WorldElement) => store.addWorldElement(w))
        if (data.objects) data.objects.forEach((o: StoryObject) => store.addObject(o))
        if (data.goals) data.goals.forEach((g: Goal) => store.addGoal(g))
        if (data.comments) data.comments.forEach((c: Comment) => store.addComment(c))
        if (data.relationships) data.relationships.forEach((r: Relationship) => store.addRelationship(r))
        return true
      } catch {
        return false
      }
    },
  }
}

// ─── Search ─────────────────────────────────────────────────

export function useSearch() {
  const store = useDataStore()
  return {
    search: (query: string, projectId: string | null) => {
      if (!query.trim()) return []
      const q = query.toLowerCase()
      const results: { type: string; id: string; title: string; preview: string }[] = []

      // Search characters
      store.characters
        .filter(c => (!projectId || c.projectId === projectId) && (c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)))
        .forEach(c => results.push({ type: 'character', id: c.id, title: c.name, preview: c.description.slice(0, 100) }))

      // Search locations
      store.locations
        .filter(l => (!projectId || l.projectId === projectId) && (l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)))
        .forEach(l => results.push({ type: 'location', id: l.id, title: l.name, preview: l.description.slice(0, 100) }))

      // Search notes
      store.notes
        .filter(n => (!projectId || n.projectId === projectId) && (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)))
        .forEach(n => results.push({ type: 'note', id: n.id, title: n.title, preview: n.content.slice(0, 100) }))

      // Search scenes
      store.scenes
        .filter(s => (!projectId || s.projectId === projectId) && (s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)))
        .forEach(s => results.push({ type: 'scene', id: s.id, title: s.title, preview: s.content.replace(/<[^>]*>/g, '').slice(0, 100) }))

      // Search chapters
      store.chapters
        .filter(c => (!projectId || c.projectId === projectId) && c.title.toLowerCase().includes(q))
        .forEach(c => results.push({ type: 'chapter', id: c.id, title: c.title, preview: '' }))

      // Search world elements
      store.world
        .filter(w => (!projectId || w.projectId === projectId) && (w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)))
        .forEach(w => results.push({ type: 'world', id: w.id, title: w.name, preview: w.description.slice(0, 100) }))

      return results
    }
  }
}

// ─── Export helpers ──────────────────────────────────────────

export function useExport() {
  const store = useDataStore()
  return {
    exportMarkdown: (projectId: string) => {
      const project = store.getProject(projectId)
      if (!project) return ''
      const chapters = store.getChaptersByProject(projectId)
      let md = `# ${project.name}\n\n`
      if (project.genre) md += `Genre: ${project.genre}\n\n`
      md += `---\n\n`
      chapters.forEach(ch => {
        md += `## ${ch.title}\n\n`
        const scenes = store.getScenesByChapter(ch.id)
        scenes.forEach(sc => {
          md += `### ${sc.title}\n\n`
          md += sc.content.replace(/<[^>]*>/g, '').trim() + '\n\n'
        })
      })
      return md
    },
    exportJSON: (projectId: string) => {
      const project = store.getProject(projectId)
      if (!project) return '{}'
      return JSON.stringify({
        project,
        chapters: store.getChaptersByProject(projectId),
        scenes: store.scenes.filter(s => s.projectId === projectId),
        characters: store.getCharactersByProject(projectId),
        locations: store.getLocationsByProject(projectId),
        notes: store.getNotesByProject(projectId),
        timeline: store.getTimelineByProject(projectId),
        world: store.getWorldByProject(projectId),
        objects: store.getObjectsByProject(projectId),
        relationships: store.getRelationshipsByProject(projectId),
      }, null, 2)
    },
    exportTxt: (projectId: string) => {
      const project = store.getProject(projectId)
      if (!project) return ''
      const chapters = store.getChaptersByProject(projectId)
      let txt = `${project.name}\n${'='.repeat(project.name.length)}\n\n`
      chapters.forEach(ch => {
        txt += `${ch.title}\n${'-'.repeat(ch.title.length)}\n\n`
        const scenes = store.getScenesByChapter(ch.id)
        scenes.forEach(sc => {
          txt += sc.content.replace(/<[^>]*>/g, '').trim() + '\n\n'
        })
      })
      return txt
    },
  }
}
