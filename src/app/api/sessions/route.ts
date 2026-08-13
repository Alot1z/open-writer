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

    const sessions = await db.writingSession.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Failed to list sessions:', error)
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, wordsWritten, duration, date } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const session = await db.writingSession.create({
      data: {
        projectId,
        wordsWritten: wordsWritten ?? 0,
        duration: duration ?? 0,
        date: date ?? new Date().toISOString().split('T')[0],
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
