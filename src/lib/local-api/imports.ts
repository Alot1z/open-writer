/**
 * Client-side importers (Markdown, JSON, plain text).
 *
 * Ports of the former /api/import/* routes. All parsing happens in
 * the browser and writes into the local IndexedDB store.
 */

import * as db from "./storage"
import * as s from "./services"
import type { Chapter, Scene } from "./types"

export async function importMarkdown(projectId: string, content: string): Promise<{ chapters: number; scenes: number }> {
  if (!projectId || !content || typeof content !== "string") {
    throw new s.ApiError("projectId and content (string) are required", 400)
  }
  const project = await db.getById("projects", projectId)
  if (!project) throw new s.ApiError("Project not found", 404)

  // Parse markdown: H1 = Chapter, H2 = Scene
  const lines = content.split("\n")
  const chapters: { title: string; scenes: { title: string; content: string }[] }[] = []
  let currentChapter: (typeof chapters)[number] | null = null
  let currentScene: { title: string; content: string } | null = null

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)/)
    const h2Match = line.match(/^##\s+(.+)/)

    if (h1Match) {
      if (currentScene && currentChapter) currentChapter.scenes.push(currentScene)
      currentScene = null
      currentChapter = { title: h1Match[1].trim(), scenes: [] }
      chapters.push(currentChapter)
    } else if (h2Match) {
      if (currentScene && currentChapter) currentChapter.scenes.push(currentScene)
      currentScene = { title: h2Match[1].trim(), content: "" }
      if (currentChapter) currentChapter.scenes.push(currentScene)
    } else {
      if (currentScene) currentScene.content += (currentScene.content ? "\n" : "") + line
    }
  }

  if (chapters.length === 0) {
    throw new s.ApiError("No chapters found in markdown. Use # for chapter titles and ## for scene titles.", 400)
  }

  const existingChapters = (await db.getAll<Chapter>("chapters")).filter((c) => c.projectId === projectId)
  const existingScenes = await db.getAll<Scene>("scenes")
  const newChapters: Chapter[] = []
  const newScenes: Scene[] = []

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const t = s.now()
    const chapter: Chapter = {
      id: s.newId(),
      projectId,
      title: ch.title,
      synopsis: "",
      order: existingChapters.length + i,
      status: "draft",
      notes: "",
      metadata: "{}",
      createdAt: t,
      updatedAt: t,
    }
    newChapters.push(chapter)

    for (let j = 0; j < ch.scenes.length; j++) {
      const sc = ch.scenes[j]
      const content = sc.content.trim()
      newScenes.push({
        id: s.newId(),
        chapterId: chapter.id,
        title: sc.title,
        content,
        order: j,
        status: "draft",
        povCharacterId: "",
        locationId: "",
        timeOfDay: "",
        notes: "",
        wordCount: content ? content.split(/\s+/).filter(Boolean).length : 0,
        metadata: "{}",
        createdAt: t,
        updatedAt: t,
      })
    }
  }

  await db.bulkPut("chapters", [...existingChapters, ...newChapters])
  await db.bulkPut("scenes", [...existingScenes, ...newScenes])

  return { chapters: newChapters.length, scenes: newScenes.length }
}

interface ImportData {
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

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v))
const num = (v: unknown, fallback = 0) => (v === undefined || v === null ? fallback : Number(v))
const bool = (v: unknown, fallback = false) => (v === undefined || v === null ? fallback : Boolean(v))

