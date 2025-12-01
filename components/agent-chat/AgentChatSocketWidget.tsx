'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, X, Bot, StopCircle, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ChatMessage } from './ChatMessage'
import { AgentChatInput } from './AgentChatInput'
import { useAgentSocket } from '@/hooks/useAgentSocket'
import { useDeepgramSTT } from '@/hooks/useDeepgramSTT'
import { cn } from '@/lib/utils'

interface AgentChatSocketWidgetProps {
  token: string
  onClose?: () => void
  className?: string
}

export function AgentChatSocketWidget({
  token,
  onClose,
  className,
}: AgentChatSocketWidgetProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)

  const {
    isConnected,
    isConnecting,
    isProcessing,
    messages,
    sendMessage,
    interruptAgent,
    connect,
    agentTyping,
  } = useAgentSocket({
    token,
    onError: (error) => console.error('Socket error:', error),
  })

  const handleUtteranceEnd = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      await sendMessage(text.trim())
    },
    [sendMessage]
  )

  const {
    isListening,
    isSpeaking,
    volume,
    start: startListening,
    stop: stopListening,
    toggleMute,
    isMuted,
  } = useDeepgramSTT({
    onUtteranceEnd: handleUtteranceEnd,
    onError: (err) => console.error('STT Error:', err),
    language: 'es-419',
  })

  // Scroll interno del ScrollArea (no de la página)
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [])

  // Solo scroll cuando se agrega un nuevo mensaje
  const prevMessagesLengthRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length !== prevMessagesLengthRef.current) {
      scrollToBottom()
      prevMessagesLengthRef.current = messages.length
    }
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    connect()
  }, [connect])

  const handleSubmit = async () => {
    if (inputValue.trim()) {
      const message = inputValue.trim()
      setInputValue('')
      await sendMessage(message)
    }
  }

  const handleModeChange = async (mode: 'normal' | 'voice') => {
    setVoiceMode(mode === 'voice')
    if (mode === 'voice') {
      await startListening()
    } else {
      stopListening()
    }
  }

  if (isConnecting) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Conectando con el asistente...
          </p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <X className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">Error de conexión</p>
          <Button variant="outline" onClick={connect}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">Asistente Virtual</span>
          {isConnected && (
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {isProcessing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={interruptAgent}
              className="text-destructive hover:text-destructive"
            >
              <Square className="!h-5 !w-5" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-2">
          <div className="flex flex-col gap-1 pb-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={
                  isProcessing &&
                  message.role === 'assistant' &&
                  index === messages.length - 1
                }
              />
            ))}
            {agentTyping && !isProcessing && (
              <ChatMessage role="assistant" content="" isTyping />
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t p-4 pt-8">
        <AgentChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={isProcessing}
          isLoading={isProcessing}
          showVoiceButton={true}
          isVoiceActive={isListening}
          isMuted={isMuted}
          isSpeaking={isSpeaking}
          volume={volume}
          outputVolume={0}
          onModeChange={handleModeChange}
          onToggleMute={toggleMute}
        />
      </div>
    </div>
  )
}
