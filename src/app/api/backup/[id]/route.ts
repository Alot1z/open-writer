import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const backup = await db.manuscriptVersion.findUnique({
      where: { id },
    })

    if (!backup) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    let snapshot: Record<string, unknown> = {}
    try {
      snapshot = JSON.parse(backup.snapshot)
    } catch {
      // ignore
    }

    let backupData: Record<string, unknown> | null = null
    try {
      backupData = JSON.parse(backup.content)
    } catch {
      // ignore
    }

    return NextResponse.json({
      id: backup.id,
      label: backup.label,
      wordCount: backup.wordCount,
      createdAt: backup.createdAt,
      checksum: snapshot.checksum ?? '',
      timestamp: snapshot.timestamp ?? '',
      sizeBytes: snapshot.sizeBytes ?? 0,
      data: backupData,
    })
  } catch (error) {
    console.error('Failed to get backup:', error)
    return NextResponse.json(
      { error: 'Failed to get backup' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { confirm } = body as { confirm?: boolean }

    if (!confirm) {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: true } to restore.' },
        { status: 400 }
      )
    }

    const backup = await db.manuscriptVersion.findUnique({
      where: { id },
    })

    if (!backup) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    let backupData: {
      project?: { id?: string }
      chapters?: Array<Record<string, unknown>>
      characters?: Array<Record<string, unknown>>
      locations?: Array<Record<string, unknown>>
      storyObjects?: Array<Record<string, unknown>>
      worldElements?: Array<Record<string, unknown>>
      timelineEvents?: Array<Record<string, unknown>>
      relationships?: Array<Record<string, unknown>>
      notes?: Array<Record<string, unknown>>
    }
    try {
      backupData = JSON.parse(backup.content)
    } catch {
      return NextResponse.json(
        { error: 'Backup data is corrupted and cannot be restored.' },
        { status: 400 }
      )
    }

    const projectId = backup.projectId

    // Verify checksum
    let snapshot: Record<string, unknown> = {}
    try {
      snapshot = JSON.parse(backup.snapshot)
    } catch {
      // ignore
    }

    const storedChecksum = snapshot.checksum
    if (storedChecksum) {
      const encoder = new TextEncoder()
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(backup.content))
      const computedChecksum = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      if (computedChecksum !== storedChecksum) {
        return NextResponse.json(
          { error: 'Backup checksum verification failed. The data may be corrupted.' },
          { status: 400 }
        )
      }
    }

    // Delete existing data (in reverse order of dependencies)
    await db.$transaction([
      db.relationship.deleteMany({ where: { projectId } }),
      db.note.deleteMany({ where: { projectId } }),
      db.comment.deleteMany({ where: { projectId } }),
      db.timelineEvent.deleteMany({ where: { projectId } }),
      db.worldElement.deleteMany({ where: { projectId } }),
      db.storyObject.deleteMany({ where: { projectId } }),
      db.location.deleteMany({ where: { projectId } }),
      db.character.deleteMany({ where: { projectId } }),
      db.manuscriptVersion.deleteMany({ where: { projectId, id: { not: id } } }),
      db.writingSession.deleteMany({ where: { projectId } }),
      db.writingGoal.deleteMany({ where: { projectId } }),
      db.agentTask.deleteMany({ where: { projectId } }),
      db.scene.deleteMany({ where: { chapter: { projectId } } }),
      db.chapter.deleteMany({ where: { projectId } }),
    ])

    // Restore characters
    if (Array.isArray(backupData.characters)) {
      for (const char of backupData.characters) {
        if (!char.name) continue
        await db.character.create({
          data: {
            id: typeof char.id === 'string' ? char.id : undefined,
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
      }
    }

    // Restore locations
    if (Array.isArray(backupData.locations)) {
      for (const loc of backupData.locations) {
        if (!loc.name) continue
        await db.location.create({
          data: {
            id: typeof loc.id === 'string' ? loc.id : undefined,
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
      }
    }

    // Restore story objects
    if (Array.isArray(backupData.storyObjects)) {
      for (const obj of backupData.storyObjects) {
        if (!obj.name) continue
        await db.storyObject.create({
          data: {
            id: typeof obj.id === 'string' ? obj.id : undefined,
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
      }
    }

    // Restore world elements
    if (Array.isArray(backupData.worldElements)) {
      for (const we of backupData.worldElements) {
        if (!we.name) continue
        await db.worldElement.create({
          data: {
            id: typeof we.id === 'string' ? we.id : undefined,
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
      }
    }

    // Restore timeline events
    if (Array.isArray(backupData.timelineEvents)) {
      for (const te of backupData.timelineEvents) {
        if (!te.title) continue
        await db.timelineEvent.create({
          data: {
            id: typeof te.id === 'string' ? te.id : undefined,
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
      }
    }

    // Restore chapters and scenes
    if (Array.isArray(backupData.chapters)) {
      for (const ch of backupData.chapters) {
        if (!ch.title) continue
        const scenes = ch.scenes as Array<Record<string, unknown>> | undefined
        const chapter = await db.chapter.create({
          data: {
            id: typeof ch.id === 'string' ? ch.id : undefined,
            projectId,
            title: String(ch.title),
            synopsis: String(ch.synopsis ?? ''),
            order: Number(ch.order ?? 0),
            status: String(ch.status ?? 'draft'),
            notes: String(ch.notes ?? ''),
            metadata: String(ch.metadata ?? '{}'),
          },
        })

        if (Array.isArray(scenes)) {
          for (const sc of scenes) {
            if (!sc.title) continue
            const content = String(sc.content ?? '')
            await db.scene.create({
              data: {
                id: typeof sc.id === 'string' ? sc.id : undefined,
                chapterId: chapter.id,
                title: String(sc.title),
                content,
                order: Number(sc.order ?? 0),
                status: String(sc.status ?? 'draft'),
                povCharacterId: String(sc.povCharacterId ?? ''),
                locationId: String(sc.locationId ?? ''),
                timeOfDay: String(sc.timeOfDay ?? ''),
                notes: String(sc.notes ?? ''),
                wordCount: content.split(/\s+/).filter(Boolean).length,
                metadata: String(sc.metadata ?? '{}'),
              },
            })
          }
        }
      }
    }

    // Restore notes
    if (Array.isArray(backupData.notes)) {
      for (const note of backupData.notes) {
        if (!note.title) continue
        await db.note.create({
          data: {
            id: typeof note.id === 'string' ? note.id : undefined,
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
      }
    }

    // Restore relationships
    if (Array.isArray(backupData.relationships)) {
      for (const rel of backupData.relationships) {
        if (!rel.type) continue
        await db.relationship.create({
          data: {
            id: typeof rel.id === 'string' ? rel.id : undefined,
            projectId,
            sourceId: String(rel.sourceId ?? ''),
            sourceType: String(rel.sourceType ?? ''),
            targetId: String(rel.targetId ?? ''),
            targetType: String(rel.targetType ?? ''),
            type: String(rel.type),
            description: String(rel.description ?? ''),
            strength: Number(rel.strength ?? 0),
            tags: String(rel.tags ?? '[]'),
            metadata: String(rel.metadata ?? '{}'),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backup restored successfully',
    })
  } catch (error) {
    console.error('Failed to restore backup:', error)
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const backup = await db.manuscriptVersion.findUnique({
      where: { id },
    })

    if (!backup) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    await db.manuscriptVersion.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete backup:', error)
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    )
  }
}
