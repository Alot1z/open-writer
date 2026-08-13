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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
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

    // Dynamically import epub-gen-memory
    let EPub: typeof import('epub-gen-memory').default
    try {
      const epubModule = await import('epub-gen-memory')
      EPub = epubModule.default
    } catch {
      return NextResponse.json(
        { error: 'EPUB generation is not available. The epub-gen-memory package could not be loaded.' },
        { status: 500 }
      )
    }

    // Build chapters for EPUB
    const epubChapters: { title: string; content: string }[] = []

    for (const chapter of project.chapters) {
      let chapterContent = ''

      for (const scene of chapter.scenes) {
        chapterContent += `<h2>${scene.title}</h2>\n`
        if (scene.content) {
          // Use content as-is if it contains HTML, otherwise wrap in paragraphs
          if (/<[^>]+>/.test(scene.content)) {
            chapterContent += scene.content
          } else {
            const plainContent = stripHtml(scene.content)
            const paragraphs = plainContent.split('\n').filter((line: string) => line.trim())
            for (const para of paragraphs) {
              chapterContent += `<p>${para}</p>\n`
            }
          }
        }
        chapterContent += '\n'
      }

      epubChapters.push({
        title: chapter.title,
        content: chapterContent || '<p><em>Empty chapter</em></p>',
      })
    }

    if (epubChapters.length === 0) {
      epubChapters.push({
        title: 'Untitled',
        content: '<p>This project has no content yet.</p>',
      })
    }

    const epubOptions = {
      title: project.name,
      author: 'Open Writer',
      description: project.synopsis || project.description || '',
      lang: 'en',
      chapters: epubChapters,
    }

    const buffer = await EPub(epubOptions)
    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.epub`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export EPUB:', error)
    return NextResponse.json(
      { error: 'Failed to export EPUB' },
      { status: 500 }
    )
  }
}
