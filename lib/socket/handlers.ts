import type { AgentServer, AgentSocket, AgentSession } from './types'
import { startAgentSession } from '@/lib/services/ai-agent'
import { streamAgentResponse } from '@/lib/ai/graph/appointment-graph'
import {
  addMessageAction,
  fetchConversationMessagesAction,
} from '@/lib/actions/ai-agent'
import type { AgentMessage } from '@/lib/models/ai-conversation'

export function setupSocketHandlers(io: AgentServer) {
  io.on('connection', (socket: AgentSocket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    socket.data.session = null
    socket.data.isProcessing = false
    socket.data.abortController = null

    socket.emit('connection:status', { status: 'connected' })

    socket.on('session:start', async ({ token }, callback) => {
      try {
        const result = await startAgentSession(token)

        if (!result.success || !result.session) {
          callback({ success: false, error: result.error || 'Error al iniciar sesión' })
          socket.emit('session:error', { error: result.error || 'Error al iniciar sesión' })
          return
        }

        socket.data.session = {
          sessionId: result.session.sessionId,
          conversationId: result.session.conversationId,
          businessId: result.session.businessId,
        }

        socket.join(`session:${result.session.sessionId}`)

        socket.emit('session:started', {
          session: socket.data.session,
          welcomeMessage: result.message || '¡Hola! ¿En qué puedo ayudarte?',
        })

        callback({ success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        console.error('[Socket] Session start error:', message)
        callback({ success: false, error: message })
      }
    })

    socket.on('agent:send', async ({ message }, callback) => {
      const session = socket.data.session

      if (!session) {
        callback({ success: false, error: 'Sesión no iniciada' })
        return
      }

      if (socket.data.isProcessing) {
        callback({ success: false, error: 'Procesando mensaje anterior' })
        return
      }

      socket.data.isProcessing = true
      socket.data.abortController = new AbortController()

      callback({ success: true })

      try {
        await addMessageAction({
          conversation_id: session.conversationId,
          role: 'user',
          content: message,
        })

        const messagesResult = await fetchConversationMessagesAction(session.conversationId)
        if (!messagesResult.success || !messagesResult.data) {
          socket.emit('agent:error', { error: 'Error al obtener historial' })
          return
        }

        const chatHistory = messagesResult.data
          .filter((m: AgentMessage) => m.role === 'user' || m.role === 'assistant')
          .map((m: AgentMessage) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))

        socket.emit('agent:typing', { isTyping: true })

        let fullResponse = ''
        const responseStream = streamAgentResponse(session.businessId, chatHistory)

        for await (const chunk of responseStream) {
          if (socket.data.abortController?.signal.aborted) {
            socket.emit('agent:interrupted')
            break
          }

          fullResponse += chunk
          socket.emit('agent:message', { chunk, isComplete: false })
        }

        if (!socket.data.abortController?.signal.aborted) {
          await addMessageAction({
            conversation_id: session.conversationId,
            role: 'assistant',
            content: fullResponse,
          })

          socket.emit('agent:message', { chunk: '', isComplete: true })
        }

        socket.emit('agent:typing', { isTyping: false })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        console.error('[Socket] Agent send error:', errorMessage)
        socket.emit('agent:error', { error: errorMessage })
      } finally {
        socket.data.isProcessing = false
        socket.data.abortController = null
      }
    })

    socket.on('agent:interrupt', () => {
      if (socket.data.abortController) {
        socket.data.abortController.abort()
        console.log(`[Socket] Agent interrupted for session: ${socket.data.session?.sessionId}`)
      }
    })

    socket.on('user:typing', ({ isTyping }) => {
      const session = socket.data.session
      if (session) {
        socket.to(`session:${session.sessionId}`).emit('agent:typing', { isTyping })
      }
    })

    socket.on('agent:audio:start', () => {
      console.log(`[Socket] Audio stream started: ${socket.id}`)
    })

    socket.on('agent:audio:chunk', ({ audio }) => {
      console.log(`[Socket] Audio chunk received: ${audio.byteLength} bytes`)
    })

    socket.on('agent:audio:stop', () => {
      console.log(`[Socket] Audio stream stopped: ${socket.id}`)
    })

    socket.on('session:end', (callback) => {
      const session = socket.data.session
      if (session) {
        socket.leave(`session:${session.sessionId}`)
        socket.data.session = null
      }
      callback({ success: true })
    })

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`)
      if (socket.data.abortController) {
        socket.data.abortController.abort()
      }
    })
  })
}
