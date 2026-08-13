import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chapter = await db.chapter.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(chapter)
  } catch (error) {
    console.error('Failed to get chapter:', error)
    return NextResponse.json(
      { error: 'Failed to get chapter' },
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

    const chapter = await db.chapter.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.synopsis !== undefined && { synopsis: body.synopsis }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
      include: {
        scenes: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(chapter)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }
    console.error('Failed to update chapter:', error)
    return NextResponse.json(
      { error: 'Failed to update chapter' },
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
    await db.chapter.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }
    console.error('Failed to delete chapter:', error)
    return NextResponse.json(
      { error: 'Failed to delete chapter' },
      { status: 500 }
    )
  }
}
