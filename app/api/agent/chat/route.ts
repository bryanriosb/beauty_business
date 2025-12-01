import { NextRequest } from 'next/server'
import { streamAgentResponse } from '@/lib/ai/graph/appointment-graph'
import {
  validateAndConsumeLink,
  addMessageAction,
  fetchConversationMessagesAction,
} from '@/lib/actions/ai-agent'
import type { AgentMessage } from '@/lib/models/ai-conversation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, session, token } = body

    if (!message || !session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mensaje y sesión requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (token) {
      const validation = await validateAndConsumeLink(token)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ success: false, error: validation.error, expired: true }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    await addMessageAction({
      conversation_id: session.conversationId,
      role: 'user',
      content: message,
    })

    const messagesResult = await fetchConversationMessagesAction(session.conversationId)
    if (!messagesResult.success || !messagesResult.data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Error al obtener historial' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const chatHistory = messagesResult.data
      .filter((m: AgentMessage) => m.role === 'user' || m.role === 'assistant')
      .map((m: AgentMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const encoder = new TextEncoder()
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const responseStream = await streamAgentResponse(session.businessId, chatHistory)

          for await (const chunk of responseStream) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
          }

          await addMessageAction({
            conversation_id: session.conversationId,
            role: 'assistant',
            content: fullResponse,
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
          console.error('Stream error:', errorMessage)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in agent chat:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
