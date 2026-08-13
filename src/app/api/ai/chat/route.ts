import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt, temperature, model, maxTokens } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      )
    }

    const { ZAI } = await import('z-ai-web-dev-sdk')
    const zai = new ZAI()

    const formattedMessages = []

    if (systemPrompt) {
      formattedMessages.push({ role: 'system' as const, content: systemPrompt })
    }

    for (const m of messages) {
      formattedMessages.push({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })
    }

    const response = await zai.llm.chat({
      messages: formattedMessages,
      model,
      temperature,
      maxTokens,
    })

    if (response && response.choices && response.choices.length > 0) {
      return NextResponse.json({
        content: response.choices[0].message?.content || response.choices[0].text || '',
      })
    }

    if (typeof response === 'string') {
      return NextResponse.json({ content: response })
    }

    return NextResponse.json({ content: JSON.stringify(response) })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI chat failed' },
      { status: 500 }
    )
  }
}
