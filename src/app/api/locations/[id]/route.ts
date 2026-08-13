import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const location = await db.location.findUnique({
      where: { id },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error('Failed to get location:', error)
    return NextResponse.json(
      { error: 'Failed to get location' },
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

    const location = await db.location.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.atmosphere !== undefined && { atmosphere: body.atmosphere }),
        ...(body.history !== undefined && { history: body.history }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.parentLocationId !== undefined && {
          parentLocationId: body.parentLocationId,
        }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
    })

    return NextResponse.json(location)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }
    console.error('Failed to update location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
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
    await db.location.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }
    console.error('Failed to delete location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}
