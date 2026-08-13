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

    const htmlParts: string[] = []
    htmlParts.push(`<!DOCTYPE html>`)
    htmlParts.push(`<html lang="en">`)
    htmlParts.push(`<head>`)
    htmlParts.push(`<meta charset="UTF-8">`)
    htmlParts.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0">`)
    htmlParts.push(`<title>${escapeHtml(project.name)}</title>`)
    htmlParts.push(`<style>`)
    htmlParts.push(`  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; color: #333; }`)
    htmlParts.push(`  h1 { font-size: 2em; margin-top: 2em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }`)
    htmlParts.push(`  h2 { font-size: 1.5em; margin-top: 1.5em; color: #555; }`)
    htmlParts.push(`  .synopsis { font-style: italic; color: #666; margin-bottom: 2em; }`)
    htmlParts.push(`  .chapter-synopsis { font-style: italic; color: #888; font-size: 0.9em; }`)
    htmlParts.push(`  .scene-content { margin-bottom: 1em; }`)
    htmlParts.push(`</style>`)
    htmlParts.push(`</head>`)
    htmlParts.push(`<body>`)
    htmlParts.push(`<h1>${escapeHtml(project.name)}</h1>`)

    if (project.synopsis) {
      htmlParts.push(`<p class="synopsis">${escapeHtml(project.synopsis)}</p>`)
    }

    for (const chapter of project.chapters) {
      htmlParts.push(`<h1>${escapeHtml(chapter.title)}</h1>`)
      if (chapter.synopsis) {
        htmlParts.push(`<p class="chapter-synopsis">${escapeHtml(chapter.synopsis)}</p>`)
      }

      for (const scene of chapter.scenes) {
        htmlParts.push(`<h2>${escapeHtml(scene.title)}</h2>`)
        if (scene.content) {
          // If content has HTML tags, use as-is; otherwise wrap in paragraphs
          if (/<[^>]+>/.test(scene.content)) {
            htmlParts.push(`<div class="scene-content">${scene.content}</div>`)
          } else {
            const paragraphs = scene.content.split('\n').filter((line: string) => line.trim())
            for (const para of paragraphs) {
              htmlParts.push(`<div class="scene-content"><p>${escapeHtml(para)}</p></div>`)
            }
          }
        }
      }
    }

    htmlParts.push(`</body>`)
    htmlParts.push(`</html>`)

    const html = htmlParts.join('\n')
    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.html`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export HTML:', error)
    return NextResponse.json(
      { error: 'Failed to export HTML' },
      { status: 500 }
    )
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
