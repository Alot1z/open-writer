import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const storyObject = await db.storyObject.findUnique({
      where: { id },
    })

    if (!storyObject) {
      return NextResponse.json(
        { error: 'Story object not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(storyObject)
  } catch (error) {
    console.error('Failed to get story object:', error)
    return NextResponse.json(
      { error: 'Failed to get story object' },
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

    const storyObject = await db.storyObject.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.owner !== undefined && { owner: body.owner }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.history !== undefined && { history: body.history }),
        ...(body.appearance !== undefined && { appearance: body.appearance }),
        ...(body.significance !== undefined && {
          significance: body.significance,
        }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
    })

    return NextResponse.json(storyObject)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Story object not found' },
        { status: 404 }
      )
    }
    console.error('Failed to update story object:', error)
    return NextResponse.json(
      { error: 'Failed to update story object' },
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
    await db.storyObject.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Story object not found' },
        { status: 404 }
      )
    }
    console.error('Failed to delete story object:', error)
    return NextResponse.json(
      { error: 'Failed to delete story object' },
      { status: 500 }
    )
  }
}
