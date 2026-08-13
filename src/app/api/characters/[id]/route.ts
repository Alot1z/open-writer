import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const character = await db.character.findUnique({
      where: { id },
      include: {
        relationships: true,
      },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(character)
  } catch (error) {
    console.error('Failed to get character:', error)
    return NextResponse.json(
      { error: 'Failed to get character' },
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

    const character = await db.character.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.age !== undefined && { age: body.age }),
        ...(body.occupation !== undefined && { occupation: body.occupation }),
        ...(body.personality !== undefined && {
          personality: body.personality,
        }),
        ...(body.appearance !== undefined && { appearance: body.appearance }),
        ...(body.backstory !== undefined && { backstory: body.backstory }),
        ...(body.motivation !== undefined && { motivation: body.motivation }),
        ...(body.goals !== undefined && { goals: body.goals }),
        ...(body.fears !== undefined && { fears: body.fears }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
      include: {
        relationships: true,
      },
    })

    return NextResponse.json(character)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }
    console.error('Failed to update character:', error)
    return NextResponse.json(
      { error: 'Failed to update character' },
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
    await db.character.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }
    console.error('Failed to delete character:', error)
    return NextResponse.json(
      { error: 'Failed to delete character' },
      { status: 500 }
    )
  }
}
