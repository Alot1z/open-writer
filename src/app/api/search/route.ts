import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')
    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!q || !q.trim()) {
      return NextResponse.json(
        { error: 'Search query (q) is required' },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const searchTerm = q.trim()
    const results: {
      characters: unknown[]
      locations: unknown[]
      notes: unknown[]
      scenes: unknown[]
      worldElements: unknown[]
      storyObjects: unknown[]
    } = {
      characters: [],
      locations: [],
      notes: [],
      scenes: [],
      worldElements: [],
      storyObjects: [],
    }

    // Search characters
    results.characters = await db.character.findMany({
      where: {
        projectId,
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { role: { contains: searchTerm } },
          { backstory: { contains: searchTerm } },
        ],
      },
      take: 20,
    })

    // Search locations
    results.locations = await db.location.findMany({
      where: {
        projectId,
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { type: { contains: searchTerm } },
        ],
      },
      take: 20,
    })

    // Search notes
    results.notes = await db.note.findMany({
      where: {
        projectId,
        OR: [
          { title: { contains: searchTerm } },
          { content: { contains: searchTerm } },
        ],
      },
      take: 20,
    })

    // Search scenes (manuscript content)
    results.scenes = await db.scene.findMany({
      where: {
        chapter: { projectId },
        OR: [
          { title: { contains: searchTerm } },
          { content: { contains: searchTerm } },
          { notes: { contains: searchTerm } },
        ],
      },
      include: {
        chapter: {
          select: { id: true, title: true },
        },
      },
      take: 20,
    })

    // Search world elements
    results.worldElements = await db.worldElement.findMany({
      where: {
        projectId,
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { category: { contains: searchTerm } },
        ],
      },
      take: 20,
    })

    // Search story objects
    results.storyObjects = await db.storyObject.findMany({
      where: {
        projectId,
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
      },
      take: 20,
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to search:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}