export async function importJson(projectId: string, data: ImportData): Promise<Record<string, number>> {
  if (!projectId || !data) throw new s.ApiError("projectId and data are required", 400)
  const project = await db.getById("projects", projectId)
  if (!project) throw new s.ApiError("Project not found", 404)

  const imported = {
    chapters: 0,
    scenes: 0,
    characters: 0,
    locations: 0,
    storyObjects: 0,
    worldElements: 0,
    timelineEvents: 0,
    relationships: 0,
    notes: 0,
  }

  const [existingChapters, existingScenes, existingCharacters, existingLocations, existingObjects, existingWorld, existingTimeline, existingRelationships, existingNotes] = await Promise.all([
    db.getAll<Chapter>("chapters"),
    db.getAll<Scene>("scenes"),
    db.getAll("characters"),
    db.getAll("locations"),
    db.getAll("storyObjects"),
    db.getAll("worldElements"),
    db.getAll("timelineEvents"),
    db.getAll("relationships"),
    db.getAll("notes"),
  ])

  const t = s.now()
  const make = (row: Record<string, unknown>) => ({
    id: typeof row.id === "string" ? row.id : s.newId(),
    projectId,
    createdAt: str(row.createdAt) || t,
    updatedAt: str(row.updatedAt) || t,
  })

  const characters = [...existingCharacters]
  if (Array.isArray(data.characters)) {
    for (const raw of data.characters) {
      const row = raw as Record<string, unknown>
      if (!row.name || typeof row.name !== "string") continue
      characters.push({
        ...make(row),
        name: row.name,
        description: str(row.description),
        role: str(row.role),
        age: str(row.age),
        occupation: str(row.occupation),
        personality: str(row.personality),
        appearance: str(row.appearance),
        backstory: str(row.backstory),
        motivation: str(row.motivation),
        goals: str(row.goals),
        fears: str(row.fears),
        tags: str(row.tags) || "[]",
        metadata: str(row.metadata) || "{}",
      })
      imported.characters++
    }
  }

  const locations = [...existingLocations]
  if (Array.isArray(data.locations)) {
    for (const raw of data.locations) {
      const row = raw as Record<string, unknown>
      if (!row.name || typeof row.name !== "string") continue
      locations.push({
        ...make(row),
        name: row.name,
        description: str(row.description),
        type: str(row.type),
        atmosphere: str(row.atmosphere),
        history: str(row.history),
        features: str(row.features),
        parentLocationId: str(row.parentLocationId),
        tags: str(row.tags) || "[]",
        metadata: str(row.metadata) || "{}",
      })
      imported.locations++
    }
  }

  const storyObjects = [...existingObjects]
  if (Array.isArray(data.storyObjects)) {
    for (const raw of data.storyObjects) {
      const row = raw as Record<string, unknown>
      if (!row.name || typeof row.name !== "string") continue
      storyObjects.push({
        ...make(row),
        name: row.name,
        description: str(row.description),
        type: str(row.type),
        owner: str(row.owner),
        location: str(row.location),
        history: str(row.history),
        appearance: str(row.appearance),
        significance: str(row.significance),
        tags: str(row.tags) || "[]",
        metadata: str(row.metadata) || "{}",
      })
      imported.storyObjects++
    }
  }

  const worldElements = [...existingWorld]
  if (Array.isArray(data.worldElements)) {
    for (const raw of data.worldElements) {
      const row = raw as Record<string, unknown>
      if (!row.name || typeof row.name !== "string") continue
      worldElements.push({
        ...make(row),
        name: row.name,
        description: str(row.description),
        category: str(row.category),
        parent: str(row.parent),
        rules: str(row.rules),
        history: str(row.history),
        tags: str(row.tags) || "[]",
        metadata: str(row.metadata) || "{}",
      })
      imported.worldElements++
    }
  }

  const timelineEvents = [...existingTimeline]
  if (Array.isArray(data.timelineEvents)) {
    for (const raw of data.timelineEvents) {
      const row = raw as Record<string, unknown>
      if (!row.title || typeof row.title !== "string") continue
      timelineEvents.push({
        ...make(row),
        title: row.title,
        description: str(row.description),
        date: str(row.date),
        time: str(row.time),
        duration: str(row.duration),
        location: str(row.location),
        characters: str(row.characters) || "[]",
        objects: str(row.objects) || "[]",
        sourceScene: str(row.sourceScene),
        cause: str(row.cause),
        consequence: str(row.consequence),
        eventType: str(row.eventType),
        tags: str(row.tags) || "[]",
        metadata: str(row.metadata) || "{}",
      })
      imported.timelineEvents++
    }
  }

  const chapters = [...existingChapters]
  const scenes = [...existingScenes]
  if (Array.isArray(data.chapters)) {
    for (let i = 0; i < data.chapters.length; i++) {
      const raw = data.chapters[i] as Record<string, unknown>
      if (!raw.title || typeof raw.title !== "string") continue
      const chapter = {
        ...make(raw),
        title: raw.title,
        synopsis: str(raw.synopsis),
        order: existingChapters.length + imported.chapters + i,
        status: str(raw.status) || "draft",
        notes: str(raw.notes),
        metadata: str(raw.metadata) || "{}",
      }
      chapters.push(chapter)
      imported.chapters++

      if (Array.isArray(raw.scenes)) {
        for (let j = 0; j < raw.scenes.length; j++) {
          const sc = raw.scenes[j] as Record<string, unknown>
          if (!sc.title || typeof sc.title !== "string") continue
          const content = str(sc.content)
          scenes.push({
            ...make(sc),
            chapterId: chapter.id,
            title: sc.title,
            content,
            order: j,
            status: str(sc.status) || "draft",
            povCharacterId: str(sc.povCharacterId),
            locationId: str(sc.locationId),
            timeOfDay: str(sc.timeOfDay),
            notes: str(sc.notes),
            wordCount: content ? content.split(/\s+/).filter(Boolean).length : 0,
            metadata: str(sc.metadata) || "{}",
          })
          imported.scenes++
        }
      }
    }
  }

  const notes = [...existingNotes]
  if (Array.isArray(data.notes)) {
    for (const raw of data.notes) {
      const row = raw as Record<string, unknown>
      if (!row.title || typeof row.title !== "string") continue
      notes.push({
        ...make(row),
        title: row.title,
        content: str(row.content),
        category: str(row.category) || "general",
        linkedType: str(row.linkedType),
        linkedId: str(row.linkedId),
        priority: num(row.priority),
        resolved: bool(row.resolved),
        tags: str(row.tags) || "[]",
        metadata: str(row.metadata) || "{}",
      })
      imported.notes++
    }
  }

  const relationships = [...existingRelationships]
  if (Array.isArray(data.relationships)) {
    for (const raw of data.relationships) {
      const row = raw as Record<string, unknown>
      if (!row.type || !row.sourceId || !row.targetId) continue
      relationships.push({
        ...make(row),
        sourceId: str(row.sourceId),
        sourceType: str(row.sourceType),
        targetId: str(row.targetId),
        targetType: str(row.targetType),
        type: str(row.type),
        description: str(row.description),
        strength: num(row.strength),
        tags: str(row.tags) || "[]",
        metadata: str(row.metadata) || "{}",
      })
      imported.relationships++
    }
  }

  await db.bulkPut("characters", characters)
  await db.bulkPut("locations", locations)
  await db.bulkPut("storyObjects", storyObjects)
  await db.bulkPut("worldElements", worldElements)
  await db.bulkPut("timelineEvents", timelineEvents)
  await db.bulkPut("chapters", chapters)
  await db.bulkPut("scenes", scenes)
  await db.bulkPut("notes", notes)
  await db.bulkPut("relationships", relationships)

  return imported
}

