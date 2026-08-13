import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const [chapters, characters, locations, storyObjects, worldElements, timelineEvents, relationships, notes] =
      await Promise.all([
        db.chapter.findMany({
          where: { projectId },
          orderBy: { order: 'asc' },
          include: {
            scenes: {
              orderBy: { order: 'asc' },
            },
          },
        }),
        db.character.findMany({ where: { projectId } }),
        db.location.findMany({ where: { projectId } }),
        db.storyObject.findMany({ where: { projectId } }),
        db.worldElement.findMany({ where: { projectId } }),
        db.timelineEvent.findMany({ where: { projectId } }),
        db.relationship.findMany({ where: { projectId } }),
        db.note.findMany({ where: { projectId } }),
      ])

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
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

    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export JSON:', error)
    return NextResponse.json(
      { error: 'Failed to export JSON' },
      { status: 500 }
    )
  }
}
