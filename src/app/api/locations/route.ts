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

    const locations = await db.location.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(locations)
  } catch (error) {
    console.error('Failed to list locations:', error)
    return NextResponse.json(
      { error: 'Failed to list locations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name, type, description } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'projectId and name are required' },
        { status: 400 }
      )
    }

    const location = await db.location.create({
      data: {
        projectId,
        name: name.trim(),
        type: type ?? '',
        description: description ?? '',
      },
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Failed to create location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
