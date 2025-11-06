'use client'

import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { usePathname } from 'next/navigation'
import { useAgentService } from '@/hooks/useAgentService'
import { useAgentStream } from '@/hooks/useAgentStream'
import { useThreads } from '@/hooks/useThreads'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Send, Loader2, Brain, MessageCirclePlus } from 'lucide-react'
import { MarkdownMessage } from './MarkdownMessage'
import type {
  AgentRequest,
  AgentResponse,
  ThreadInfo,
} from '@/lib/types/agent-stream'
import AgentStateVisualization from './AgentStateVisualization'

interface AIAssistantProps {
  url: string
  userId?: string
  onThreadIdChange?: (threadId: string | null) => void // Callback cuando cambia el thread_id
  currentThreadTitle?: string // Título del thread actual
}

export interface AIAssistantRef {
  loadThread: (thread: ThreadInfo) => Promise<void>
  startNewConversation: () => void
  getCurrentThreadId: () => string | null
}

interface Message {
  type: 'user' | 'assistant' | 'error' | 'thinking'
  text: string
  metadata?: AgentResponse['metadata']
  isStreaming?: boolean
  preview?: string
}

export const AIAssistant = forwardRef<AIAssistantRef, AIAssistantProps>(
  ({ url, userId = '7', onThreadIdChange, currentThreadTitle }, ref) => {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [currentThinkingIndex, setCurrentThinkingIndex] = useState<
      number | null
    >(null)
    const [progressStatus, setProgressStatus] = useState<string>('')
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    // Usar el servicio centralizado de agentes
    const { service, isConnected, isConnecting, error } = useAgentService({
      url,
      autoConnect: true,
    })

    const { loadMessages, messages: threadMessages } = useThreads({
      service,
      userId,
    })

    const { sendQuery, isStreaming } = useAgentStream({
      service,
      onThinking: (content: string) => {
        setMessages((prev) => {
          const newMessages = [...prev]

          // Buscar el último mensaje de thinking que esté streaming
          let thinkingIndex = -1
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (
              newMessages[i].type === 'thinking' &&
              newMessages[i].isStreaming
            ) {
              thinkingIndex = i
              break
            }
          }

          if (thinkingIndex !== -1) {
            // Actualizar mensaje de thinking existente
            const currentMsg = newMessages[thinkingIndex]
            const fullText = currentMsg.text + content

            // Extraer últimas palabras para preview (últimas 10-15 palabras)
            const words = fullText.split(/\s+/)
            const previewWords = words.slice(-15).join(' ')

            newMessages[thinkingIndex] = {
              ...currentMsg,
              text: fullText,
              preview: previewWords,
              isStreaming: true,
            }

            // Actualizar el índice si es necesario
            if (currentThinkingIndex !== thinkingIndex) {
              setCurrentThinkingIndex(thinkingIndex)
            }
          } else {
            // Crear nuevo mensaje de thinking
            newMessages.push({
              type: 'thinking',
              text: content,
              preview: content,
              isStreaming: true,
            })
            setCurrentThinkingIndex(newMessages.length - 1)
          }
          return newMessages
        })
      },
      onContent: (content: string) => {
        // console.log('💬 onContent recibido:', content)
        setMessages((prev) => {
          const newMessages = [...prev]

          // Eliminar mensaje de thinking si existe (en el primer chunk de content)
          const thinkingIndex = newMessages.findIndex(
            (msg) => msg.type === 'thinking' && msg.isStreaming
          )
          if (thinkingIndex !== -1) {
            newMessages.splice(thinkingIndex, 1)
            setCurrentThinkingIndex(null)
          }

          const lastMsg = newMessages[newMessages.length - 1]

          if (lastMsg && lastMsg.type === 'assistant' && lastMsg.isStreaming) {
            // Actualizar mensaje existente
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              text: lastMsg.text + content,
            }
          } else {
            // Crear nuevo mensaje de asistente solo si el contenido no está vacío
            const trimmedContent = content.trim()
            if (trimmedContent || content.length > 0) {
              newMessages.push({
                type: 'assistant',
                text: content,
                isStreaming: true,
              })
            }
          }
          return newMessages
        })
      },
      onProgress: (step: string) => {
        console.log('💬 onProgress recibido:', step)
        setProgressStatus(step)
      },
      onError: (err: Error) => {
        setMessages((prev) => [
          ...prev,
          {
            type: 'error',
            text: err.message,
          },
        ])
        setCurrentThinkingIndex(null)
        setProgressStatus('')
      },
      onComplete: (response: AgentResponse) => {
        console.log('✅ onComplete recibido:', response)

        // Guardar o actualizar thread_id
        if (response.thread_id) {
          setCurrentThreadId(response.thread_id)
          onThreadIdChange?.(response.thread_id)
          console.log('💾 Thread ID guardado:', response.thread_id)
        }

        setMessages((prev) => {
          const newMessages = [...prev]

          // Eliminar cualquier mensaje de thinking restante (por si acaso)
          const thinkingIndex = newMessages.findIndex(
            (msg) => msg.type === 'thinking'
          )
          if (thinkingIndex !== -1) {
            newMessages.splice(thinkingIndex, 1)
          }

          // Buscar el último mensaje de asistente QUE ESTÉ STREAMING (de la consulta actual)
          let lastAssistantIndex = -1
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (
              newMessages[i].type === 'assistant' &&
              newMessages[i].isStreaming
            ) {
              lastAssistantIndex = i
              break
            }
          }

          // Determinar si el resultado es válido
          const hasValidResult =
            response.result &&
            response.result.trim() !== '' &&
            response.result !== 'No agent result found'

          if (lastAssistantIndex !== -1 && hasValidResult) {
            // Actualizar mensaje de asistente existente con metadata solo si hay resultado válido
            newMessages[lastAssistantIndex] = {
              ...newMessages[lastAssistantIndex],
              metadata: response.metadata,
              isStreaming: false,
            }
          } else if (lastAssistantIndex !== -1 && !hasValidResult) {
            // Eliminar el mensaje de asistente sin contenido válido y mostrar error
            newMessages.splice(lastAssistantIndex, 1)
            newMessages.push({
              type: 'error',
              text:
                response.error ||
                'Lo siento, no pude procesar tu solicitud. Por favor, intenta reformular tu pregunta.',
            })
          } else if (hasValidResult) {
            // Si no hay mensaje de asistente, crear uno con el resultado
            newMessages.push({
              type: 'assistant',
              text: response.result,
              metadata: response.metadata,
              isStreaming: false,
            })
          } else {
            // No hay mensaje de asistente y no hay resultado válido
            newMessages.push({
              type: 'error',
              text:
                response.error ||
                'Lo siento, no pude procesar tu solicitud. Por favor, intenta reformular tu pregunta.',
            })
          }

          return newMessages
        })

        setCurrentThinkingIndex(null)
        setProgressStatus('')
      },
    })

    // Auto-scroll al final cuando hay nuevos mensajes
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
      scrollToBottom()
    }, [messages])

    const sendMessage = async (query: string) => {
      if (!query.trim() || isStreaming) return

      // Resetear el índice de thinking antes de empezar
      setCurrentThinkingIndex(null)
      setMessages((prev) => [...prev, { type: 'user', text: query }])

      // Construir el request sin incluir thread_id si es null
      const requestOptions: Partial<AgentRequest> = {
        user_id: userId,
        session_path: pathname,
      }

      // Solo incluir thread_id si existe (no null/undefined)
      if (currentThreadId) {
        requestOptions.thread_id = currentThreadId
      }

      await sendQuery(query, requestOptions)
    }

    const startNewConversation = () => {
      setCurrentThreadId(null)
      setMessages([])
      onThreadIdChange?.(null)

      // Limpiar thread_id en el servicio para asegurar que no se envíe en la siguiente query
      if (service) {
        service.clearCurrentThreadId()
      }

      console.log('🆕 Nueva conversación iniciada')
    }

    /**
     * Carga un thread existente con su historial de mensajes
     */
    const loadThread = async (thread: ThreadInfo) => {
      if (!service) return

      // ✅ Limpiar mensajes ANTES de cargar el nuevo thread
      setMessages([])
      setIsLoadingHistory(true)
      setCurrentThreadId(thread.id)
      onThreadIdChange?.(thread.id)
      console.log('📂 Cargando thread:', thread.id)

      try {
        await loadMessages(thread.id)
      } catch (err) {
        console.error('Error al cargar thread:', err)
        setMessages([
          {
            type: 'error',
            text: 'Error al cargar el historial de conversación',
          },
        ])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    // Sincronizar mensajes del thread con el estado local
    useEffect(() => {
      if (threadMessages.length > 0 && !isLoadingHistory) {
        const convertedMessages: Message[] = threadMessages.map((msg) => ({
          type: msg.role,
          text: msg.content,
          metadata: msg.metadata
            ? {
                agent_used: msg.agent_name || 'unknown',
                duration_ms: 0,
                steps: 0,
                ...msg.metadata,
              }
            : undefined,
          isStreaming: false,
        }))
        console.log(
          '📂 Sincronizando mensajes del thread con el estado local:',
          convertedMessages
        )

        setMessages(convertedMessages)
      }
    }, [threadMessages, isLoadingHistory])

    // Exponer funciones para uso externo (si se necesita ref)
    useEffect(() => {
      if (currentThreadId) {
        onThreadIdChange?.(currentThreadId)
      }
    }, [currentThreadId, onThreadIdChange])

    // Exponer métodos mediante useImperativeHandle
    useImperativeHandle(ref, () => ({
      loadThread,
      startNewConversation,
      getCurrentThreadId: () => currentThreadId,
    }))

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      sendMessage(inputValue)
      setInputValue('')
    }

    return (
      <div className="flex flex-col h-full">
        {/* Status */}
        <div className="flex-shrink-0">
          <div className="flex items-center h-4 mb-1">
            <div className="h-8 flex items-center justify-between w-full">
              {isConnecting && (
                <p className="text-sm text-muted-foreground">Conectando...</p>
              )}
              {isConnected && (
                <div className="flex items-center justify-center gap-2 relative left-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-600 opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-green-600"></span>
                  </span>
                  {currentThreadId && currentThreadTitle && (
                    <span className="text-xs text-muted-foreground">
                      {currentThreadTitle.slice(0, 40)}...
                    </span>
                  )}
                </div>
              )}
              {error && (
                <p className="text-sm text-destructive">
                  Error: {error.message}
                </p>
              )}
            </div>
            {currentThreadId && (
              <Button
                variant="outline"
                className="relative bottom-2.5"
                onClick={startNewConversation}
                disabled={isStreaming}
              >
                <MessageCirclePlus />
              </Button>
            )}
          </div>
          {progressStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{progressStatus}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-5">
          <div className="grid gap-4 pb-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.type === 'user'
                    ? 'justify-end'
                    : msg.type === 'thinking'
                    ? 'justify-stretch w-full'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg p-3 select-text ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground max-w-[550px]'
                      : msg.type === 'error'
                      ? 'bg-muted/80 dark:bg-muted/50 text-muted-foreground/90 dark:text-muted-foreground border border-border/50 max-w-[550px]'
                      : msg.type === 'thinking'
                      ? 'w-full bg-muted/50 dark:bg-muted/30 text-muted-foreground border border-border/40'
                      : 'bg-muted max-w-[550px] animate-slide-in-left'
                  }`}
                >
                  {msg.type === 'thinking' ? (
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 relative">
                        <Brain className="h-4 w-4 flex-shrink-0" />
                        <div className="absolute -left-2 -top-5">
                          <AgentStateVisualization
                            state="thinking"
                            height={60}
                            width={120}
                          />
                        </div>
                      </div>
                      {msg.preview && (
                        <p className="text-xs text-muted-foreground/80 italic pl-6 h-8">
                          {msg.preview}
                          {msg.isStreaming && '...'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <MarkdownMessage content={msg.text} />
                  )}
                  {msg.metadata && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs opacity-70 select-text">
                        Agente: {msg.metadata.agent_used} • Duración:{' '}
                        {msg.metadata.duration_ms}ms
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Elemento invisible para hacer scroll al final */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input fijo en la parte inferior */}
        <div className="flex-shrink-0 pt-2 border-t bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu consulta..."
              disabled={!isConnected || isStreaming}
              className="flex-1 text-sm"
            />
            <Button
              type="submit"
              disabled={!isConnected || isStreaming || !inputValue.trim()}
              size="icon"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    )
  }
)

AIAssistant.displayName = 'AIAssistant'
