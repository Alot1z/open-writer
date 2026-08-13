import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const task = await db.agentTask.findUnique({
      where: { id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Parse JSON fields for the client
    const parsed = {
      ...task,
      plan: JSON.parse(task.plan || '[]'),
      toolCalls: JSON.parse(task.toolCalls || '[]'),
      observations: JSON.parse(task.observations || '[]'),
      errors: JSON.parse(task.errors || '[]'),
      artifacts: JSON.parse(task.artifacts || '[]'),
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Failed to get agent task:', error)
    return NextResponse.json(
      { error: 'Failed to get agent task' },
      { status: 500 }
    )
  }
}