export async function importText(projectId: string, content: string, title?: string): Promise<{ chapters: number; scenes: number; wordCount: number }> {
  if (!projectId || !content || typeof content !== "string") {
    throw new s.ApiError("projectId and content (string) are required", 400)
  }
  const project = await db.getById("projects", projectId)
  if (!project) throw new s.ApiError("Project not found", 404)

  const existingChapters = (await db.getAll<Chapter>("chapters")).filter((c) => c.projectId === projectId)
  const wordCount = content.split(/\s+/).filter(Boolean).length
  const t = s.now()

  const chapter: Chapter = {
    id: s.newId(),
    projectId,
    title: title || "Imported Text",
    synopsis: "",
    order: existingChapters.length,
    status: "draft",
    notes: "",
    metadata: "{}",
    createdAt: t,
    updatedAt: t,
  }
  const scene: Scene = {
    id: s.newId(),
    chapterId: chapter.id,
    title: "Content",
    content,
    order: 0,
    status: "draft",
    povCharacterId: "",
    locationId: "",
    timeOfDay: "",
    notes: "",
    wordCount,
    metadata: "{}",
    createdAt: t,
    updatedAt: t,
  }

  await db.putRecord("chapters", chapter)
  await db.putRecord("scenes", scene)

  return { chapters: 1, scenes: 1, wordCount }
}

