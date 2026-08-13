import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface ImportData {
  project?: Record<string, unknown>
  chapters?: Array<{
    id?: string
    title: string
    synopsis?: string
    order?: number
    scenes?: Array<{
      id?: string
      title: string
      content?: string
      order?: number
      [key: string]: unknown
    }>
    [key: string]: unknown
  }>
  characters?: Array<Record<string, unknown>>
  locations?: Array<Record<string, unknown>>
  storyObjects?: Array<Record<string, unknown>>
  worldElements?: Array<Record<string, unknown>>
  timelineEvents?: Array<Record<string, unknown>>
  relationships?: Array<Record<string, unknown>>
  notes?: Array<Record<string, unknown>>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, data } = body as { projectId: string; data: ImportData }

    if (!projectId || !data) {
      return NextResponse.json(
        { error: 'projectId and data are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

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

    // Import characters first (they're referenced by relationships)
    if (Array.isArray(data.characters)) {
      for (const char of data.characters) {
        if (!char.name || typeof char.name !== 'string') continue
        await db.character.create({
          data: {
            projectId,
            name: String(char.name),
            description: String(char.description ?? ''),
            role: String(char.role ?? ''),
            age: String(char.age ?? ''),
            occupation: String(char.occupation ?? ''),
            personality: String(char.personality ?? ''),
            appearance: String(char.appearance ?? ''),
            backstory: String(char.backstory ?? ''),
            motivation: String(char.motivation ?? ''),
            goals: String(char.goals ?? ''),
            fears: String(char.fears ?? ''),
            tags: String(char.tags ?? '[]'),
            metadata: String(char.metadata ?? '{}'),
          },
        })
        imported.characters++
      }
    }

    // Import locations
    if (Array.isArray(data.locations)) {
      for (const loc of data.locations) {
        if (!loc.name || typeof loc.name !== 'string') continue
        await db.location.create({
          data: {
            projectId,
            name: String(loc.name),
            description: String(loc.description ?? ''),
            type: String(loc.type ?? ''),
            atmosphere: String(loc.atmosphere ?? ''),
            history: String(loc.history ?? ''),
            features: String(loc.features ?? ''),
            parentLocationId: String(loc.parentLocationId ?? ''),
            tags: String(loc.tags ?? '[]'),
            metadata: String(loc.metadata ?? '{}'),
          },
        })
        imported.locations++
      }
    }

    // Import story objects
    if (Array.isArray(data.storyObjects)) {
      for (const obj of data.storyObjects) {
        if (!obj.name || typeof obj.name !== 'string') continue
        await db.storyObject.create({
          data: {
            projectId,
            name: String(obj.name),
            description: String(obj.description ?? ''),
            type: String(obj.type ?? ''),
            owner: String(obj.owner ?? ''),
            location: String(obj.location ?? ''),
            history: String(obj.history ?? ''),
            appearance: String(obj.appearance ?? ''),
            significance: String(obj.significance ?? ''),
            tags: String(obj.tags ?? '[]'),
            metadata: String(obj.metadata ?? '{}'),
          },
        })
        imported.storyObjects++
      }
    }

    // Import world elements
    if (Array.isArray(data.worldElements)) {
      for (const we of data.worldElements) {
        if (!we.name || typeof we.name !== 'string') continue
        await db.worldElement.create({
          data: {
            projectId,
            name: String(we.name),
            description: String(we.description ?? ''),
            category: String(we.category ?? ''),
            parent: String(we.parent ?? ''),
            rules: String(we.rules ?? ''),
            history: String(we.history ?? ''),
            tags: String(we.tags ?? '[]'),
            metadata: String(we.metadata ?? '{}'),
          },
        })
        imported.worldElements++
      }
    }

    // Import timeline events
    if (Array.isArray(data.timelineEvents)) {
      for (const te of data.timelineEvents) {
        if (!te.title || typeof te.title !== 'string') continue
        await db.timelineEvent.create({
          data: {
            projectId,
            title: String(te.title),
            description: String(te.description ?? ''),
            date: String(te.date ?? ''),
            time: String(te.time ?? ''),
            duration: String(te.duration ?? ''),
            location: String(te.location ?? ''),
            characters: String(te.characters ?? '[]'),
            objects: String(te.objects ?? '[]'),
            sourceScene: String(te.sourceScene ?? ''),
            cause: String(te.cause ?? ''),
            consequence: String(te.consequence ?? ''),
            eventType: String(te.eventType ?? ''),
            tags: String(te.tags ?? '[]'),
            metadata: String(te.metadata ?? '{}'),
          },
        })
        imported.timelineEvents++
      }
    }

    // Import chapters and scenes
    if (Array.isArray(data.chapters)) {
      const existingChapterCount = await db.chapter.count({ where: { projectId } })

      for (let i = 0; i < data.chapters.length; i++) {
        const ch = data.chapters[i]
        if (!ch.title || typeof ch.title !== 'string') continue

        const chapter = await db.chapter.create({
          data: {
            projectId,
            title: String(ch.title),
            synopsis: String(ch.synopsis ?? ''),
            order: existingChapterCount + i,
            status: String(ch.status ?? 'draft'),
            notes: String(ch.notes ?? ''),
            metadata: String(ch.metadata ?? '{}'),
          },
        })
        imported.chapters++

        if (Array.isArray(ch.scenes)) {
          for (let j = 0; j < ch.scenes.length; j++) {
            const sc = ch.scenes[j]
            if (!sc.title || typeof sc.title !== 'string') continue
            const content = String(sc.content ?? '')
            await db.scene.create({
              data: {
                chapterId: chapter.id,
                title: String(sc.title),
                content,
                order: j,
                status: String(sc.status ?? 'draft'),
                povCharacterId: String(sc.povCharacterId ?? ''),
                locationId: String(sc.locationId ?? ''),
                timeOfDay: String(sc.timeOfDay ?? ''),
                notes: String(sc.notes ?? ''),
                wordCount: content.split(/\s+/).filter(Boolean).length,
                metadata: String(sc.metadata ?? '{}'),
              },
            })
            imported.scenes++
          }
        }
      }
    }

    // Import notes
    if (Array.isArray(data.notes)) {
      for (const note of data.notes) {
        if (!note.title || typeof note.title !== 'string') continue
        await db.note.create({
          data: {
            projectId,
            title: String(note.title),
            content: String(note.content ?? ''),
            category: String(note.category ?? 'general'),
            linkedType: String(note.linkedType ?? ''),
            linkedId: String(note.linkedId ?? ''),
            priority: Number(note.priority ?? 0),
            resolved: Boolean(note.resolved ?? false),
            tags: String(note.tags ?? '[]'),
            metadata: String(note.metadata ?? '{}'),
          },
        })
        imported.notes++
      }
    }

    // Import relationships
    if (Array.isArray(data.relationships)) {
      for (const rel of data.relationships) {
        if (!rel.type || !rel.sourceId || !rel.targetId) continue
        await db.relationship.create({
          data: {
            projectId,
            sourceId: String(rel.sourceId),
            sourceType: String(rel.sourceType ?? ''),
            targetId: String(rel.targetId),
            targetType: String(rel.targetType ?? ''),
            type: String(rel.type),
            description: String(rel.description ?? ''),
            strength: Number(rel.strength ?? 0),
            tags: String(rel.tags ?? '[]'),
            metadata: String(rel.metadata ?? '{}'),
          },
        })
        imported.relationships++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
    })
  } catch (error) {
    console.error('Failed to import JSON:', error)
    return NextResponse.json(
      { error: 'Failed to import JSON' },
      { status: 500 }
    )
  }
}
