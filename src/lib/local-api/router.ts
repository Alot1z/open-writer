/**
 * Client-side API router.
 *
 * The whole Open Writer UI talks to the server through
 * `fetch('/api/...')`. On GitHub Pages there is no server, so this
 * module intercepts those requests and serves them from the
 * browser-local IndexedDB data layer with identical semantics
 * (status codes, JSON error bodies, blob downloads).
 *
 * Installed once by <LocalApiBootstrap/> at module scope, before any
 * component effect runs.
 */

import * as s from "./services"
import { ApiError } from "./services"
import * as exports from "./exports"
import * as imports from "./imports"
import { chatWithAI } from "./ai"

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const error = (message: string, status: number): Response => json({ error: message }, status)

const blobResponse = (blob: Blob): Response => new Response(blob, { status: 200 })

type Handler = (ctx: Ctx) => Promise<Response>

interface Ctx {
  method: string
  params: URLSearchParams
  body: Record<string, unknown>
  segments: string[]
  pathParams: Record<string, string>
}

const COLLECTION_FIELDS: Record<string, string[]> = {
  characters: ["name", "description", "role", "age", "occupation", "personality", "appearance", "backstory", "motivation", "goals", "fears", "tags", "metadata"],
  locations: ["name", "description", "type", "atmosphere", "history", "features", "parentLocationId", "tags", "metadata"],
  storyObjects: ["name", "description", "type", "owner", "location", "history", "appearance", "significance", "tags", "metadata"],
  worldElements: ["name", "description", "category", "parent", "rules", "history", "tags", "metadata"],
  timelineEvents: ["title", "description", "date", "time", "duration", "location", "characters", "objects", "sourceScene", "cause", "consequence", "eventType", "tags", "metadata"],
  notes: ["title", "content", "category", "linkedType", "linkedId", "priority", "resolved", "tags", "metadata"],
}

const STORE_BY_COLLECTION: Record<string, s.StoreName> = {
  characters: "characters",
  locations: "locations",
  storyObjects: "storyObjects",
  worldElements: "worldElements",
  timelineEvents: "timelineEvents",
  notes: "notes",
}

const DEFAULT_ENTITY_FIELDS: Record<string, Record<string, unknown>> = {
  characters: { name: "", description: "", role: "", age: "", occupation: "", personality: "", appearance: "", backstory: "", motivation: "", goals: "", fears: "", tags: "[]", metadata: "{}" },
  locations: { name: "", description: "", type: "", atmosphere: "", history: "", features: "", parentLocationId: "", tags: "[]", metadata: "{}" },
  storyObjects: { name: "", description: "", type: "", owner: "", location: "", history: "", appearance: "", significance: "", tags: "[]", metadata: "{}" },
  worldElements: { name: "", description: "", category: "", parent: "", rules: "", history: "", tags: "[]", metadata: "{}" },
  timelineEvents: { title: "", description: "", date: "", time: "", duration: "", location: "", characters: "[]", objects: "[]", sourceScene: "", cause: "", consequence: "", eventType: "", tags: "[]", metadata: "{}" },
  notes: { title: "", content: "", category: "general", linkedType: "", linkedId: "", priority: 0, resolved: false, tags: "[]", metadata: "{}" },
}

function collectionHandler(collection: keyof typeof STORE_BY_COLLECTION): Handler {
  const store = STORE_BY_COLLECTION[collection]
  return async (ctx) => {
    const projectId = ctx.params.get("projectId")
    if (!projectId) return error(`${collection} require a projectId query parameter`, 400)
    const LIST_FNS: Record<string, (pid: string) => Promise<unknown[]>> = {
      characters: s.listCharacters,
      locations: s.listLocations,
      storyObjects: s.listStoryObjects,
      worldElements: s.listWorldElements,
      timelineEvents: s.listTimelineEvents,
      notes: s.listNotes,
    }
    return json(await LIST_FNS[collection](projectId))
  }
}

