import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx'

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

    const children: Paragraph[] = []

    // Project title
    children.push(
      new Paragraph({
        text: project.name,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    )

    if (project.synopsis) {
      children.push(new Paragraph({ text: '' }))
      children.push(
        new Paragraph({
          children: [new TextRun({ text: project.synopsis, italics: true, size: 22 })],
          alignment: AlignmentType.CENTER,
        })
      )
    }

    for (const chapter of project.chapters) {
      children.push(new Paragraph({ text: '' }))
      children.push(
        new Paragraph({
          text: chapter.title,
          heading: HeadingLevel.HEADING_1,
        })
      )

      if (chapter.synopsis) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: chapter.synopsis, italics: true, size: 22, color: '666666' })],
          })
        )
      }

      for (const scene of chapter.scenes) {
        children.push(new Paragraph({ text: '' }))
        children.push(
          new Paragraph({
            text: scene.title,
            heading: HeadingLevel.HEADING_2,
          })
        )

        if (scene.content) {
          const plainContent = stripHtml(scene.content)
          const contentLines = plainContent.split('\n').filter((line: string) => line.trim())
          for (const line of contentLines) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: line, size: 24 })],
              })
            )
          }
        }
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export DOCX:', error)
    return NextResponse.json(
      { error: 'Failed to export DOCX' },
      { status: 500 }
    )
  }
}
