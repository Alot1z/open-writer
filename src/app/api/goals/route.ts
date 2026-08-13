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

    const goals = await db.writingGoal.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Failed to list goals:', error)
    return NextResponse.json(
      { error: 'Failed to list goals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, type, target, current, deadline, active } = body

    if (!projectId || !type) {
      return NextResponse.json(
        { error: 'projectId and type are required' },
        { status: 400 }
      )
    }

    // If an active goal of the same type exists for this project, update it
    const existingGoal = await db.writingGoal.findFirst({
      where: { projectId, type, active: true },
    })

    if (existingGoal) {
      const updated = await db.writingGoal.update({
        where: { id: existingGoal.id },
        data: {
          ...(target !== undefined && { target }),
          ...(current !== undefined && { current }),
          ...(deadline !== undefined && { deadline }),
          ...(active !== undefined && { active }),
        },
      })
      return NextResponse.json(updated)
    }

    const goal = await db.writingGoal.create({
      data: {
        projectId,
        type,
        target: target ?? 0,
        current: current ?? 0,
        deadline: deadline ?? '',
        active: active ?? true,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Failed to create/update goal:', error)
    return NextResponse.json(
      { error: 'Failed to create/update goal' },
      { status: 500 }
    )
  }
}
