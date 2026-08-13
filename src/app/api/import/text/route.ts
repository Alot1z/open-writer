import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, content, title } = body as {
      projectId: string
      content: string
      title?: string
    }

    if (!projectId || !content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'projectId and content (string) are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get existing chapter count for ordering
    const existingChapters = await db.chapter.count({ where: { projectId } })

    const chapterTitle = title || 'Imported Text'
    const wordCount = content.split(/\s+/).filter(Boolean).length

    // Create a single chapter with a single scene
    const chapter = await db.chapter.create({
      data: {
        projectId,
        title: chapterTitle,
        order: existingChapters,
      },
    })

    const scene = await db.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'Content',
        content,
        order: 0,
        wordCount,
      },
    })

    return NextResponse.json({
      success: true,
      imported: {
        chapters: 1,
        scenes: 1,
        wordCount,
      },
      chapter,
      scene,
    })
  } catch (error) {
    console.error('Failed to import text:', error)
    return NextResponse.json(
      { error: 'Failed to import text' },
      { status: 500 }
    )
  }
}