// ─────────────────────────────────────────────────────────────
// DOCX (Microsoft Word) import
// ─────────────────────────────────────────────────────────────

/**
 * Minimal ZIP reader for DOCX files. Supports stored (0) and
 * deflate (8) entries; deflate uses the browser's DecompressionStream.
 */
export async function extractZipEntryText(
  bytes: Uint8Array,
  entryName: string
): Promise<string | null> {
  const decoder = new TextDecoder("utf-8")
  let offset = 0
  while (offset + 30 <= bytes.length) {
    // Local file header signature
    if (bytes[offset] !== 0x50 || bytes[offset + 1] !== 0x4b || bytes[offset + 2] !== 0x03 || bytes[offset + 3] !== 0x04) {
      break
    }
    const method = bytes[offset + 8] | (bytes[offset + 9] << 8)
    const nameLen = bytes[offset + 26] | (bytes[offset + 27] << 8)
    const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8)
    const compSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLen + extraLen
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen))
    const data = bytes.subarray(dataStart, dataStart + compSize)
    if (name === entryName) {
      if (method === 0) {
        return decoder.decode(data)
      }
      if (method === 8 && typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate-raw")
        const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(ds)
        const buf = await new Response(stream).arrayBuffer()
        return decoder.decode(new Uint8Array(buf))
      }
      return null // unsupported compression method
    }
    offset = dataStart + compSize
  }
  return null
}

/** Parse word/document.xml into simple markdown (headings + paragraphs). */
function docxXmlToMarkdown(xml: string): string {
  const blocks: string[] = []
  // Split into paragraphs
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p[^>]*\/>/g) || []
  for (const para of paras) {
    const styleMatch = para.match(/<w:pStyle w:val="([^"]+)"/)
    const style = styleMatch ? styleMatch[1] : ""
    const text = (para.match(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g) || [])
      .map((t) => t.replace(/<w:t(?: [^>]*)?>/g, "").replace(/<\/w:t>/g, ""))
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    if (!text.trim()) continue
    if (/^Heading1$/i.test(style) || /^Title$/i.test(style)) blocks.push(`# ${text.trim()}`)
    else if (/^Heading2$/i.test(style)) blocks.push(`## ${text.trim()}`)
    else if (/^Heading3$/i.test(style)) blocks.push(`### ${text.trim()}`)
    else blocks.push(text)
  }
  return blocks.join("\n\n")
}

export async function importDocx(
  projectId: string,
  bytes: Uint8Array,
  title?: string
): Promise<{ chapters: number; scenes: number; wordCount: number }> {
  if (!projectId || !bytes || bytes.length === 0) {
    throw new s.ApiError("projectId and file content are required", 400)
  }
  const project = await db.getById("projects", projectId)
  if (!project) throw new s.ApiError("Project not found", 404)

  const xml = await extractZipEntryText(bytes, "word/document.xml")
  if (!xml) {
    throw new s.ApiError("Not a valid DOCX file: word/document.xml not found", 400)
  }

  const markdown = docxXmlToMarkdown(xml)
  if (!markdown.trim()) {
    throw new s.ApiError("No readable text found in the DOCX file", 400)
  }

  // Reuse the markdown importer so headings become chapters/scenes.
  // If the document has no heading styles, wrap everything in one chapter.
  const withHeadings = /^#s+/m.test(markdown) ? markdown : `# ${title || "Imported Document"}

${markdown}`
  const imported = await importMarkdown(projectId, withHeadings)
  return { ...imported, wordCount: withHeadings.split(/s+/).filter(Boolean).length }
}
