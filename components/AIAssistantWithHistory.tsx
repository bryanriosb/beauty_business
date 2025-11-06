'use client'

import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { AIAssistant, type AIAssistantRef } from './AIAssistant'
import { ConversationHistory } from './ConversationHistory'
import { Button } from './ui/button'
import { Menu, PanelLeftClose, X } from 'lucide-react'
import { useAgentService } from '@/hooks/useAgentService'
import type { ThreadInfo } from '@/lib/types/agent-stream'

interface AIAssistantWithHistoryProps {
  url: string
  userId?: string
  showHistory?: boolean
}

export interface AIAssistantWithHistoryRef {
  loadThread: (thread: ThreadInfo) => void
  startNewConversation: () => void
}

/**
 * Componente integrado que combina AIAssistant con ConversationHistory
 */
export const AIAssistantWithHistory = forwardRef<
  AIAssistantWithHistoryRef,
  AIAssistantWithHistoryProps
>(({ url, userId = '7', showHistory = false }, ref) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(showHistory)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [currentThreadTitle, setCurrentThreadTitle] = useState<
    string | undefined
  >(undefined)
  const assistantRef = useRef<AIAssistantRef>(null)

  const { service } = useAgentService({
    url,
    autoConnect: true,
  })

  const handleThreadSelect = async (thread: ThreadInfo) => {
    if (assistantRef.current) {
      await assistantRef.current.loadThread(thread)
      setCurrentThreadId(thread.id)
      setCurrentThreadTitle(thread.metadata?.title || 'Conversación')
      console.log('Thread seleccionado:', thread.id)
    }
  }

  const handleNewConversation = () => {
    if (assistantRef.current) {
      assistantRef.current.startNewConversation()
      setCurrentThreadId(null)
      setCurrentThreadTitle(undefined)
    }
  }

  const handleThreadIdChange = (threadId: string | null) => {
    setCurrentThreadId(threadId)
  }

  // Exponer métodos a través del ref
  useImperativeHandle(ref, () => ({
    loadThread: (thread: ThreadInfo) => {
      handleThreadSelect(thread)
    },
    startNewConversation: () => {
      handleNewConversation()
    },
  }))

  return (
    <div className="flex h-full relative">
      {/* Sidebar de historial */}
      {isSidebarOpen && (
        <div className="w-60 border-r bg-background flex-shrink-0">
          <ConversationHistory
            service={service}
            userId={userId}
            currentThreadId={currentThreadId}
            onThreadSelect={handleThreadSelect}
            onNewConversation={handleNewConversation}
          />
        </div>
      )}

      {/* Área principal del asistente */}
      <div className="flex-1 flex flex-col h-full">
        {/* Toggle button para el sidebar */}
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <>
                <PanelLeftClose />
                Ocultar historial
              </>
            ) : (
              <>
                <Menu className="h-4 w-4 mr-2" />
                Mostrar historial
              </>
            )}
          </Button>
        </div>

        {/* Componente AIAssistant */}
        <div className="flex-1 p-2 min-h-0">
          <div className="h-full">
            <AIAssistant
              ref={assistantRef}
              url={url}
              userId={userId}
              onThreadIdChange={handleThreadIdChange}
              currentThreadTitle={currentThreadTitle}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

AIAssistantWithHistory.displayName = 'AIAssistantWithHistory'
