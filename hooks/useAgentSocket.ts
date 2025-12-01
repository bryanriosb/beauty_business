'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSocket, connectSocket, disconnectSocket, type AgentClientSocket } from '@/lib/socket/client'
import type { AgentSession } from '@/lib/socket/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface UseAgentSocketOptions {
  token: string
  onMessage?: (message: Message) => void
  onError?: (error: string) => void
  onSessionStart?: (session: AgentSession, welcomeMessage: string) => void
}

interface UseAgentSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  isProcessing: boolean
  session: AgentSession | null
  messages: Message[]
  sendMessage: (message: string) => Promise<void>
  interruptAgent: () => void
  connect: () => void
  disconnect: () => void
  setTyping: (isTyping: boolean) => void
  agentTyping: boolean
}

export function useAgentSocket({
  token,
  onMessage,
  onError,
  onSessionStart,
}: UseAgentSocketOptions): UseAgentSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [session, setSession] = useState<AgentSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [agentTyping, setAgentTyping] = useState(false)

  const socketRef = useRef<AgentClientSocket | null>(null)
  const currentMessageRef = useRef<string>('')
  const currentMessageIdRef = useRef<string>('')

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    setIsConnecting(true)
    const socket = connectSocket()
    socketRef.current = socket

    // Remove all existing listeners to prevent duplicates
    socket.removeAllListeners()

    socket.on('connect', () => {
      setIsConnected(true)
      setIsConnecting(false)

      socket.emit('session:start', { token }, (response) => {
        if (!response.success) {
          onError?.(response.error || 'Error al iniciar sesión')
        }
      })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setSession(null)
    })

    socket.on('connection:status', ({ status }) => {
      setIsConnected(status === 'connected')
      setIsConnecting(status === 'reconnecting')
    })

    socket.on('session:started', ({ session: newSession, welcomeMessage }) => {
      setSession(newSession)

      const welcomeMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: welcomeMessage,
      }
      setMessages([welcomeMsg])
      onMessage?.(welcomeMsg)
      onSessionStart?.(newSession, welcomeMessage)
    })

    socket.on('session:error', ({ error }) => {
      onError?.(error)
    })

    socket.on('agent:typing', ({ isTyping }) => {
      setAgentTyping(isTyping)
    })

    socket.on('agent:message', ({ chunk, isComplete }) => {
      if (chunk) {
        currentMessageRef.current += chunk

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.id === currentMessageIdRef.current) {
            return prev.map((m) =>
              m.id === currentMessageIdRef.current
                ? { ...m, content: currentMessageRef.current }
                : m
            )
          } else {
            const newMsg: Message = {
              id: currentMessageIdRef.current,
              role: 'assistant',
              content: currentMessageRef.current,
            }
            return [...prev, newMsg]
          }
        })
      }

      if (isComplete) {
        const finalMessage: Message = {
          id: currentMessageIdRef.current,
          role: 'assistant',
          content: currentMessageRef.current,
        }
        onMessage?.(finalMessage)
        setIsProcessing(false)
        currentMessageRef.current = ''
        currentMessageIdRef.current = ''
      }
    })

    socket.on('agent:error', ({ error }) => {
      setIsProcessing(false)
      onError?.(error)
    })

    socket.on('agent:interrupted', () => {
      setIsProcessing(false)
      currentMessageRef.current = ''
      currentMessageIdRef.current = ''
    })
  }, [token, onMessage, onError, onSessionStart])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('session:end', () => {})
      disconnectSocket()
      socketRef.current = null
    }
    setIsConnected(false)
    setSession(null)
    setMessages([])
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (!socketRef.current?.connected || !session || isProcessing) {
      return
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    }
    setMessages((prev) => [...prev, userMessage])
    onMessage?.(userMessage)

    currentMessageIdRef.current = crypto.randomUUID()
    currentMessageRef.current = ''
    setIsProcessing(true)

    return new Promise<void>((resolve, reject) => {
      socketRef.current!.emit('agent:send', { message }, (response) => {
        if (!response.success) {
          setIsProcessing(false)
          onError?.(response.error || 'Error al enviar mensaje')
          reject(new Error(response.error))
        } else {
          resolve()
        }
      })
    })
  }, [session, isProcessing, onMessage, onError])

  const interruptAgent = useCallback(() => {
    if (socketRef.current?.connected && isProcessing) {
      socketRef.current.emit('agent:interrupt')
    }
  }, [isProcessing])

  const setTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user:typing', { isTyping })
    }
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    isProcessing,
    session,
    messages,
    sendMessage,
    interruptAgent,
    connect,
    disconnect,
    setTyping,
    agentTyping,
  }
}
