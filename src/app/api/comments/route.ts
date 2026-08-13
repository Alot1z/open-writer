import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const sceneId = request.nextUrl.searchParams.get('sceneId')

    if (!projectId && !sceneId) {
      return NextResponse.json(
        { error: 'projectId or sceneId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (sceneId) where.sceneId = sceneId

    const comments = await db.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Failed to list comments:', error)
    return NextResponse.json(
      { error: 'Failed to list comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, sceneId, content, position, linkedType, linkedId } = body

    if (!projectId || !content) {
      return NextResponse.json(
        { error: 'projectId and content are required' },
        { status: 400 }
      )
    }

    const comment = await db.comment.create({
      data: {
        projectId,
        sceneId: sceneId ?? null,
        content,
        position: position ?? '{}',
        linkedType: linkedType ?? '',
        linkedId: linkedId ?? '',
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Failed to create comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
