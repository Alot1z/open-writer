import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, content } = body

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

    // Parse markdown: H1 = Chapter, H2 = Scene
    const lines = content.split('\n')
    const chapters: { title: string; scenes: { title: string; content: string }[] }[] = []
    let currentChapter: (typeof chapters)[number] | null = null
    let currentScene: { title: string; content: string } | null = null

    for (const line of lines) {
      const h1Match = line.match(/^#\s+(.+)/)
      const h2Match = line.match(/^##\s+(.+)/)

      if (h1Match) {
        // Save previous scene
        if (currentScene && currentChapter) {
          currentChapter.scenes.push(currentScene)
        }
        currentScene = null

        // New chapter
        currentChapter = { title: h1Match[1].trim(), scenes: [] }
        chapters.push(currentChapter)
      } else if (h2Match) {
        // Save previous scene
        if (currentScene && currentChapter) {
          currentChapter.scenes.push(currentScene)
        }

        // New scene
        currentScene = { title: h2Match[1].trim(), content: '' }
        if (currentChapter) {
          currentChapter.scenes.push(currentScene)
        }
      } else {
        // Content line
        if (currentScene) {
          currentScene.content += (currentScene.content ? '\n' : '') + line
        }
      }
    }

    // Save last scene
    if (currentScene && currentChapter) {
      // Already pushed above
    }

    if (chapters.length === 0) {
      return NextResponse.json(
        { error: 'No chapters found in markdown. Use # for chapter titles and ## for scene titles.' },
        { status: 400 }
      )
    }

    // Get existing chapter count for ordering
    const existingChapters = await db.chapter.count({ where: { projectId } })

    const created: { chapters: number; scenes: number } = { chapters: 0, scenes: 0 }

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      const chapter = await db.chapter.create({
        data: {
          projectId,
          title: ch.title,
          order: existingChapters + i,
        },
      })
      created.chapters++

      for (let j = 0; j < ch.scenes.length; j++) {
        const sc = ch.scenes[j]
        await db.scene.create({
          data: {
            chapterId: chapter.id,
            title: sc.title,
            content: sc.content.trim(),
            order: j,
            wordCount: sc.content.trim().split(/\s+/).filter(Boolean).length,
          },
        })
        created.scenes++
      }
    }

    return NextResponse.json({
      success: true,
      imported: created,
    })
  } catch (error) {
    console.error('Failed to import markdown:', error)
    return NextResponse.json(
      { error: 'Failed to import markdown' },
      { status: 500 }
    )
  }
}
