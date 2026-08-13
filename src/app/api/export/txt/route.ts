import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

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
    lines.push(project.name)
    lines.push('='.repeat(project.name.length))
    lines.push('')

    if (project.synopsis) {
      lines.push(project.synopsis)
      lines.push('')
    }

    for (const chapter of project.chapters) {
      lines.push(chapter.title)
      lines.push('-'.repeat(chapter.title.length))
      lines.push('')

      if (chapter.synopsis) {
        lines.push(chapter.synopsis)
        lines.push('')
      }

      for (const scene of chapter.scenes) {
        lines.push(`  ${scene.title}`)
        lines.push(`  ${'~'.repeat(scene.title.length)}`)
        lines.push('')

        if (scene.content) {
          const plainContent = stripHtml(scene.content)
          // Indent scene content slightly
          const indentedContent = plainContent
            .split('\n')
            .map((line: string) => (line.trim() ? `  ${line}` : ''))
            .join('\n')
          lines.push(indentedContent)
          lines.push('')
        }
      }
    }

    const text = lines.join('\n')
    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`

    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export plain text:', error)
    return NextResponse.json(
      { error: 'Failed to export plain text' },
      { status: 500 }
    )
  }
}
