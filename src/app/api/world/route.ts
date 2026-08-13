import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const category = request.nextUrl.searchParams.get('category')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { projectId }
    if (category) {
      where.category = category
    }

    const worldElements = await db.worldElement.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(worldElements)
  } catch (error) {
    console.error('Failed to list world elements:', error)
    return NextResponse.json(
      { error: 'Failed to list world elements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name, description, category, parent, rules, history } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'projectId and name are required' },
        { status: 400 }
      )
    }

    const worldElement = await db.worldElement.create({
      data: {
        projectId,
        name: name.trim(),
        description: description ?? '',
        category: category ?? '',
        parent: parent ?? '',
        rules: rules ?? '',
        history: history ?? '',
      },
    })

    return NextResponse.json(worldElement, { status: 201 })
  } catch (error) {
    console.error('Failed to create world element:', error)
    return NextResponse.json(
      { error: 'Failed to create world element' },
      { status: 500 }
    )
  }
}
