import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const chapterId = request.nextUrl.searchParams.get('chapterId')
    if (!chapterId) {
      return NextResponse.json(
        { error: 'chapterId query parameter is required' },
        { status: 400 }
      )
    }

    const scenes = await db.scene.findMany({
      where: { chapterId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(scenes)
  } catch (error) {
    console.error('Failed to list scenes:', error)
    return NextResponse.json(
      { error: 'Failed to list scenes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chapterId, title, order } = body

    if (!chapterId || !title) {
      return NextResponse.json(
        { error: 'chapterId and title are required' },
        { status: 400 }
      )
    }

    // Auto-calculate order if not provided
    let sceneOrder = order
    if (sceneOrder === undefined || sceneOrder === null) {
      const maxOrder = await db.scene.aggregate({
        where: { chapterId },
        _max: { order: true },
      })
      sceneOrder = (maxOrder._max.order ?? -1) + 1
    }

    const scene = await db.scene.create({
      data: {
        chapterId,
        title: title.trim(),
        order: sceneOrder,
      },
    })

    return NextResponse.json(scene, { status: 201 })
  } catch (error) {
    console.error('Failed to create scene:', error)
    return NextResponse.json(
      { error: 'Failed to create scene' },
      { status: 500 }
    )
  }
}
