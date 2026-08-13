import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').trim()
  return text ? text.split(/\s+/).length : 0
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scene = await db.scene.findUnique({
      where: { id },
    })

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    return NextResponse.json(scene)
  } catch (error) {
    console.error('Failed to get scene:', error)
    return NextResponse.json(
      { error: 'Failed to get scene' },
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

    // Auto-calculate word count from content if content is provided
    let wordCount = body.wordCount
    if (body.content !== undefined && wordCount === undefined) {
      wordCount = countWords(body.content)
    }

    const scene = await db.scene.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.povCharacterId !== undefined && {
          povCharacterId: body.povCharacterId,
        }),
        ...(body.locationId !== undefined && { locationId: body.locationId }),
        ...(body.timeOfDay !== undefined && { timeOfDay: body.timeOfDay }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(wordCount !== undefined && { wordCount }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
    })

    return NextResponse.json(scene)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }
    console.error('Failed to update scene:', error)
    return NextResponse.json(
      { error: 'Failed to update scene' },
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
    await db.scene.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }
    console.error('Failed to delete scene:', error)
    return NextResponse.json(
      { error: 'Failed to delete scene' },
      { status: 500 }
    )
  }
}
