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

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            scenes: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const lines: string[] = []
    lines.push(`# ${project.name}`)
    lines.push('')
    if (project.synopsis) {
      lines.push(project.synopsis)
      lines.push('')
    }

    for (const chapter of project.chapters) {
      lines.push(`# ${chapter.title}`)
      lines.push('')
      if (chapter.synopsis) {
        lines.push(chapter.synopsis)
        lines.push('')
      }

      for (const scene of chapter.scenes) {
        lines.push(`## ${scene.title}`)
        lines.push('')
        if (scene.content) {
          // Strip HTML tags for markdown content
          const plainContent = scene.content
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
          lines.push(plainContent)
          lines.push('')
        }
      }
    }

    const markdown = lines.join('\n')
    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.md`

    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export markdown:', error)
    return NextResponse.json(
      { error: 'Failed to export markdown' },
      { status: 500 }
    )
  }
}
