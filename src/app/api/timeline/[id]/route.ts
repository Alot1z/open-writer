import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const event = await db.timelineEvent.findUnique({
      where: { id },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Timeline event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Failed to get timeline event:', error)
    return NextResponse.json(
      { error: 'Failed to get timeline event' },
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

    const event = await db.timelineEvent.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.date !== undefined && { date: body.date }),
        ...(body.time !== undefined && { time: body.time }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.characters !== undefined && { characters: body.characters }),
        ...(body.objects !== undefined && { objects: body.objects }),
        ...(body.sourceScene !== undefined && {
          sourceScene: body.sourceScene,
        }),
        ...(body.cause !== undefined && { cause: body.cause }),
        ...(body.consequence !== undefined && { consequence: body.consequence }),
        ...(body.eventType !== undefined && { eventType: body.eventType }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
    })

    return NextResponse.json(event)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Timeline event not found' },
        { status: 404 }
      )
    }
    console.error('Failed to update timeline event:', error)
    return NextResponse.json(
      { error: 'Failed to update timeline event' },
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
    await db.timelineEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Timeline event not found' },
        { status: 404 }
      )
    }
    console.error('Failed to delete timeline event:', error)
    return NextResponse.json(
      { error: 'Failed to delete timeline event' },
      { status: 500 }
    )
  }
}
