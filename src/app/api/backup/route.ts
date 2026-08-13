import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Export all project data
    const [chapters, characters, locations, storyObjects, worldElements, timelineEvents, relationships, notes] =
      await Promise.all([
        db.chapter.findMany({
          where: { projectId },
          orderBy: { order: 'asc' },
          include: { scenes: { orderBy: { order: 'asc' } } },
        }),
        db.character.findMany({ where: { projectId } }),
        db.location.findMany({ where: { projectId } }),
        db.storyObject.findMany({ where: { projectId } }),
        db.worldElement.findMany({ where: { projectId } }),
        db.timelineEvent.findMany({ where: { projectId } }),
        db.relationship.findMany({ where: { projectId } }),
        db.note.findMany({ where: { projectId } }),
      ])

    // Calculate word counts
    let totalWords = 0
    for (const chapter of chapters) {
      for (const scene of chapter.scenes) {
        totalWords += scene.wordCount
      }
    }

    const backupData = {
      version: '1.0',
      type: 'open-writer-backup',
      exportedAt: new Date().toISOString(),
      metadata: {
        totalWords,
        chapterCount: chapters.length,
        characterCount: characters.length,
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
      chapters,
      characters,
      locations,
      storyObjects,
      worldElements,
      timelineEvents,
      relationships,
      notes,
    }

    const backupJson = JSON.stringify(backupData)
    const checksum = await computeSha256(backupJson)

    // Store as a ManuscriptVersion
    const version = await db.manuscriptVersion.create({
      data: {
        projectId,
        content: backupJson,
        wordCount: totalWords,
        label: `Backup ${new Date().toISOString()}`,
        isMilestone: true,
        isAutosave: false,
        snapshot: JSON.stringify({
          checksum,
          timestamp: backupData.exportedAt,
          version: backupData.version,
          totalWords,
          chapterCount: chapters.length,
          characterCount: characters.length,
          sizeBytes: new TextEncoder().encode(backupJson).length,
        }),
      },
    })

    return NextResponse.json({
      id: version.id,
      checksum,
      timestamp: backupData.exportedAt,
      totalWords,
      sizeBytes: new TextEncoder().encode(backupJson).length,
      data: backupData,
    })
  } catch (error) {
    console.error('Failed to create backup:', error)
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const backups = await db.manuscriptVersion.findMany({
      where: {
        projectId,
        label: { startsWith: 'Backup' },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = backups.map((b) => {
      let snapshot: Record<string, unknown> = {}
      try {
        snapshot = JSON.parse(b.snapshot)
      } catch {
        // ignore parse errors
      }

      return {
        id: b.id,
        label: b.label,
        wordCount: b.wordCount,
        createdAt: b.createdAt,
        checksum: snapshot.checksum ?? '',
        timestamp: snapshot.timestamp ?? '',
        sizeBytes: snapshot.sizeBytes ?? 0,
        chapterCount: snapshot.chapterCount ?? 0,
        characterCount: snapshot.characterCount ?? 0,
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Failed to list backups:', error)
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    )
  }
}
