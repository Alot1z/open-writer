import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const worldElement = await db.worldElement.findUnique({
      where: { id },
    })

    if (!worldElement) {
      return NextResponse.json(
        { error: 'World element not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(worldElement)
  } catch (error) {
    console.error('Failed to get world element:', error)
    return NextResponse.json(
      { error: 'Failed to get world element' },
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

    const worldElement = await db.worldElement.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.parent !== undefined && { parent: body.parent }),
        ...(body.rules !== undefined && { rules: body.rules }),
        ...(body.history !== undefined && { history: body.history }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
    })

    return NextResponse.json(worldElement)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'World element not found' },
        { status: 404 }
      )
    }
    console.error('Failed to update world element:', error)
    return NextResponse.json(
      { error: 'Failed to update world element' },
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
    await db.worldElement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'World element not found' },
        { status: 404 }
      )
    }
    console.error('Failed to delete world element:', error)
    return NextResponse.json(
      { error: 'Failed to delete world element' },
      { status: 500 }
    )
  }
}
