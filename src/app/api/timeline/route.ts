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

    const timelineEvents = await db.timelineEvent.findMany({
      where: { projectId },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(timelineEvents)
  } catch (error) {
    console.error('Failed to list timeline events:', error)
    return NextResponse.json(
      { error: 'Failed to list timeline events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title, description, date, time, duration, location, characters, objects, eventType } = body

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'projectId and title are required' },
        { status: 400 }
      )
    }

    const event = await db.timelineEvent.create({
      data: {
        projectId,
        title: title.trim(),
        description: description ?? '',
        date: date ?? '',
        time: time ?? '',
        duration: duration ?? '',
        location: location ?? '',
        characters: characters ?? '[]',
        objects: objects ?? '[]',
        eventType: eventType ?? '',
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Failed to create timeline event:', error)
    return NextResponse.json(
      { error: 'Failed to create timeline event' },
      { status: 500 }
    )
  }
}
