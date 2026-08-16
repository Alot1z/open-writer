/**
 * Continuity engine — deterministic, evidence-based story consistency checks.
 *
 * Every check runs entirely in the browser over the project's own data.
 * Each finding carries a problem description, a confidence score, the
 * concrete evidence that triggered it, and the affected entity ids, so the
 * user can act on it instead of trusting an unexplained "warning".
 *
 * The checks are heuristics on purpose: prose facts are rarely machine-
 * verifiable, so findings are advisory. No metric is faked.
 */

import { getAll } from "./storage"
import type {
  Character,
  Location,
  StoryObject,
  WorldElement,
  TimelineEvent,
  Relationship,
  Note,
  Scene,
  Chapter,
  Comment,
  ManuscriptVersion,
} from "./types"

export interface ContinuityFinding {
  id: string
  /** Stable check id, e.g. "timeline-two-places". */
  type: string
  severity: "info" | "warning" | "error"
  /** 0..1 — how sure the engine is. Hard data violations are 0.9+. */
  confidence: number
  /** Human-readable problem statement. */
  problem: string
  /** The specific data that triggered the finding. */
  evidence: string
  /** Entity ids involved in the finding. */
  source: string[]
  /** Entity ids affected by the finding. */
  affected: string[]
}

export interface ContinuityReport {
  projectId: string
  findings: ContinuityFinding[]
  generatedAt: string
  stats: {
    characters: number
    locations: number
    objects: number
    worldElements: number
    timelineEvents: number
    relationships: number
    notes: number
    scenes: number
    comments: number
    unresolvedComments: number
    versions: number
  }
}

/** Parse "2025-03-01", "2025-03", or "2025" into a timestamp; null otherwise. */
function parseDateStamp(value: string | undefined | null): number | null {
  if (!value) return null
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = m[2] ? Number(m[2]) : 1
  const day = m[3] ? Number(m[3]) : 1
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const ts = new Date(year, month - 1, day).getTime()
  return Number.isNaN(ts) ? null : ts
}

