/**
 * Domain services for Open Writer's local-first data layer.
 *
 * Every function here is the browser-local equivalent of a former
 * server API route (Prisma + SQLite). Semantics are preserved:
 * same validations, same ordering, same cascade rules, same response
 * shapes. Nothing here touches the network or Node.js.
 */

import * as db from "./storage"
import type {
  Project,
  Chapter,
  Scene,
  Character,
  Location,
  StoryObject,
  WorldElement,
  TimelineEvent,
  Relationship,
  Note,
  Comment,
  ManuscriptVersion,
  WritingGoal,
  WritingSession,
  AgentTask,
} from "./types"

export const now = (): string => new Date().toISOString()
export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()
}

export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, "").trim()
  return text ? text.split(/\s+/).length : 0
}

const pick = (obj: Record<string, unknown>, keys: string[]) => {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

// ─────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────

export async function listProjects(): Promise<unknown[]> {
  const [projects, chapters, scenes, characters] = await Promise.all([
    db.getAll<Project>("projects"),
    db.getAll<Chapter>("chapters"),
    db.getAll<Scene>("scenes"),
    db.getAll<Character>("characters"),
  ])

  const chapterProject = new Map(chapters.map((c) => [c.id, c.projectId]))
  const chapterCount: Record<string, number> = {}
  const sceneWordCount: Record<string, number> = {}
  for (const c of chapters) {
    chapterCount[c.projectId] = (chapterCount[c.projectId] ?? 0) + 1
  }
  for (const s of scenes) {
    const pid = chapterProject.get(s.chapterId)
    if (!pid) continue
    sceneWordCount[pid] = (sceneWordCount[pid] ?? 0) + s.wordCount
  }
  const characterCount: Record<string, number> = {}
  for (const c of characters) characterCount[c.projectId] = (characterCount[c.projectId] ?? 0) + 1

  return projects
    .map((p) => ({
      ...p,
      _count: {
        chapters: chapterCount[p.id] ?? 0,
        characters: characterCount[p.id] ?? 0,
      },
      totalWordCount: sceneWordCount[p.id] ?? 0,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export async function getProject(id: string): Promise<unknown> {
  const [project, chapters, scenes, characters, locations, storyObjects, notes, timelineEvents] = await Promise.all([
    db.getById<Project>("projects", id),
    db.getAll<Chapter>("chapters"),
    db.getAll<Scene>("scenes"),
    db.getAll<Character>("characters"),
    db.getAll<Location>("locations"),
    db.getAll<StoryObject>("storyObjects"),
    db.getAll<Note>("notes"),
    db.getAll<TimelineEvent>("timelineEvents"),
  ])
  if (!project) return null

  const chapterProject = new Map(chapters.map((c) => [c.id, c.projectId]))
  let totalWordCount = 0
  for (const s of scenes) if (chapterProject.get(s.chapterId) === id) totalWordCount += s.wordCount

  const count = (arr: { projectId: string }[]) => arr.filter((x) => x.projectId === id).length

  return {
    ...project,
    _count: {
      chapters: count(chapters),
      characters: count(characters),
      locations: count(locations),
      storyObjects: count(storyObjects),
      notes: count(notes),
      timelineEvents: count(timelineEvents),
    },
    totalWordCount,
  }
}

export async function createProject(body: Record<string, unknown>): Promise<Project> {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) throw new ApiError("Project name is required", 400)
  const t = now()
  const project: Project = {
    id: newId(),
    name,
    description: String(body.description ?? ""),
    genre: String(body.genre ?? ""),
    synopsis: String(body.synopsis ?? ""),
    status: "draft",
    coverImage: "",
    settings: "{}",
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord("projects", project)
  return project
}

export async function updateProject(id: string, body: Record<string, unknown>): Promise<Project | null> {
  const project = await db.getById<Project>("projects", id)
  if (!project) return null
  const updated: Project = {
    ...project,
    ...pick(body, ["name", "description", "genre", "synopsis", "status", "coverImage", "settings"]),
    updatedAt: now(),
  }
  await db.putRecord("projects", updated)
  return updated
}

export async function deleteProject(id: string): Promise<boolean> {
  const project = await db.getById<Project>("projects", id)
  if (!project) return false

  const [chapters, scenes, characters, locations, storyObjects, worldElements, timelineEvents, relationships, notes, comments, versions, goals, sessions, tasks] = await Promise.all([
    db.getAll<Chapter>("chapters"),
    db.getAll<Scene>("scenes"),
    db.getAll<Character>("characters"),
    db.getAll<Location>("locations"),
    db.getAll<StoryObject>("storyObjects"),
    db.getAll<WorldElement>("worldElements"),
    db.getAll<TimelineEvent>("timelineEvents"),
    db.getAll<Relationship>("relationships"),
    db.getAll<Note>("notes"),
    db.getAll<Comment>("comments"),
    db.getAll<ManuscriptVersion>("versions"),
    db.getAll<WritingGoal>("goals"),
    db.getAll<WritingSession>("sessions"),
    db.getAll<AgentTask>("agentTasks"),
  ])

  const projectChapters = chapters.filter((c) => c.projectId === id)
  const chapterIds = new Set(projectChapters.map((c) => c.id))
  const projectScenes = scenes.filter((s) => chapterIds.has(s.chapterId))
  const sceneIds = new Set(projectScenes.map((s) => s.id))

  await db.bulkPut("chapters", chapters.filter((c) => c.projectId !== id))
  await db.bulkPut("scenes", scenes.filter((s) => !chapterIds.has(s.chapterId)))
  await db.bulkPut("characters", characters.filter((c) => c.projectId !== id))
  await db.bulkPut("locations", locations.filter((l) => l.projectId !== id))
  await db.bulkPut("storyObjects", storyObjects.filter((o) => o.projectId !== id))
  await db.bulkPut("worldElements", worldElements.filter((w) => w.projectId !== id))
  await db.bulkPut("timelineEvents", timelineEvents.filter((e) => e.projectId !== id))
  await db.bulkPut("relationships", relationships.filter((r) => r.projectId !== id))
  await db.bulkPut("notes", notes.filter((n) => n.projectId !== id))
  await db.bulkPut("comments", comments.filter((c) => c.projectId !== id || (c.sceneId && sceneIds.has(c.sceneId))))
  await db.bulkPut("versions", versions.filter((v) => v.projectId !== id || (v.sceneId && sceneIds.has(v.sceneId))))
  await db.bulkPut("goals", goals.filter((g) => g.projectId !== id))
  await db.bulkPut("sessions", sessions.filter((s) => s.projectId !== id))
  await db.bulkPut("agentTasks", tasks.filter((t) => t.projectId !== id))
  await db.deleteRecord("projects", id)
  return true
}

// ─────────────────────────────────────────────────────────────
// CHAPTERS & SCENES
// ─────────────────────────────────────────────────────────────

export async function listChapters(projectId: string): Promise<unknown[]> {
  const [chapters, scenes] = await Promise.all([
    db.getAll<Chapter>("chapters"),
    db.getAll<Scene>("scenes"),
  ])
  return chapters
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      ...c,
      scenes: scenes
        .filter((s) => s.chapterId === c.id)
        .sort((a, b) => a.order - b.order),
    }))
}

export async function getChapter(id: string): Promise<unknown | null> {
  const [chapter, scenes] = await Promise.all([db.getById<Chapter>("chapters", id), db.getAll<Scene>("scenes")])
  if (!chapter) return null
  return {
    ...chapter,
    scenes: scenes.filter((s) => s.chapterId === id).sort((a, b) => a.order - b.order),
  }
}

export async function createChapter(body: Record<string, unknown>): Promise<unknown> {
  const projectId = String(body.projectId ?? "")
  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!projectId || !title) throw new ApiError("projectId and title are required", 400)

  const chapters = await db.getAll<Chapter>("chapters")
  const projectChapters = chapters.filter((c) => c.projectId === projectId)
  let order = typeof body.order === "number" ? body.order : undefined
  if (order === undefined || order === null) {
    order = projectChapters.reduce((max, c) => Math.max(max, c.order), -1) + 1
  }
  const t = now()
  const chapter: Chapter = {
    id: newId(),
    projectId,
    title,
    synopsis: "",
    order,
    status: "draft",
    notes: "",
    metadata: "{}",
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord("chapters", chapter)
  return { ...chapter, scenes: [] }
}

export async function updateChapter(id: string, body: Record<string, unknown>): Promise<unknown | null> {
  const chapter = await db.getById<Chapter>("chapters", id)
  if (!chapter) return null
  const updated: Chapter = {
    ...chapter,
    ...pick(body, ["title", "synopsis", "order", "status", "notes", "metadata"]),
    updatedAt: now(),
  }
  await db.putRecord("chapters", updated)
  const scenes = (await db.getAll<Scene>("scenes")).filter((s) => s.chapterId === id).sort((a, b) => a.order - b.order)
  return { ...updated, scenes }
}

export async function deleteChapter(id: string): Promise<boolean> {
  const chapter = await db.getById<Chapter>("chapters", id)
  if (!chapter) return false
  const [scenes, comments, versions] = await Promise.all([
    db.getAll<Scene>("scenes"),
    db.getAll<Comment>("comments"),
    db.getAll<ManuscriptVersion>("versions"),
  ])
  const chapterScenes = scenes.filter((s) => s.chapterId === id)
  const sceneIds = new Set(chapterScenes.map((s) => s.id))
  await db.bulkPut("scenes", scenes.filter((s) => s.chapterId !== id))
  await db.bulkPut("comments", comments.filter((c) => !(c.sceneId && sceneIds.has(c.sceneId))))
  await db.bulkPut("versions", versions.filter((v) => !(v.sceneId && sceneIds.has(v.sceneId))))
  await db.deleteRecord("chapters", id)
  return true
}

export async function listScenes(chapterId: string): Promise<Scene[]> {
  const scenes = await db.getAll<Scene>("scenes")
  return scenes.filter((s) => s.chapterId === chapterId).sort((a, b) => a.order - b.order)
}

export async function createScene(body: Record<string, unknown>): Promise<Scene> {
  const chapterId = String(body.chapterId ?? "")
  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!chapterId || !title) throw new ApiError("chapterId and title are required", 400)

  const scenes = await db.getAll<Scene>("scenes")
  const chapterScenes = scenes.filter((s) => s.chapterId === chapterId)
  let order = typeof body.order === "number" ? body.order : undefined
  if (order === undefined || order === null) {
    order = chapterScenes.reduce((max, s) => Math.max(max, s.order), -1) + 1
  }
  const t = now()
  const scene: Scene = {
    id: newId(),
    chapterId,
    title,
    content: "",
    order,
    status: "draft",
    povCharacterId: "",
    locationId: "",
    timeOfDay: "",
    notes: "",
    wordCount: 0,
    metadata: "{}",
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord("scenes", scene)
  return scene
}

export async function updateScene(id: string, body: Record<string, unknown>): Promise<Scene | null> {
  const scene = await db.getById<Scene>("scenes", id)
  if (!scene) return null

  let wordCount = typeof body.wordCount === "number" ? body.wordCount : undefined
  if (body.content !== undefined && wordCount === undefined) {
    wordCount = countWords(String(body.content))
  }

  const updated: Scene = {
    ...scene,
    ...pick(body, [
      "title",
      "content",
      "order",
      "status",
      "povCharacterId",
      "locationId",
      "timeOfDay",
      "notes",
      "metadata",
    ]),
    ...(wordCount !== undefined ? { wordCount } : {}),
    updatedAt: now(),
  }
  await db.putRecord("scenes", updated)

  // Auto-version: snapshot content, throttled to 1 per 5 minutes per scene
  if (body.content !== undefined) {
    try {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      const versions = await db.getAll<ManuscriptVersion>("versions")
      const lastAutosave = versions
        .filter((v) => v.sceneId === id && v.isAutosave && new Date(v.createdAt).getTime() >= fiveMinutesAgo)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]

      if (!lastAutosave) {
        const chapter = await db.getById<Chapter>("chapters", scene.chapterId)
        const version: ManuscriptVersion = {
          id: newId(),
          projectId: chapter?.projectId ?? "",
          sceneId: id,
          content: String(body.content),
          wordCount: wordCount ?? countWords(String(body.content)),
          label: "Autosave",
          isMilestone: false,
          isAutosave: true,
          snapshot: "{}",
          createdAt: now(),
        }
        await db.putRecord("versions", version)
      }
    } catch {
      // Never fail the scene update because versioning failed
    }
  }

  return updated
}

export async function deleteScene(id: string): Promise<boolean> {
  const scene = await db.getById<Scene>("scenes", id)
  if (!scene) return false
  const [comments, versions] = await Promise.all([
    db.getAll<Comment>("comments"),
    db.getAll<ManuscriptVersion>("versions"),
  ])
  await db.bulkPut("comments", comments.filter((c) => c.sceneId !== id))
  await db.bulkPut("versions", versions.filter((v) => v.sceneId !== id))
  await db.deleteRecord("scenes", id)
  return true
}

// ─────────────────────────────────────────────────────────────
// GENERIC PROJECT-SCOPED COLLECTIONS
// ─────────────────────────────────────────────────────────────

async function listByProject<T extends { projectId: string }>(store: db.StoreName, projectId: string, sortKey: string): Promise<T[]> {
  const all = await db.getAll<T>(store)
  return all
    .filter((x) => x.projectId === projectId)
    .sort((a, b) => (String((a as Record<string, unknown>)[sortKey]) < String((b as Record<string, unknown>)[sortKey]) ? -1 : 1))
}

export const listCharacters = (projectId: string) => listByProject<Character>("characters", projectId, "name")
export const listLocations = (projectId: string) => listByProject<Location>("locations", projectId, "name")
export const listStoryObjects = (projectId: string) => listByProject<StoryObject>("storyObjects", projectId, "name")
export const listWorldElements = (projectId: string) => listByProject<WorldElement>("worldElements", projectId, "name")
export const listTimelineEvents = (projectId: string) => listByProject<TimelineEvent>("timelineEvents", projectId, "date")
export const listNotes = (projectId: string) => listByProject<Note>("notes", projectId, "title")

export async function listRelationships(projectId: string): Promise<Relationship[]> {
  const all = await db.getAll<Relationship>("relationships")
  return all
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function createEntity<K extends string>(store: db.StoreName, body: Record<string, unknown>, required: K[], defaults: Record<string, unknown>): Promise<Record<string, unknown>> {
  for (const key of required) {
    const v = body[key]
    if (v === undefined || v === null || (typeof v === "string" && !String(v).trim())) {
      throw new ApiError(`${String(key)} is required`, 400)
    }
  }
  const t = now()
  const record = {
    id: newId(),
    ...defaults,
    ...body,
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord(store, record)
  return record
}

export async function updateEntity(store: db.StoreName, id: string, body: Record<string, unknown>, fields: string[]): Promise<Record<string, unknown> | null> {
  const existing = await db.getById<Record<string, unknown>>(store, id)
  if (!existing) return null
  const updated = {
    ...existing,
    ...pick(body, fields),
    updatedAt: now(),
  }
  await db.putRecord(store, updated)
  return updated
}

export async function deleteEntity(store: db.StoreName, id: string): Promise<boolean> {
  const existing = await db.getById<Record<string, unknown>>(store, id)
  if (!existing) return false
  if (store === "characters") {
    // Remove relationships that reference the deleted character
    const relationships = await db.getAll<Relationship>("relationships")
    await db.bulkPut("relationships", relationships.filter((r) => r.sourceId !== id && r.targetId !== id))
  }
  await db.deleteRecord(store, id)
  return true
}

// ─────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────

export async function listComments(params: { projectId?: string; sceneId?: string; chapterId?: string }): Promise<Comment[]> {
  const comments = await db.getAll<Comment>("comments")
  if (!params.projectId && !params.sceneId && !params.chapterId) {
    throw new ApiError("projectId, sceneId, or chapterId query parameter is required", 400)
  }

  let sceneIdsInChapter: Set<string> | null = null
  if (params.chapterId) {
    const scenes = (await db.getAll<Scene>("scenes")).filter((s) => s.chapterId === params.chapterId)
    sceneIdsInChapter = new Set(scenes.map((s) => s.id))
  }

  return comments
    .filter((c) => {
      if (params.projectId && c.projectId !== params.projectId) return false
      if (params.sceneId && c.sceneId !== params.sceneId) return false
      if (sceneIdsInChapter && !(c.sceneId && sceneIdsInChapter.has(c.sceneId))) return false
      return true
    })
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
}

export async function createComment(body: Record<string, unknown>): Promise<Comment> {
  const projectId = String(body.projectId ?? "")
  const content = typeof body.content === "string" ? body.content : ""
  if (!projectId || !content) throw new ApiError("projectId and content are required", 400)
  const t = now()
  const comment: Comment = {
    id: newId(),
    projectId,
    sceneId: body.sceneId ? String(body.sceneId) : null,
    content,
    resolved: false,
    position: String(body.position ?? "{}"),
    linkedType: String(body.linkedType ?? ""),
    linkedId: String(body.linkedId ?? ""),
    metadata: JSON.stringify({ author: String(body.author ?? "You") }),
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord("comments", comment)
  return comment
}

// ─────────────────────────────────────────────────────────────
// RELATIONSHIPS
// ─────────────────────────────────────────────────────────────

export async function createRelationship(body: Record<string, unknown>): Promise<Relationship> {
  const required = ["projectId", "sourceId", "sourceType", "targetId", "targetType", "type"]
  for (const key of required) {
    const v = body[key]
    if (v === undefined || v === null || (typeof v === "string" && !String(v).trim())) {
      throw new ApiError("projectId, sourceId, sourceType, targetId, targetType, and type are required", 400)
    }
  }
  const t = now()
  const relationship: Relationship = {
    id: newId(),
    projectId: String(body.projectId),
    sourceId: String(body.sourceId),
    sourceType: String(body.sourceType),
    targetId: String(body.targetId),
    targetType: String(body.targetType),
    type: String(body.type),
    description: String(body.description ?? ""),
    strength: Number(body.strength ?? 0),
    tags: String(body.tags ?? "[]"),
    metadata: String(body.metadata ?? "{}"),
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord("relationships", relationship)
  return relationship
}

// ─────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────

export async function listGoals(projectId: string): Promise<WritingGoal[]> {
  const goals = await db.getAll<WritingGoal>("goals")
  return goals
    .filter((g) => g.projectId === projectId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function upsertGoal(body: Record<string, unknown>): Promise<WritingGoal> {
  const projectId = String(body.projectId ?? "")
  const type = typeof body.type === "string" ? body.type : ""
  if (!projectId || !type) throw new ApiError("projectId and type are required", 400)

  const goals = await db.getAll<WritingGoal>("goals")
  const existing = goals.find((g) => g.projectId === projectId && g.type === type && g.active)

  if (existing) {
    const updated: WritingGoal = {
      ...existing,
      ...(body.target !== undefined ? { target: Number(body.target) } : {}),
      ...(body.current !== undefined ? { current: Number(body.current) } : {}),
      ...(body.deadline !== undefined ? { deadline: String(body.deadline) } : {}),
      ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      updatedAt: now(),
    }
    await db.putRecord("goals", updated)
    return updated
  }

  const t = now()
  const goal: WritingGoal = {
    id: newId(),
    projectId,
    type,
    target: Number(body.target ?? 0),
    current: Number(body.current ?? 0),
    deadline: String(body.deadline ?? ""),
    active: body.active === undefined ? true : Boolean(body.active),
    metadata: String(body.metadata ?? "{}"),
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord("goals", goal)
  return goal
}

// ─────────────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────────────

export async function listSessions(projectId: string): Promise<WritingSession[]> {
  const sessions = await db.getAll<WritingSession>("sessions")
  return sessions
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function createSession(body: Record<string, unknown>): Promise<WritingSession> {
  const projectId = String(body.projectId ?? "")
  if (!projectId) throw new ApiError("projectId is required", 400)
  const session: WritingSession = {
    id: newId(),
    projectId,
    wordsWritten: Number(body.wordsWritten ?? 0),
    duration: Number(body.duration ?? 0),
    date: String(body.date ?? new Date().toISOString().split("T")[0]),
    metadata: String(body.metadata ?? "{}"),
    createdAt: now(),
  }
  await db.putRecord("sessions", session)
  return session
}

// ─────────────────────────────────────────────────────────────
// VERSIONS
// ─────────────────────────────────────────────────────────────

export async function listVersions(projectId: string, sceneId?: string): Promise<ManuscriptVersion[]> {
  const versions = await db.getAll<ManuscriptVersion>("versions")
  return versions
    .filter((v) => v.projectId === projectId && (!sceneId || v.sceneId === sceneId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function createVersion(body: Record<string, unknown>): Promise<ManuscriptVersion> {
  const projectId = String(body.projectId ?? "")
  if (!projectId) throw new ApiError("projectId is required", 400)
  const content = String(body.content ?? "")
  const version: ManuscriptVersion = {
    id: newId(),
    projectId,
    sceneId: body.sceneId ? String(body.sceneId) : null,
    content,
    wordCount: content ? countWords(content) : 0,
    label: String(body.label ?? ""),
    isMilestone: Boolean(body.isMilestone ?? false),
    isAutosave: Boolean(body.isAutosave ?? true),
    snapshot: String(body.snapshot ?? "{}"),
    createdAt: now(),
  }
  await db.putRecord("versions", version)
  return version
}

// ─────────────────────────────────────────────────────────────
// AGENT TASKS
// ─────────────────────────────────────────────────────────────

export async function listAgentTasks(projectId?: string): Promise<AgentTask[]> {
  const tasks = await db.getAll<AgentTask>("agentTasks")
  return tasks
    .filter((t) => !projectId || t.projectId === projectId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getAgentTask(id: string): Promise<Record<string, unknown> | null> {
  const task = await db.getById<AgentTask>("agentTasks", id)
  if (!task) return null
  return {
    ...task,
    plan: JSON.parse(task.plan || "[]"),
    toolCalls: JSON.parse(task.toolCalls || "[]"),
    observations: JSON.parse(task.observations || "[]"),
    errors: JSON.parse(task.errors || "[]"),
    artifacts: JSON.parse(task.artifacts || "[]"),
  }
}

export async function createAgentTask(body: Record<string, unknown>): Promise<AgentTask> {
  const goal = typeof body.goal === "string" ? body.goal.trim() : ""
  if (!goal) throw new ApiError("goal is required", 400)
  const t = now()
  const task: AgentTask = {
    id: newId(),
    projectId: String(body.projectId ?? ""),
    goal,
    status: "pending",
    plan: "[]",
    currentStep: 0,
    permission: String(body.permission ?? "suggest"),
    toolCalls: "[]",
    observations: "[]",
    errors: "[]",
    artifacts: "[]",
    result: "",
    metadata: "{}",
    createdAt: t,
    updatedAt: t,
  }
  await db.putRecord("agentTasks", task)
  return task
}

export async function updateAgentTask(id: string, body: Record<string, unknown>): Promise<AgentTask | null> {
  const task = await db.getById<AgentTask>("agentTasks", id)
  if (!task) return null
  const updated: AgentTask = {
    ...task,
    ...pick(body, [
      "goal",
      "status",
      "plan",
      "currentStep",
      "permission",
      "toolCalls",
      "observations",
      "errors",
      "artifacts",
      "result",
      "metadata",
    ]),
    updatedAt: now(),
  }
  await db.putRecord("agentTasks", updated)
  return updated
}

// ─────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────

export async function searchProject(projectId: string, q: string): Promise<unknown> {
  const term = q.trim().toLowerCase()
  const [characters, locations, notes, scenes, worldElements, storyObjects] = await Promise.all([
    db.getAll<Character>("characters"),
    db.getAll<Location>("locations"),
    db.getAll<Note>("notes"),
    db.getAll<Scene>("scenes"),
    db.getAll<WorldElement>("worldElements"),
    db.getAll<StoryObject>("storyObjects"),
  ])
  const chapters = await db.getAll<Chapter>("chapters")
  const chapterById = new Map(chapters.map((c) => [c.id, c]))

  const contains = (value: unknown) => typeof value === "string" && value.toLowerCase().includes(term)
  const inProject = (id: string) => (chapterById.get(id)?.projectId ?? "") === projectId

  return {
    characters: characters
      .filter((c) => c.projectId === projectId && (contains(c.name) || contains(c.description) || contains(c.role) || contains(c.backstory)))
      .slice(0, 20),
    locations: locations
      .filter((l) => l.projectId === projectId && (contains(l.name) || contains(l.description) || contains(l.type)))
      .slice(0, 20),
    notes: notes
      .filter((n) => n.projectId === projectId && (contains(n.title) || contains(n.content)))
      .slice(0, 20),
    scenes: scenes
      .filter((s) => inProject(s.chapterId) && (contains(s.title) || contains(s.content) || contains(s.notes)))
      .slice(0, 20)
      .map((s) => {
        const chapter = chapterById.get(s.chapterId)
        return { ...s, chapter: chapter ? { id: chapter.id, title: chapter.title } : null }
      }),
    worldElements: worldElements
      .filter((w) => w.projectId === projectId && (contains(w.name) || contains(w.description) || contains(w.category)))
      .slice(0, 20),
    storyObjects: storyObjects
      .filter((o) => o.projectId === projectId && (contains(o.name) || contains(o.description)))
      .slice(0, 20),
  }
}

// ─────────────────────────────────────────────────────────────
// BACKUPS
// ─────────────────────────────────────────────────────────────

async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function collectBackupData(projectId: string) {
  const [project, chapters, characters, locations, storyObjects, worldElements, timelineEvents, relationships, notes] = await Promise.all([
    db.getById<Project>("projects", projectId),
    db.getAll<Chapter>("chapters"),
    db.getAll<Character>("characters"),
    db.getAll<Location>("locations"),
    db.getAll<StoryObject>("storyObjects"),
    db.getAll<WorldElement>("worldElements"),
    db.getAll<TimelineEvent>("timelineEvents"),
    db.getAll<Relationship>("relationships"),
    db.getAll<Note>("notes"),
  ])
  if (!project) return null
  const scenes = await db.getAll<Scene>("scenes")

  const projectChapters = chapters
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      ...c,
      scenes: scenes.filter((s) => s.chapterId === c.id).sort((a, b) => a.order - b.order),
    }))

  let totalWords = 0
  for (const chapter of projectChapters) {
    for (const scene of chapter.scenes) totalWords += scene.wordCount
  }

  return {
    version: "1.0",
    type: "open-writer-backup",
    exportedAt: new Date().toISOString(),
    metadata: {
      totalWords,
      chapterCount: projectChapters.length,
      characterCount: characters.filter((c) => c.projectId === projectId).length,
    },
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      genre: project.genre,
      synopsis: project.synopsis,
      status: project.status,
      settings: project.settings,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    chapters: projectChapters,
    characters: characters.filter((c) => c.projectId === projectId),
    locations: locations.filter((l) => l.projectId === projectId),
    storyObjects: storyObjects.filter((o) => o.projectId === projectId),
    worldElements: worldElements.filter((w) => w.projectId === projectId),
    timelineEvents: timelineEvents.filter((e) => e.projectId === projectId),
    relationships: relationships.filter((r) => r.projectId === projectId),
    notes: notes.filter((n) => n.projectId === projectId),
  }
}

export async function createBackup(projectId: string): Promise<Record<string, unknown>> {
  const backupData = await collectBackupData(projectId)
  if (!backupData) throw new ApiError("Project not found", 404)

  const backupJson = JSON.stringify(backupData)
  const checksum = await computeSha256(backupJson)
  const sizeBytes = new TextEncoder().encode(backupJson).length

  const version: ManuscriptVersion = {
    id: newId(),
    projectId,
    sceneId: null,
    content: backupJson,
    wordCount: backupData.metadata.totalWords,
    label: `Backup ${new Date().toISOString()}`,
    isMilestone: true,
    isAutosave: false,
    snapshot: JSON.stringify({
      checksum,
      timestamp: backupData.exportedAt,
      version: backupData.version,
      totalWords: backupData.metadata.totalWords,
      chapterCount: backupData.metadata.chapterCount,
      characterCount: backupData.metadata.characterCount,
      sizeBytes,
    }),
    createdAt: now(),
  }
  await db.putRecord("versions", version)

  return {
    id: version.id,
    checksum,
    timestamp: backupData.exportedAt,
    totalWords: backupData.metadata.totalWords,
    sizeBytes,
    data: backupData,
  }
}

export async function listBackups(projectId: string): Promise<unknown[]> {
  const versions = await db.getAll<ManuscriptVersion>("versions")
  return versions
    .filter((v) => v.projectId === projectId && v.label.startsWith("Backup"))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((b) => {
      let snapshot: Record<string, unknown> = {}
      try {
        snapshot = JSON.parse(b.snapshot)
      } catch {
        // ignore
      }
      return {
        id: b.id,
        label: b.label,
        wordCount: b.wordCount,
        createdAt: b.createdAt,
        checksum: snapshot.checksum ?? "",
        timestamp: snapshot.timestamp ?? "",
        sizeBytes: snapshot.sizeBytes ?? 0,
        chapterCount: snapshot.chapterCount ?? 0,
        characterCount: snapshot.characterCount ?? 0,
      }
    })
}

export async function getBackup(id: string): Promise<Record<string, unknown> | null> {
  const backup = await db.getById<ManuscriptVersion>("versions", id)
  if (!backup || !backup.label.startsWith("Backup")) return null
  let snapshot: Record<string, unknown> = {}
  let backupData: unknown = null
  try {
    snapshot = JSON.parse(backup.snapshot)
  } catch {
    // ignore
  }
  try {
    backupData = JSON.parse(backup.content)
  } catch {
    // ignore
  }
  return {
    id: backup.id,
    label: backup.label,
    wordCount: backup.wordCount,
    createdAt: backup.createdAt,
    checksum: snapshot.checksum ?? "",
    timestamp: snapshot.timestamp ?? "",
    sizeBytes: snapshot.sizeBytes ?? 0,
    data: backupData,
  }
}

interface BackupData {
  project?: Record<string, unknown>
  chapters?: Array<Record<string, unknown>>
  characters?: Array<Record<string, unknown>>
  locations?: Array<Record<string, unknown>>
  storyObjects?: Array<Record<string, unknown>>
  worldElements?: Array<Record<string, unknown>>
  timelineEvents?: Array<Record<string, unknown>>
  relationships?: Array<Record<string, unknown>>
  notes?: Array<Record<string, unknown>>
}

export async function restoreBackup(id: string, confirm: boolean): Promise<boolean> {
  if (!confirm) {
    throw new ApiError("Confirmation required. Send { confirm: true } to restore.", 400)
  }
  const backup = await db.getById<ManuscriptVersion>("versions", id)
  if (!backup || !backup.label.startsWith("Backup")) throw new ApiError("Backup not found", 404)

  let backupData: BackupData
  try {
    backupData = JSON.parse(backup.content)
  } catch {
    throw new ApiError("Backup data is corrupted and cannot be restored.", 400)
  }

  // Verify checksum
  let snapshot: Record<string, unknown> = {}
  try {
    snapshot = JSON.parse(backup.snapshot)
  } catch {
    // ignore
  }
  const storedChecksum = snapshot.checksum
  if (typeof storedChecksum === "string" && storedChecksum) {
    const computed = await computeSha256(backup.content)
    if (computed !== storedChecksum) {
      throw new ApiError("Backup checksum verification failed. The data may be corrupted.", 400)
    }
  }

  const projectId = backup.projectId

  // Wipe existing project data (mirrors the old transaction order)
  const [relationships, notes, comments, timelineEvents, worldElements, storyObjects, locations, characters, versions, sessions, goals, tasks, scenes, chapters] = await Promise.all([
    db.getAll<Relationship>("relationships"),
    db.getAll<Note>("notes"),
    db.getAll<Comment>("comments"),
    db.getAll<TimelineEvent>("timelineEvents"),
    db.getAll<WorldElement>("worldElements"),
    db.getAll<StoryObject>("storyObjects"),
    db.getAll<Location>("locations"),
    db.getAll<Character>("characters"),
    db.getAll<ManuscriptVersion>("versions"),
    db.getAll<WritingSession>("sessions"),
    db.getAll<WritingGoal>("goals"),
    db.getAll<AgentTask>("agentTasks"),
    db.getAll<Scene>("scenes"),
    db.getAll<Chapter>("chapters"),
  ])
  const chapterIds = new Set(chapters.filter((c) => c.projectId === projectId).map((c) => c.id))

  await db.bulkPut("relationships", relationships.filter((r) => r.projectId !== projectId))
  await db.bulkPut("notes", notes.filter((n) => n.projectId !== projectId))
  await db.bulkPut("comments", comments.filter((c) => c.projectId !== projectId))
  await db.bulkPut("timelineEvents", timelineEvents.filter((e) => e.projectId !== projectId))
  await db.bulkPut("worldElements", worldElements.filter((w) => w.projectId !== projectId))
  await db.bulkPut("storyObjects", storyObjects.filter((o) => o.projectId !== projectId))
  await db.bulkPut("locations", locations.filter((l) => l.projectId !== projectId))
  await db.bulkPut("characters", characters.filter((c) => c.projectId !== projectId))
  await db.bulkPut("versions", versions.filter((v) => v.projectId !== projectId || v.id === id))
  await db.bulkPut("sessions", sessions.filter((s) => s.projectId !== projectId))
  await db.bulkPut("goals", goals.filter((g) => g.projectId !== projectId))
  await db.bulkPut("agentTasks", tasks.filter((t) => t.projectId !== projectId))
  await db.bulkPut("scenes", scenes.filter((s) => !chapterIds.has(s.chapterId)))
  await db.bulkPut("chapters", chapters.filter((c) => c.projectId !== projectId))

  const str = (v: unknown) => (v === undefined || v === null ? "" : String(v))
  const num = (v: unknown, fallback = 0) => (v === undefined || v === null ? fallback : Number(v))
  const bool = (v: unknown, fallback = false) => (v === undefined || v === null ? fallback : Boolean(v))

  const createMany = async <T extends { id: string }>(store: db.StoreName, rows: unknown[] | undefined, fields: Record<string, (row: Record<string, unknown>) => unknown>): Promise<void> => {
    if (!Array.isArray(rows)) return
    const t = now()
    const records: T[] = []
    for (const raw of rows) {
      const row = raw as Record<string, unknown>
      const record = {
        id: typeof row.id === "string" ? row.id : newId(),
        projectId,
        createdAt: str(row.createdAt) || t,
        updatedAt: str(row.updatedAt) || t,
        ...Object.fromEntries(Object.entries(fields).map(([k, fn]) => [k, fn(row)])),
      } as unknown as T
      records.push(record)
    }
    await db.bulkPut(store, records)
  }

  await createMany<Character>("characters", backupData.characters, {
    name: (r) => str(r.name),
    description: (r) => str(r.description),
    role: (r) => str(r.role),
    age: (r) => str(r.age),
    occupation: (r) => str(r.occupation),
    personality: (r) => str(r.personality),
    appearance: (r) => str(r.appearance),
    backstory: (r) => str(r.backstory),
    motivation: (r) => str(r.motivation),
    goals: (r) => str(r.goals),
    fears: (r) => str(r.fears),
    tags: (r) => str(r.tags) || "[]",
    metadata: (r) => str(r.metadata) || "{}",
  })
  await createMany<Location>("locations", backupData.locations, {
    name: (r) => str(r.name),
    description: (r) => str(r.description),
    type: (r) => str(r.type),
    atmosphere: (r) => str(r.atmosphere),
    history: (r) => str(r.history),
    features: (r) => str(r.features),
    parentLocationId: (r) => str(r.parentLocationId),
    tags: (r) => str(r.tags) || "[]",
    metadata: (r) => str(r.metadata) || "{}",
  })
  await createMany<StoryObject>("storyObjects", backupData.storyObjects, {
    name: (r) => str(r.name),
    description: (r) => str(r.description),
    type: (r) => str(r.type),
    owner: (r) => str(r.owner),
    location: (r) => str(r.location),
    history: (r) => str(r.history),
    appearance: (r) => str(r.appearance),
    significance: (r) => str(r.significance),
    tags: (r) => str(r.tags) || "[]",
    metadata: (r) => str(r.metadata) || "{}",
  })
  await createMany<WorldElement>("worldElements", backupData.worldElements, {
    name: (r) => str(r.name),
    description: (r) => str(r.description),
    category: (r) => str(r.category),
    parent: (r) => str(r.parent),
    rules: (r) => str(r.rules),
    history: (r) => str(r.history),
    tags: (r) => str(r.tags) || "[]",
    metadata: (r) => str(r.metadata) || "{}",
  })
  await createMany<TimelineEvent>("timelineEvents", backupData.timelineEvents, {
    title: (r) => str(r.title),
    description: (r) => str(r.description),
    date: (r) => str(r.date),
    time: (r) => str(r.time),
    duration: (r) => str(r.duration),
    location: (r) => str(r.location),
    characters: (r) => str(r.characters) || "[]",
    objects: (r) => str(r.objects) || "[]",
    sourceScene: (r) => str(r.sourceScene),
    cause: (r) => str(r.cause),
    consequence: (r) => str(r.consequence),
    eventType: (r) => str(r.eventType),
    tags: (r) => str(r.tags) || "[]",
    metadata: (r) => str(r.metadata) || "{}",
  })

  if (Array.isArray(backupData.chapters)) {
    const restoredScenes: Scene[] = []
    for (let i = 0; i < backupData.chapters.length; i++) {
      const ch = backupData.chapters[i] as Record<string, unknown>
      if (!ch.title) continue
      const chapterId = typeof ch.id === "string" ? ch.id : newId()
      const chapter: Chapter = {
        id: chapterId,
        projectId,
        title: str(ch.title),
        synopsis: str(ch.synopsis),
        order: num(ch.order, i),
        status: str(ch.status) || "draft",
        notes: str(ch.notes),
        metadata: str(ch.metadata) || "{}",
        createdAt: str(ch.createdAt) || now(),
        updatedAt: str(ch.updatedAt) || now(),
      }
      await db.putRecord("chapters", chapter)
      if (Array.isArray(ch.scenes)) {
        for (let j = 0; j < ch.scenes.length; j++) {
          const sc = ch.scenes[j] as Record<string, unknown>
          if (!sc.title) continue
          const content = str(sc.content)
          restoredScenes.push({
            id: typeof sc.id === "string" ? sc.id : newId(),
            chapterId,
            title: str(sc.title),
            content,
            order: num(sc.order, j),
            status: str(sc.status) || "draft",
            povCharacterId: str(sc.povCharacterId),
            locationId: str(sc.locationId),
            timeOfDay: str(sc.timeOfDay),
            notes: str(sc.notes),
            wordCount: content.split(/\s+/).filter(Boolean).length,
            metadata: str(sc.metadata) || "{}",
            createdAt: str(sc.createdAt) || now(),
            updatedAt: str(sc.updatedAt) || now(),
          })
        }
      }
    }
    await db.bulkPut("scenes", restoredScenes)
  }

  await createMany<Note>("notes", backupData.notes, {
    title: (r) => str(r.title),
    content: (r) => str(r.content),
    category: (r) => str(r.category) || "general",
    linkedType: (r) => str(r.linkedType),
    linkedId: (r) => str(r.linkedId),
    priority: (r) => num(r.priority),
    resolved: (r) => bool(r.resolved),
    tags: (r) => str(r.tags) || "[]",
    metadata: (r) => str(r.metadata) || "{}",
  })
  await createMany<Relationship>("relationships", backupData.relationships, {
    sourceId: (r) => str(r.sourceId),
    sourceType: (r) => str(r.sourceType),
    targetId: (r) => str(r.targetId),
    targetType: (r) => str(r.targetType),
    type: (r) => str(r.type),
    description: (r) => str(r.description),
    strength: (r) => num(r.strength),
    tags: (r) => str(r.tags) || "[]",
    metadata: (r) => str(r.metadata) || "{}",
  })

  return true
}

export async function deleteBackup(id: string): Promise<boolean> {
  const backup = await db.getById<ManuscriptVersion>("versions", id)
  if (!backup || !backup.label.startsWith("Backup")) return false
  await db.deleteRecord("versions", id)
  return true
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export type StoreName = db.StoreName

export const getById = <T>(store: StoreName, id: string) => db.getById<T>(store, id)

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORT HELPERS
// ─────────────────────────────────────────────────────────────

export const dbGetProject = (id: string) => db.getById<Project>("projects", id)

export function dbGetAllChaptersAndScenes(): Promise<[Chapter[], Scene[]]> {
  return Promise.all([db.getAll<Chapter>("chapters"), db.getAll<Scene>("scenes")])
}

export async function dbGetAllForProject<T extends { projectId: string }>(store: db.StoreName, projectId: string): Promise<T[]> {
  const all = await db.getAll<T>(store)
  return all.filter((x) => x.projectId === projectId)
}
