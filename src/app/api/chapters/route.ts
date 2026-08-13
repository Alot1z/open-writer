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

    const chapters = await db.chapter.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        scenes: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(chapters)
  } catch (error) {
    console.error('Failed to list chapters:', error)
    return NextResponse.json(
      { error: 'Failed to list chapters' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title, order } = body

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'projectId and title are required' },
        { status: 400 }
      )
    }

    // Auto-calculate order if not provided
    let chapterOrder = order
    if (chapterOrder === undefined || chapterOrder === null) {
      const maxOrder = await db.chapter.aggregate({
        where: { projectId },
        _max: { order: true },
      })
      chapterOrder = (maxOrder._max.order ?? -1) + 1
    }

    const chapter = await db.chapter.create({
      data: {
        projectId,
        title: title.trim(),
        order: chapterOrder,
      },
      include: {
        scenes: true,
      },
    })

    return NextResponse.json(chapter, { status: 201 })
  } catch (error) {
    console.error('Failed to create chapter:', error)
    return NextResponse.json(
      { error: 'Failed to create chapter' },
      { status: 500 }
    )
  }
}
