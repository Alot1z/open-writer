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

    const characters = await db.character.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(characters)
  } catch (error) {
    console.error('Failed to list characters:', error)
    return NextResponse.json(
      { error: 'Failed to list characters' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name, role, description, age, occupation } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'projectId and name are required' },
        { status: 400 }
      )
    }

    const character = await db.character.create({
      data: {
        projectId,
        name: name.trim(),
        role: role ?? '',
        description: description ?? '',
        age: age ?? '',
        occupation: occupation ?? '',
      },
    })

    return NextResponse.json(character, { status: 201 })
  } catch (error) {
    console.error('Failed to create character:', error)
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    )
  }
}