function collectionCreateHandler(collection: keyof typeof STORE_BY_COLLECTION): Handler {
  const store = STORE_BY_COLLECTION[collection]
  const defaults = DEFAULT_ENTITY_FIELDS[collection]
  const requiredKey = collection === "notes" ? "title" : collection === "timelineEvents" ? "title" : "name"
  return async (ctx) => {
    const projectId = String(ctx.body.projectId ?? "")
    if (!projectId) return error("projectId is required", 400)
    const record = await s.createEntity(store, ctx.body, [requiredKey], defaults)
    return json(record, 201)
  }
}

function collectionGetHandler(collection: keyof typeof STORE_BY_COLLECTION): Handler {
  const store = STORE_BY_COLLECTION[collection]
  return async (ctx) => {
    const record = await s.getById(store, ctx.pathParams.id)
    if (!record) return error(`${collection} not found`, 404)
    return json(record)
  }
}

function collectionUpdateHandler(collection: keyof typeof STORE_BY_COLLECTION): Handler {
  const store = STORE_BY_COLLECTION[collection]
  const fields = COLLECTION_FIELDS[collection]
  return async (ctx) => {
    const record = await s.updateEntity(store, ctx.pathParams.id, ctx.body, fields)
    if (!record) return error(`${collection} not found`, 404)
    return json(record)
  }
}

function collectionDeleteHandler(collection: keyof typeof STORE_BY_COLLECTION): Handler {
  const store = STORE_BY_COLLECTION[collection]
  return async (ctx) => {
    const ok = await s.deleteEntity(store, ctx.pathParams.id)
    if (!ok) return error(`${collection} not found`, 404)
    return json({ success: true })
  }
}

const EXPORT_BUILDERS: Record<string, (book: exports.ProjectBook) => Promise<Blob> | Blob> = {
  markdown: (book) => new Blob([exports.buildMarkdown(book)], { type: "text/markdown; charset=utf-8" }),
  txt: (book) => new Blob([exports.buildTxt(book)], { type: "text/plain; charset=utf-8" }),
  html: (book) => new Blob([exports.buildHtml(book)], { type: "text/html; charset=utf-8" }),
  json: (book) => exports.buildJson(book).then((str) => new Blob([str], { type: "application/json; charset=utf-8" })),
  docx: (book) => exports.buildDocx(book),
  epub: (book) => exports.buildEpub(book),
}

