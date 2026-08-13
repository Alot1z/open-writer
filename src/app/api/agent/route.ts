import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SYSTEM_PROMPT = `You are an AI writing assistant for Open Writer, a creative writing studio. You help writers with:
- Continuing stories and scenes
- Rewriting and improving passages
- Analyzing character arcs and development
- Checking for continuity issues
- Generating synopses
- Suggesting dialogue
- World-building assistance

Always provide thoughtful, creative responses that respect the writer's voice and style.
When suggesting text, format it clearly so it can be easily applied.
Never make changes without the writer's approval - you are a collaborator, not a replacement.`

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId

    const tasks = await db.agentTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to list agent tasks:', error)
    return NextResponse.json(
      { error: 'Failed to list agent tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, goal, permission, messages, temperature } = body

    // Chat action - uses Z.ai SDK on the server
    if (action === 'chat') {
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json(
          { error: 'messages array is required for chat action' },
          { status: 400 }
        )
      }

      try {
        const { ZAI } = await import('z-ai-web-dev-sdk')
        const zai = new ZAI()

        const formattedMessages = [
          { role: 'system' as const, content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
        ]

        const response = await zai.llm.chat({
          messages: formattedMessages,
          temperature: temperature ?? 0.7,
        })

        let responseText = ''
        if (response && typeof response === 'object' && 'choices' in response) {
          const choices = response.choices as Array<{ message?: { content?: string }; text?: string }>
          if (choices && choices.length > 0) {
            responseText = choices[0].message?.content || choices[0].text || ''
          }
        } else if (typeof response === 'string') {
          responseText = response
        } else {
          responseText = JSON.stringify(response)
        }

        return NextResponse.json({ response: responseText })
      } catch (aiError) {
        console.error('Z.ai chat error:', aiError)
        return NextResponse.json(
          { error: `AI unavailable: ${aiError instanceof Error ? aiError.message : 'Unknown error'}` },
          { status: 503 }
        )
      }
    }

    // Create task action (default)
    if (!goal || !goal.trim()) {
      return NextResponse.json(
        { error: 'goal is required' },
        { status: 400 }
      )
    }

    const task = await db.agentTask.create({
      data: {
        projectId: projectId ?? '',
        goal: goal.trim(),
        permission: permission ?? 'suggest',
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to process agent request:', error)
    return NextResponse.json(
      { error: 'Failed to process agent request' },
      { status: 500 }
    )
  }
}