const wordSet = (text: string | undefined | null): Set<string> => {
  const set = new Set<string>()
  if (!text) return set
  for (const raw of text.toLowerCase().split(/[^a-z0-9'’-]+/)) {
    const w = raw.trim()
    if (w.length > 0) set.add(w)
  }
  return set
}

/** A cheap "story knowledge" index linking entities to where they are referenced. */
export interface StoryIndex {
  entities: { id: string; type: string; name: string }[]
  /** entityId -> types of references (scenes, relationships, notes). */
  refs: Map<string, { scenes: number; relationships: number; notes: number }>
}

export async function buildStoryIndex(projectId: string): Promise<StoryIndex> {
  const [characters, locations, objects, worldElements, scenes, chapters, relationships, notes] =
    await Promise.all([
      getAll<Character>("characters"),
      getAll<Location>("locations"),
      getAll<StoryObject>("storyObjects"),
      getAll<WorldElement>("worldElements"),
      getAll<Scene>("scenes"),
      getAll<Chapter>("chapters"),
      getAll<Relationship>("relationships"),
      getAll<Note>("notes"),
    ])

  // Scenes belong to chapters, which carry projectId.
  const projectChapterIds = new Set(chapters.filter((c) => c.projectId === projectId).map((c) => c.id))

  const inProject = <T extends { projectId: string }>(arr: T[]) =>
    arr.filter((x) => x.projectId === projectId)

  const entities: StoryIndex["entities"] = [
    ...inProject(characters).map((c) => ({ id: c.id, type: "character", name: c.name })),
    ...inProject(locations).map((l) => ({ id: l.id, type: "location", name: l.name })),
    ...inProject(objects).map((o) => ({ id: o.id, type: "object", name: o.name })),
    ...inProject(worldElements).map((w) => ({ id: w.id, type: "world", name: w.name })),
  ]

  const refs = new Map<string, { scenes: number; relationships: number; notes: number }>()
  const bump = (id: string, key: "scenes" | "relationships" | "notes") => {
    const cur = refs.get(id) ?? { scenes: 0, relationships: 0, notes: 0 }
    cur[key] += 1
    refs.set(id, cur)
  }

  const nameToId = new Map<string, string>()
  for (const e of entities) {
    const norm = e.name.trim().toLowerCase()
    if (norm && !nameToId.has(norm)) nameToId.set(norm, e.id)
  }

  for (const scene of scenes.filter((s) => projectChapterIds.has(s.chapterId))) {
    const words = wordSet(scene.content)
    for (const e of entities) {
      const n = e.name.trim().toLowerCase()
      if (n && n.length > 2 && words.has(n)) bump(e.id, "scenes")
    }
    if (scene.povCharacterId && nameToId.has(scene.povCharacterId.toLowerCase())) {
      bump(nameToId.get(scene.povCharacterId.toLowerCase())!, "scenes")
    }
    if (scene.locationId && nameToId.has(scene.locationId.toLowerCase())) {
      bump(nameToId.get(scene.locationId.toLowerCase())!, "scenes")
    }
  }

  for (const rel of inProject(relationships)) {
    bump(rel.sourceId, "relationships")
    bump(rel.targetId, "relationships")
  }

  for (const note of inProject(notes)) {
    if (note.linkedId) bump(note.linkedId, "notes")
  }

  return { entities, refs }
}

export async function runContinuityCheck(projectId: string): Promise<ContinuityReport> {
  const [
    characters,
    locations,
    objects,
    worldElements,
    timeline,
    relationships,
    notes,
    scenes,
    chapters,
    comments,
    versions,
  ] = await Promise.all([
    getAll<Character>("characters"),
    getAll<Location>("locations"),
    getAll<StoryObject>("storyObjects"),
    getAll<WorldElement>("worldElements"),
    getAll<TimelineEvent>("timelineEvents"),
    getAll<Relationship>("relationships"),
    getAll<Note>("notes"),
    getAll<Scene>("scenes"),
    getAll<Chapter>("chapters"),
    getAll<Comment>("comments"),
    getAll<ManuscriptVersion>("versions"),
  ])

  const inProject = <T extends { projectId: string }>(arr: T[]) =>
    arr.filter((x) => x.projectId === projectId)

  const projChars = inProject(characters)
  const projLocs = inProject(locations)
  const projObjects = inProject(objects)
  const projWorld = inProject(worldElements)
  const projTimeline = inProject(timeline)
  const projRels = inProject(relationships)
  const projNotes = inProject(notes)
  const projChapters = inProject(chapters)
  // Scenes belong to chapters, which carry projectId.
  const projectChapterIds = new Set(projChapters.map((c) => c.id))
  const projScenes = scenes.filter((s) => projectChapterIds.has(s.chapterId))
  const projComments = inProject(comments)
  const projVersions = inProject(versions)

  const findings: ContinuityFinding[] = []
  let seq = 0
  const add = (
    type: string,
    severity: ContinuityFinding["severity"],
    confidence: number,
    problem: string,
    evidence: string,
    source: string[],
    affected: string[]
  ) => {
    findings.push({
      id: `${type}-${++seq}`,
      type,
      severity,
      confidence,
      problem,
      evidence,
      source,
      affected,
    })
  }

  // 1. Timeline: same character in two different locations on the same date.
  const eventsByDate = new Map<string, TimelineEvent[]>()
  for (const ev of projTimeline) {
    if (!ev.date) continue
    const list = eventsByDate.get(ev.date) ?? []
    list.push(ev)
    eventsByDate.set(ev.date, list)
  }
  for (const [date, events] of eventsByDate) {
    if (events.length < 2) continue
    // character -> distinct locations
    const charLocs = new Map<string, Set<string>>()
    for (const ev of events) {
      const chars = ev.characters.split(",").map((c) => c.trim()).filter(Boolean)
      for (const ch of chars) {
        const set = charLocs.get(ch) ?? new Set<string>()
        if (ev.location) set.add(ev.location)
        charLocs.set(ch, set)
      }
    }
    for (const [ch, locs] of charLocs) {
      if (locs.size > 1) {
        add(
          "timeline-two-places",
          "warning",
          0.8,
          `"${ch}" is in ${locs.size} different locations on the same date (${date}).`,
          `Events on ${date}: ${events.map((e) => `${e.title} (${e.location})`).join("; ")}`,
          events.map((e) => e.id),
          []
        )
      }
    }
  }

  // 2. Timeline: an event dated AFTER the event it lists as its cause.
  for (const ev of projTimeline) {
    if (!ev.cause) continue
    const causeName = ev.cause.trim()
    const causeEv = projTimeline.find(
      (c) => c.id === causeName || c.title.toLowerCase() === causeName.toLowerCase()
    )
    if (!causeEv) continue
    const evTs = parseDateStamp(ev.date)
    const causeTs = parseDateStamp(causeEv.date)
    if (evTs !== null && causeTs !== null && evTs < causeTs) {
      add(
        "timeline-cause-after-effect",
        "warning",
        0.6,
        `"${ev.title}" (${ev.date}) is dated BEFORE its stated cause "${causeEv.title}" (${causeEv.date}).`,
        `cause: ${causeName}; effect: ${ev.title} on ${ev.date}`,
        [ev.id, causeEv.id],
        [ev.id]
      )
    }
  }

  // 3. Duplicate entity names (characters/locations/objects/world).
  const dupCheck = (list: { id: string; name: string }[], typeLabel: string) => {
    const byName = new Map<string, string[]>()
    for (const e of list) {
      const norm = e.name.trim().toLowerCase()
      if (!norm) continue
      const arr = byName.get(norm) ?? []
      arr.push(e.id)
      byName.set(norm, arr)
    }
    for (const [name, ids] of byName) {
      if (ids.length > 1) {
        add(
          "duplicate-name",
          "info",
          0.9,
          `Two ${typeLabel} share the name "${name}".`,
          `ids: ${ids.join(", ")}`,
          ids,
          ids
        )
      }
    }
  }
  dupCheck(projChars, "characters")
  dupCheck(projLocs, "locations")
  dupCheck(projObjects, "objects")
  dupCheck(projWorld, "world elements")

  // 4. Self-referencing relationships.
  for (const rel of projRels) {
    if (rel.sourceId && rel.sourceId === rel.targetId) {
      add(
        "relationship-self-loop",
        "info",
        0.9,
        `A "${rel.type}" relationship links an entity to itself.`,
        `${rel.sourceId} → ${rel.targetId} (${rel.type})`,
        [rel.sourceId],
        [rel.sourceId]
      )
    }
  }

  // 5. Notes with dangling links.
  const allEntityIds = new Set([
    ...projChars.map((c) => c.id),
    ...projLocs.map((l) => l.id),
    ...projObjects.map((o) => o.id),
    ...projWorld.map((w) => w.id),
  ])
  for (const note of projNotes) {
    if (note.linkedType && note.linkedId && !allEntityIds.has(note.linkedId)) {
      add(
        "note-dangling-link",
        "warning",
        0.9,
        `Note "${note.title}" links to a ${note.linkedType} that no longer exists.`,
        `linkedType=${note.linkedType} linkedId=${note.linkedId}`,
        [note.id],
        [note.id]
      )
    }
  }

  // 6. Scenes with a missing chapter (corrupted data).
  const chapterIds = new Set(projChapters.map((c) => c.id))
  for (const scene of projScenes) {
    if (scene.chapterId && !chapterIds.has(scene.chapterId)) {
      add(
        "scene-orphan-chapter",
        "error",
        0.95,
        `Scene "${scene.title}" belongs to a chapter that does not exist.`,
        `chapterId=${scene.chapterId}`,
        [scene.id],
        [scene.id]
      )
    }
  }

  // 7. Ownership conflicts: an object whose owner field names several characters.
  const charNames = new Set(projChars.map((c) => c.name.trim().toLowerCase()).filter(Boolean))
  for (const obj of projObjects) {
    if (!obj.owner) continue
    const claimed = new Set<string>()
    for (const word of obj.owner.toLowerCase().split(/[,;/&]+/)) {
      const name = word.trim()
      if (name && charNames.has(name)) claimed.add(name)
    }
    if (claimed.size > 1) {
      add(
        "ownership-conflict",
        "info",
        0.5,
        `Object "${obj.name}" lists multiple owners: ${[...claimed].join(", ")}.`,
        `owner field: ${obj.owner}`,
        [obj.id],
        [obj.id]
      )
    }
  }

  // 8. Orphan entities: never referenced in any scene, relationship, or note.
  const index = await buildStoryIndex(projectId)
  for (const e of index.entities) {
    const r = index.refs.get(e.id)
    const total = (r?.scenes ?? 0) + (r?.relationships ?? 0) + (r?.notes ?? 0)
    if (total === 0) {
      add(
        "orphan-entity",
        "info",
        0.4,
        `${e.type[0].toUpperCase() + e.type.slice(1)} "${e.name}" is never referenced in any scene, relationship, or note.`,
        `no references found in ${projScenes.length} scenes, ${projRels.length} relationships, ${projNotes.length} notes`,
        [e.id],
        [e.id]
      )
    }
  }

  return {
    projectId,
    findings,
    generatedAt: new Date().toISOString(),
    stats: {
      characters: projChars.length,
      locations: projLocs.length,
      objects: projObjects.length,
      worldElements: projWorld.length,
      timelineEvents: projTimeline.length,
      relationships: projRels.length,
      notes: projNotes.length,
      scenes: projScenes.length,
      comments: projComments.length,
      unresolvedComments: projComments.filter((c) => !c.resolved).length,
      versions: projVersions.length,
    },
  }
}

