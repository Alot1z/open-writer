import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').trim()
  return text ? text.split(/\s+/).length : 0
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const sceneId = request.nextUrl.searchParams.get('sceneId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { projectId }
    if (sceneId) where.sceneId = sceneId

    const versions = await db.manuscriptVersion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Failed to list versions:', error)
    return NextResponse.json(
      { error: 'Failed to list versions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, sceneId, content, label, isMilestone, isAutosave, snapshot } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const wordCount = content ? countWords(content) : 0

    const version = await db.manuscriptVersion.create({
      data: {
        projectId,
        sceneId: sceneId ?? null,
        content: content ?? '',
        wordCount,
        label: label ?? '',
        isMilestone: isMilestone ?? false,
        isAutosave: isAutosave ?? true,
        snapshot: snapshot ?? '{}',
      },
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('Failed to create version:', error)
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    )
  }
}
