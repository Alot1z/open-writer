import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const note = await db.note.findUnique({
      where: { id },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('Failed to get note:', error)
    return NextResponse.json({ error: 'Failed to get note' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const note = await db.note.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.linkedType !== undefined && { linkedType: body.linkedType }),
        ...(body.linkedId !== undefined && { linkedId: body.linkedId }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.resolved !== undefined && { resolved: body.resolved }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
    })

    return NextResponse.json(note)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    console.error('Failed to update note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.note.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    console.error('Failed to delete note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
