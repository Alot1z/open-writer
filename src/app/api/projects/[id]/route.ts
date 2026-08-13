import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            chapters: true,
            characters: true,
            locations: true,
            storyObjects: true,
            notes: true,
            timelineEvents: true,
          },
        },
        chapters: {
          include: {
            scenes: {
              select: { wordCount: true },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const totalWordCount = project.chapters.reduce(
      (sum, chapter) =>
        sum + chapter.scenes.reduce((s, scene) => s + scene.wordCount, 0),
      0
    )
    const { chapters, ...rest } = project

    return NextResponse.json({ ...rest, totalWordCount })
  } catch (error) {
    console.error('Failed to get project:', error)
    return NextResponse.json(
      { error: 'Failed to get project' },
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

    const project = await db.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.genre !== undefined && { genre: body.genre }),
        ...(body.synopsis !== undefined && { synopsis: body.synopsis }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.settings !== undefined && { settings: body.settings }),
      },
    })

    return NextResponse.json(project)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    console.error('Failed to update project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
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
    await db.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    console.error('Failed to delete project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