const routes: { pattern: string; handler: Handler }[] = [
  { pattern: "GET /api", handler: async () => json({ message: "Hello, world!" }) },

  // Projects
  { pattern: "GET /api/projects", handler: async () => json(await s.listProjects()) },
  { pattern: "POST /api/projects", handler: async (ctx) => json(await s.createProject(ctx.body), 201) },
  { pattern: "GET /api/projects/:id", handler: async (ctx) => {
      const project = await s.getProject(ctx.pathParams.id)
      if (!project) return error("Project not found", 404)
      return json(project)
    } },
  { pattern: "PUT /api/projects/:id", handler: async (ctx) => {
      const project = await s.updateProject(ctx.pathParams.id, ctx.body)
      if (!project) return error("Project not found", 404)
      return json(project)
    } },
  { pattern: "DELETE /api/projects/:id", handler: async (ctx) => {
      const ok = await s.deleteProject(ctx.pathParams.id)
      if (!ok) return error("Project not found", 404)
      return json({ success: true })
    } },

  // Chapters
  { pattern: "GET /api/chapters", handler: async (ctx) => {
      const projectId = ctx.params.get("projectId")
      if (!projectId) return error("projectId query parameter is required", 400)
      return json(await s.listChapters(projectId))
    } },
  { pattern: "POST /api/chapters", handler: async (ctx) => json(await s.createChapter(ctx.body), 201) },
  { pattern: "GET /api/chapters/:id", handler: async (ctx) => {
      const chapter = await s.getChapter(ctx.pathParams.id)
      if (!chapter) return error("Chapter not found", 404)
      return json(chapter)
    } },
  { pattern: "PUT /api/chapters/:id", handler: async (ctx) => {
      const chapter = await s.updateChapter(ctx.pathParams.id, ctx.body)
      if (!chapter) return error("Chapter not found", 404)
      return json(chapter)
    } },
  { pattern: "DELETE /api/chapters/:id", handler: async (ctx) => {
      const ok = await s.deleteChapter(ctx.pathParams.id)
      if (!ok) return error("Chapter not found", 404)
      return json({ success: true })
    } },

  // Scenes
  { pattern: "GET /api/scenes", handler: async (ctx) => {
      const chapterId = ctx.params.get("chapterId")
      if (!chapterId) return error("chapterId query parameter is required", 400)
      return json(await s.listScenes(chapterId))
    } },
  { pattern: "POST /api/scenes", handler: async (ctx) => json(await s.createScene(ctx.body), 201) },
  { pattern: "GET /api/scenes/:id", handler: async (ctx) => {
      const scene = await s.getById("scenes", ctx.pathParams.id)
      if (!scene) return error("Scene not found", 404)
      return json(scene)
    } },
  { pattern: "PUT /api/scenes/:id", handler: async (ctx) => {
      const scene = await s.updateScene(ctx.pathParams.id, ctx.body)
      if (!scene) return error("Scene not found", 404)
      return json(scene)
    } },
  { pattern: "DELETE /api/scenes/:id", handler: async (ctx) => {
      const ok = await s.deleteScene(ctx.pathParams.id)
      if (!ok) return error("Scene not found", 404)
      return json({ success: true })
    } },

  // Story entity collections
  { pattern: "GET /api/characters", handler: collectionHandler("characters") },
  { pattern: "POST /api/characters", handler: collectionCreateHandler("characters") },
  { pattern: "GET /api/characters/:id", handler: collectionGetHandler("characters") },
  { pattern: "PUT /api/characters/:id", handler: collectionUpdateHandler("characters") },
  { pattern: "DELETE /api/characters/:id", handler: collectionDeleteHandler("characters") },

  { pattern: "GET /api/locations", handler: collectionHandler("locations") },
  { pattern: "POST /api/locations", handler: collectionCreateHandler("locations") },
  { pattern: "GET /api/locations/:id", handler: collectionGetHandler("locations") },
  { pattern: "PUT /api/locations/:id", handler: collectionUpdateHandler("locations") },
  { pattern: "DELETE /api/locations/:id", handler: collectionDeleteHandler("locations") },

  { pattern: "GET /api/objects", handler: collectionHandler("storyObjects") },
  { pattern: "POST /api/objects", handler: collectionCreateHandler("storyObjects") },
  { pattern: "GET /api/objects/:id", handler: collectionGetHandler("storyObjects") },
  { pattern: "PUT /api/objects/:id", handler: collectionUpdateHandler("storyObjects") },
  { pattern: "DELETE /api/objects/:id", handler: collectionDeleteHandler("storyObjects") },

  { pattern: "GET /api/world", handler: collectionHandler("worldElements") },
  { pattern: "POST /api/world", handler: collectionCreateHandler("worldElements") },
  { pattern: "GET /api/world/:id", handler: collectionGetHandler("worldElements") },
  { pattern: "PUT /api/world/:id", handler: collectionUpdateHandler("worldElements") },
  { pattern: "DELETE /api/world/:id", handler: collectionDeleteHandler("worldElements") },

  { pattern: "GET /api/timeline", handler: collectionHandler("timelineEvents") },
  { pattern: "POST /api/timeline", handler: collectionCreateHandler("timelineEvents") },
  { pattern: "GET /api/timeline/:id", handler: collectionGetHandler("timelineEvents") },
  { pattern: "PUT /api/timeline/:id", handler: collectionUpdateHandler("timelineEvents") },
  { pattern: "DELETE /api/timeline/:id", handler: collectionDeleteHandler("timelineEvents") },

  { pattern: "GET /api/notes", handler: collectionHandler("notes") },
  { pattern: "POST /api/notes", handler: collectionCreateHandler("notes") },
  { pattern: "GET /api/notes/:id", handler: collectionGetHandler("notes") },
  { pattern: "PUT /api/notes/:id", handler: collectionUpdateHandler("notes") },
  { pattern: "DELETE /api/notes/:id", handler: collectionDeleteHandler("notes") },

  // Comments
  { pattern: "GET /api/comments", handler: async (ctx) =>
      json(await s.listComments({
        projectId: ctx.params.get("projectId") ?? undefined,
        sceneId: ctx.params.get("sceneId") ?? undefined,
        chapterId: ctx.params.get("chapterId") ?? undefined,
      })) },
  { pattern: "POST /api/comments", handler: async (ctx) => json(await s.createComment(ctx.body), 201) },
  { pattern: "PUT /api/comments/:id", handler: async (ctx) => {
      const record = await s.updateEntity("comments", ctx.pathParams.id, ctx.body, ["content", "resolved", "position", "linkedType", "linkedId", "metadata"])
      if (!record) return error("Comment not found", 404)
      return json(record)
    } },
  { pattern: "DELETE /api/comments/:id", handler: async (ctx) => {
      const ok = await s.deleteEntity("comments", ctx.pathParams.id)
      if (!ok) return error("Comment not found", 404)
      return json({ success: true })
    } },

  // Relationships
  { pattern: "GET /api/relationships", handler: async (ctx) => {
      const projectId = ctx.params.get("projectId")
      if (!projectId) return error("projectId query parameter is required", 400)
      return json(await s.listRelationships(projectId))
    } },
  { pattern: "POST /api/relationships", handler: async (ctx) => json(await s.createRelationship(ctx.body), 201) },
  { pattern: "DELETE /api/relationships/:id", handler: async (ctx) => {
      const ok = await s.deleteRelationship(ctx.pathParams.id)
      if (!ok) return error("Relationship not found", 404)
      return json({ success: true })
    } },

  // Goals
  { pattern: "GET /api/goals", handler: async (ctx) => {
      const projectId = ctx.params.get("projectId")
      if (!projectId) return error("projectId query parameter is required", 400)
      return json(await s.listGoals(projectId))
    } },
  { pattern: "POST /api/goals", handler: async (ctx) => json(await s.upsertGoal(ctx.body), 201) },
  { pattern: "GET /api/goals/:id", handler: async (ctx) => {
      const goal = await s.getById("goals", ctx.pathParams.id)
      if (!goal) return error("Goal not found", 404)
      return json(goal)
    } },
  { pattern: "PUT /api/goals/:id", handler: async (ctx) => {
      const goal = await s.updateEntity("goals", ctx.pathParams.id, ctx.body, ["type", "target", "current", "deadline", "active", "metadata"])
      if (!goal) return error("Goal not found", 404)
      return json(goal)
    } },
  { pattern: "DELETE /api/goals/:id", handler: async (ctx) => {
      const ok = await s.deleteEntity("goals", ctx.pathParams.id)
      if (!ok) return error("Goal not found", 404)
      return json({ success: true })
    } },

  // Sessions
  { pattern: "GET /api/sessions", handler: async (ctx) => {
      const projectId = ctx.params.get("projectId")
      if (!projectId) return error("projectId query parameter is required", 400)
      return json(await s.listSessions(projectId))
    } },
  { pattern: "POST /api/sessions", handler: async (ctx) => json(await s.createSession(ctx.body), 201) },

  // Versions
  { pattern: "GET /api/versions", handler: async (ctx) => {
      const projectId = ctx.params.get("projectId")
      if (!projectId) return error("projectId query parameter is required", 400)
      return json(await s.listVersions(projectId, ctx.params.get("sceneId") ?? undefined))
    } },
  { pattern: "POST /api/versions", handler: async (ctx) => json(await s.createVersion(ctx.body), 201) },

  // Agent
  { pattern: "GET /api/agent", handler: async (ctx) =>
      json(await s.listAgentTasks(ctx.params.get("projectId") ?? undefined)) },
  { pattern: "POST /api/agent", handler: async (ctx) => {
      const { action, messages, temperature, projectId, goal, permission } = ctx.body
      if (action === "chat") {
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return error("messages array is required for chat action", 400)
        }
        try {
          const response = await chatWithAI(messages, typeof temperature === "number" ? temperature : 0.7)
          return json({ response })
        } catch (aiError) {
          return error(`AI unavailable: ${aiError instanceof Error ? aiError.message : "Unknown error"}`, 503)
        }
      }
      return json(await s.createAgentTask({ projectId, goal, permission }), 201)
    } },

  // Agent tasks
  { pattern: "GET /api/agent-tasks/:id", handler: async (ctx) => {
      const task = await s.getAgentTask(ctx.pathParams.id)
      if (!task) return error("Task not found", 404)
      return json(task)
    } },
  { pattern: "PUT /api/agent-tasks/:id", handler: async (ctx) => {
      const task = await s.updateAgentTask(ctx.pathParams.id, ctx.body)
      if (!task) return error("Task not found", 404)
      return json(task)
    } },
  { pattern: "DELETE /api/agent-tasks/:id", handler: async (ctx) => {
      const ok = await s.deleteEntity("agentTasks", ctx.pathParams.id)
      if (!ok) return error("Task not found", 404)
      return json({ success: true })
    } },

  // AI chat
  { pattern: "POST /api/ai/chat", handler: async (ctx) => {
      const { messages, systemPrompt, temperature, model } = ctx.body
      if (!messages || !Array.isArray(messages)) {
        return error("messages array is required", 400)
      }
      try {
        const formatted = [
          ...(systemPrompt ? [{ role: "system" as const, content: String(systemPrompt) }] : []),
          ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        ]
        const response = await chatWithAI(formatted, typeof temperature === "number" ? temperature : 0.7)
        return json({ content: response })
      } catch (aiError) {
        return error(aiError instanceof Error ? aiError.message : "AI chat failed", 500)
      }
    } },

  // Search
  { pattern: "GET /api/search", handler: async (ctx) => {
      const q = ctx.params.get("q")
      const projectId = ctx.params.get("projectId")
      if (!q || !q.trim()) return error("Search query (q) is required", 400)
      if (!projectId) return error("projectId query parameter is required", 400)
      return json(await s.searchProject(projectId, q))
    } },

  // Backups
  { pattern: "POST /api/backup", handler: async (ctx) => {
      const { projectId } = ctx.body
      if (!projectId) return error("projectId is required", 400)
      return json(await s.createBackup(String(projectId)))
    } },
  { pattern: "GET /api/backup", handler: async (ctx) => {
      const projectId = ctx.params.get("projectId")
      if (!projectId) return error("projectId query parameter is required", 400)
      return json(await s.listBackups(projectId))
    } },
  { pattern: "GET /api/backup/:id", handler: async (ctx) => {
      const backup = await s.getBackup(ctx.pathParams.id)
      if (!backup) return error("Backup not found", 404)
      return json(backup)
    } },
  { pattern: "PUT /api/backup/:id", handler: async (ctx) => {
      try {
        await s.restoreBackup(ctx.pathParams.id, Boolean(ctx.body.confirm))
        return json({ success: true, message: "Backup restored successfully" })
      } catch (e) {
        if (e instanceof ApiError) return error(e.message, e.status)
        throw e
      }
    } },
  { pattern: "DELETE /api/backup/:id", handler: async (ctx) => {
      const ok = await s.deleteBackup(ctx.pathParams.id)
      if (!ok) return error("Backup not found", 404)
      return json({ success: true })
    } },

  // Exports
  ...(["markdown", "json", "txt", "html"] as const).map((format) => ({
    pattern: `GET /api/export/${format}`,
    handler: async (ctx) => {
      const projectId = ctx.params.get("projectId")
      if (!projectId) return error("projectId query parameter is required", 400)
      const book = await exports.loadProjectBook(projectId)
      if (!book) return error("Project not found", 404)
      return blobResponse(await EXPORT_BUILDERS[format](book))
    },
  })),
  ...(["docx", "epub"] as const).map((format) => ({
    pattern: `POST /api/export/${format}`,
    handler: async (ctx) => {
      const { projectId } = ctx.body
      if (!projectId) return error("projectId is required", 400)
      const book = await exports.loadProjectBook(String(projectId))
      if (!book) return error("Project not found", 404)
      return blobResponse(await EXPORT_BUILDERS[format](book))
    },
  })),

  // Imports
  { pattern: "POST /api/import/markdown", handler: async (ctx) => {
      const { projectId, content } = ctx.body
      if (!projectId || typeof content !== "string") {
        return error("projectId and content (string) are required", 400)
      }
      const imported = await imports.importMarkdown(String(projectId), content)
      return json({ success: true, imported })
    } },
  { pattern: "POST /api/import/json", handler: async (ctx) => {
      const { projectId, data } = ctx.body
      if (!projectId || !data) return error("projectId and data are required", 400)
      const imported = await imports.importJson(String(projectId), data as never)
      return json({ success: true, imported })
    } },
  { pattern: "POST /api/import/text", handler: async (ctx) => {
      const { projectId, content, title } = ctx.body
      if (!projectId || typeof content !== "string") {
        return error("projectId and content (string) are required", 400)
      }
      const imported = await imports.importText(String(projectId), content, typeof title === "string" ? title : undefined)
      return json({ success: true, imported })
    } },
  { pattern: "POST /api/import/docx", handler: async (ctx) => {
      const { projectId, base64, title } = ctx.body
      if (!projectId || typeof base64 !== "string") {
        return error("projectId and base64 (string) are required", 400)
      }
      try {
        const bin = atob(base64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const imported = await imports.importDocx(String(projectId), bytes, typeof title === "string" ? title : undefined)
        return json({ success: true, imported })
      } catch (e) {
        return error(e instanceof Error ? e.message : "DOCX import failed", 400)
      }
    } },
]

