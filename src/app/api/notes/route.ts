import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const category = request.nextUrl.searchParams.get('category')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { projectId }
    if (category) {
      where.category = category
    }

    const notes = await db.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Failed to list notes:', error)
    return NextResponse.json(
      { error: 'Failed to list notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title, content, category, linkedType, linkedId, priority } = body

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'projectId and title are required' },
        { status: 400 }
      )
    }

    const note = await db.note.create({
      data: {
        projectId,
        title: title.trim(),
        content: content ?? '',
        category: category ?? 'general',
        linkedType: linkedType ?? '',
        linkedId: linkedId ?? '',
        priority: priority ?? 0,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Failed to create note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}
