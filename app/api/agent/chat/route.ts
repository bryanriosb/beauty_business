import { NextRequest } from 'next/server'
import { streamAgentResponseWithFeedback } from '@/lib/ai/graph/appointment-graph'
import {
  validateAndConsumeLink,
  addMessageAction,
  fetchConversationMessagesAction,
} from '@/lib/actions/ai-agent'
import { generateWaitingMessage } from '@/lib/ai/graph/feedback-generator'
import type { AgentMessage } from '@/lib/models/ai-conversation'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

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

    let fullResponse = ''
    const abortController = new AbortController()
    let isClosed = false
    const fallbackTimeouts: NodeJS.Timeout[] = []

    request.signal.addEventListener('abort', () => {
      abortController.abort()
      fallbackTimeouts.forEach(clearTimeout)
    })

    const stream = new ReadableStream({
      async start(controller) {
        let hasStartedResponse = false
        const businessName = session.settings?.assistant_name || 'el asistente'

        const sendEvent = (event: string, data: unknown) => {
          if (isClosed || abortController.signal.aborted) return
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch {
            // Controller may be closed
          }
        }

        const closeStream = () => {
          if (isClosed) return
          isClosed = true
          fallbackTimeouts.forEach(clearTimeout)
          try {
            controller.close()
          } catch {
            // Already closed
          }
        }

        const fallbackDelays = [5000, 15000]
        fallbackDelays.forEach((delay) => {
          const timeout = setTimeout(async () => {
            if (!hasStartedResponse && !abortController.signal.aborted && !isClosed) {
              const waitingMessage = await generateWaitingMessage(delay / 1000, businessName)
              sendEvent('fallback', { message: waitingMessage, speak: true })
            }
          }, delay)
          fallbackTimeouts.push(timeout)
        })

        try {
          sendEvent('typing', { isTyping: true })

          const responseStream = streamAgentResponseWithFeedback(
            session.businessId,
            session.sessionId,
            chatHistory,
            session.settings?.assistant_name
          )

          for await (const event of responseStream) {
            if (abortController.signal.aborted || isClosed) {
              sendEvent('interrupted', {})
              break
            }

            switch (event.type) {
              case 'chunk':
                if (!hasStartedResponse) {
                  hasStartedResponse = true
                  fallbackTimeouts.forEach(clearTimeout)
                }
                fullResponse += event.content
                sendEvent('message', { chunk: event.content, isComplete: false })
                break

              case 'feedback':
                sendEvent('feedback', {
                  type: event.event.type,
                  message: event.event.message,
                  toolName: event.event.toolName,
                })
                break

              case 'tool_start':
                sendEvent('tool', { status: 'start', toolName: event.toolName })
                break

              case 'tool_end':
                sendEvent('tool', {
                  status: 'end',
                  toolName: event.toolName,
                  success: event.success,
                })
                break

              case 'intent':
                sendEvent('intent', { intent: event.intent })
                break
            }
          }

          if (!abortController.signal.aborted && fullResponse.trim()) {
            await addMessageAction({
              conversation_id: session.conversationId,
              role: 'assistant',
              content: fullResponse,
            })
          }

          sendEvent('message', { chunk: '', isComplete: true })
          sendEvent('typing', { isTyping: false })
          closeStream()
        } catch (error) {
          fallbackTimeouts.forEach(clearTimeout)
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
          console.error('[SSE] Stream error:', errorMessage)
          sendEvent('error', { error: errorMessage })
          closeStream()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[SSE] Error in agent chat:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