function matchRoute(method: string, segments: string[]): { handler: Handler; pathParams: Record<string, string> } | null {
  for (const r of routes) {
    const [m, ...rest] = r.pattern.split(" ")
    if (m !== method) continue
    const parts = rest.join(" ").split("/").filter(Boolean)
    if (parts.length !== segments.length) continue
    const pathParams: Record<string, string> = {}
    let ok = true
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(":")) {
        pathParams[parts[i].slice(1)] = decodeURIComponent(segments[i])
      } else if (parts[i] !== segments[i]) {
        ok = false
        break
      }
    }
    if (ok) return { handler: r.handler, pathParams }
  }
  return null
}

async function dispatch(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase()
  const qIndex = path.indexOf("?")
  const pathname = qIndex >= 0 ? path.slice(0, qIndex) : path
  const query = qIndex >= 0 ? path.slice(qIndex + 1) : ""
  const params = new URLSearchParams(query)
  const segments = pathname.split("/").filter(Boolean)
  let body: Record<string, unknown> = {}
  if (init?.body) {
    try {
      body = JSON.parse(String(init.body))
    } catch {
      // non-JSON body (not used by the UI)
    }
  }

  const match = matchRoute(method, segments)
  if (!match) return error("Not found", 404)

  const ctx: Ctx = {
    method,
    params,
    body,
    segments,
    pathParams: match.pathParams,
  }

  try {
    return await match.handler(ctx)
  } catch (e) {
    if (e instanceof ApiError) return error(e.message, e.status)
    console.error("Local API handler error:", e)
    return error("Internal error", 500)
  }
}

let installed = false

/**
 * Install the fetch shim. Safe to call multiple times.
 * Requests to /api/* are served locally; everything else passes
 * through to the real fetch.
 */
export function installLocalApi(): void {
  if (installed || typeof window === "undefined") return
  installed = true

  const realFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: string
    if (typeof input === "string") {
      url = input
    } else if (input instanceof URL) {
      url = input.href
    } else {
      url = input.url
    }

    // Normalize: strip origin and optional basePath so "/open-writer/api/..."
    // and "/api/..." both reach the router.
    let path = url
    try {
      if (/^https?:\/\//.test(path)) {
        path = new URL(path).pathname + new URL(path).search
      }
    } catch {
      // keep as-is
    }
    if (path.startsWith("/open-writer/")) path = path.slice("/open-writer".length)

    if (!path.startsWith("/api/")) {
      return realFetch(input, init)
    }
    return dispatch(path, init)
  }
}
