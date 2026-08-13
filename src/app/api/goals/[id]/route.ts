import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const goal = await db.writingGoal.findUnique({
      where: { id },
    })
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }
    return NextResponse.json(goal)
  } catch (error) {
    console.error('Failed to get goal:', error)
    return NextResponse.json({ error: 'Failed to get goal' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, target, current, deadline, active, metadata } = body

    const goal = await db.writingGoal.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(target !== undefined && { target }),
        ...(current !== undefined && { current }),
        ...(deadline !== undefined && { deadline }),
        ...(active !== undefined && { active }),
        ...(metadata !== undefined && { metadata }),
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Failed to update goal:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.writingGoal.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete goal:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
