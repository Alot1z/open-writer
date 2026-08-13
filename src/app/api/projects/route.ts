import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            chapters: true,
            characters: true,
          },
        },
        chapters: {
          include: {
            scenes: {
              select: { wordCount: true },
            },
          },
        },
      },
    })

    const result = projects.map((project) => {
      const totalWordCount = project.chapters.reduce(
        (sum, chapter) =>
          sum + chapter.scenes.reduce((s, scene) => s + scene.wordCount, 0),
        0
      )
      const { chapters, ...rest } = project
      return {
        ...rest,
        _count: project._count,
        totalWordCount,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list projects:', error)
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, genre, synopsis } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description ?? '',
        genre: genre ?? '',
        synopsis: synopsis ?? '',
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
