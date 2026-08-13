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

    const relationships = await db.relationship.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(relationships)
  } catch (error) {
    console.error('Failed to list relationships:', error)
    return NextResponse.json(
      { error: 'Failed to list relationships' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, sourceId, sourceType, targetId, targetType, type, description, strength } = body

    if (!projectId || !sourceId || !sourceType || !targetId || !targetType || !type) {
      return NextResponse.json(
        { error: 'projectId, sourceId, sourceType, targetId, targetType, and type are required' },
        { status: 400 }
      )
    }

    const relationship = await db.relationship.create({
      data: {
        projectId,
        sourceId,
        sourceType,
        targetId,
        targetType,
        type,
        description: description ?? '',
        strength: strength ?? 0,
      },
    })

    return NextResponse.json(relationship, { status: 201 })
  } catch (error) {
    console.error('Failed to create relationship:', error)
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    )
  }
}
