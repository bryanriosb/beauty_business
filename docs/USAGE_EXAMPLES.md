# Ejemplos de Uso - Gestión de Contexto

Este documento proporciona ejemplos prácticos de cómo usar el sistema de gestión de contexto de conversaciones.

## Ejemplo 1: Uso Básico - AIAssistant Simple

El caso más simple: asistente sin historial de conversaciones.

```tsx
'use client'

import { AIAssistant } from '@/components/AIAssistant'

export default function SimpleChatPage() {
  return (
    <div className="h-screen p-4">
      <AIAssistant
        url="https://localhost:4433"
        userId="user123"
      />
    </div>
  )
}
```

**Características:**
- Mantiene contexto automáticamente dentro de la sesión
- Botón "Nueva conversación" para resetear el contexto
- Muestra el thread_id actual en la UI

## Ejemplo 2: AIAssistant con Callback

Obtener notificaciones cuando cambia el thread_id.

```tsx
'use client'

import { useState } from 'react'
import { AIAssistant } from '@/components/AIAssistant'

export default function ChatWithCallbackPage() {
  const [currentThread, setCurrentThread] = useState<string | null>(null)

  const handleThreadChange = (threadId: string | null) => {
    setCurrentThread(threadId)
    console.log('Thread actualizado:', threadId)

    // Guardar en localStorage para persistencia
    if (threadId) {
      localStorage.setItem('lastThreadId', threadId)
    } else {
      localStorage.removeItem('lastThreadId')
    }
  }

  return (
    <div className="h-screen p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat Asistente</h1>
        {currentThread && (
          <p className="text-sm text-muted-foreground">
            Conversación activa: {currentThread}
          </p>
        )}
      </div>

      <AIAssistant
        url="https://localhost:4433"
        userId="user123"
        onThreadIdChange={handleThreadChange}
      />
    </div>
  )
}
```

## Ejemplo 3: AIAssistant con Historial Completo

Experiencia completa con sidebar de conversaciones previas.

```tsx
'use client'

import { AIAssistantWithHistory } from '@/components/AIAssistantWithHistory'

export default function FullChatPage() {
  return (
    <div className="h-screen">
      <AIAssistantWithHistory
        url="https://localhost:4433"
        userId="user123"
        showHistory={true} // Mostrar sidebar por defecto
      />
    </div>
  )
}
```

**Características:**
- ✅ Usa `AgentService` internamente (conexiones separadas por endpoint)
- ✅ Sidebar con lista de conversaciones previas
- ✅ Toggle para mostrar/ocultar historial
- ✅ Selección de conversaciones previas
- ✅ Carga automática de mensajes históricos
- ✅ Botón para crear nueva conversación
- ✅ **NO envía queries vacías al conectar**

## Ejemplo 4: Control Programático con useRef

Control avanzado del asistente mediante referencias.

```tsx
'use client'

import { useRef, useState } from 'react'
import { AIAssistant, type AIAssistantRef } from '@/components/AIAssistant'
import { Button } from '@/components/ui/button'
import type { ThreadInfo } from '@/lib/types/agent-stream'

export default function AdvancedChatPage() {
  const assistantRef = useRef<AIAssistantRef>(null)
  const [savedThreads, setSavedThreads] = useState<ThreadInfo[]>([])

  const handleSaveConversation = () => {
    const threadId = assistantRef.current?.getCurrentThreadId()
    if (threadId) {
      // Guardar thread_id para uso posterior
      const thread: ThreadInfo = {
        id: threadId,
        user_id: 'user123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSavedThreads([...savedThreads, thread])
      alert('Conversación guardada!')
    }
  }

  const handleLoadSavedThread = async (thread: ThreadInfo) => {
    if (assistantRef.current) {
      await assistantRef.current.loadThread(thread)
    }
  }

  const handleNewConversation = () => {
    if (assistantRef.current) {
      assistantRef.current.startNewConversation()
    }
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar personalizado */}
      <div className="w-64 border-r p-4">
        <h2 className="text-lg font-bold mb-4">Mis Conversaciones</h2>

        <Button
          onClick={handleNewConversation}
          className="w-full mb-4"
        >
          Nueva Conversación
        </Button>

        <Button
          onClick={handleSaveConversation}
          variant="outline"
          className="w-full mb-4"
        >
          Guardar Actual
        </Button>

        <div className="space-y-2">
          {savedThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => handleLoadSavedThread(thread)}
              className="w-full text-left p-2 hover:bg-muted rounded"
            >
              <p className="text-sm truncate">{thread.id.slice(0, 16)}...</p>
              <p className="text-xs text-muted-foreground">
                {new Date(thread.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat principal */}
      <div className="flex-1 p-4">
        <AIAssistant
          ref={assistantRef}
          url="https://localhost:4433"
          userId="user123"
        />
      </div>
    </div>
  )
}
```

## Ejemplo 5: Uso Directo de Hooks

Para implementaciones más personalizadas usando el nuevo AgentService.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useAgentService } from '@/hooks/useAgentService'
import { useThreads } from '@/hooks/useThreads'
import { useAgentStream } from '@/hooks/useAgentStream'

export default function CustomChatPage() {
  const [query, setQuery] = useState('')
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)

  // Conectar al servicio de agentes (crea conexiones separadas por endpoint)
  const { service, isConnected, isConnecting } = useAgentService({
    url: 'https://localhost:4433',
    autoConnect: true,
  })

  // Gestión de threads
  const { threads, loadThreads, loadMessages, messages } = useThreads({
    service,  // ⚠️ Usar 'service' no 'transport'
    userId: 'user123',
  })

  // Gestión de streaming
  const { sendQuery, isStreaming } = useAgentStream({
    service,  // ⚠️ Usar 'service' no 'transport'
    onContent: (content) => {
      console.log('Contenido recibido:', content)
    },
    onComplete: (response) => {
      console.log('Respuesta completa:', response)
      if (response.thread_id) {
        setCurrentThreadId(response.thread_id)
      }
    },
  })

  // Cargar threads al montar (SOLO cuando esté conectado)
  useEffect(() => {
    if (service && isConnected) {
      loadThreads()
    }
  }, [service, isConnected, loadThreads])

  const handleSendQuery = async () => {
    // ✅ Validar query antes de enviar
    if (!query.trim()) {
      alert('Por favor escribe una pregunta')
      return
    }

    await sendQuery(query, {
      user_id: 'user123',
      // ⚠️ NO incluir thread_id, se agrega automáticamente
    })
    setQuery('')
  }

  return (
    <div className="h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Chat Personalizado</h1>

      {/* Estado de conexión */}
      {isConnecting && <div>Conectando...</div>}
      {!isConnected && !isConnecting && <div>❌ Desconectado</div>}

      {/* Lista de threads */}
      {isConnected && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Conversaciones</h2>
          <div className="space-y-1">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => loadMessages(thread.id)}
                className="block w-full text-left p-2 hover:bg-muted rounded"
              >
                {thread.metadata?.last_query || 'Nueva conversación'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div className="mb-4 max-h-96 overflow-y-auto border rounded p-4">
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!isConnected || isStreaming}
          className="flex-1 p-2 border rounded"
          placeholder="Escribe tu mensaje..."
        />
        <button
          onClick={handleSendQuery}
          disabled={!isConnected || isStreaming || !query.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          {isStreaming ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
```

## Ejemplo 6: Integración con Next.js App Router

Página completa con metadata y layout.

```tsx
// app/chat/page.tsx
import { Metadata } from 'next'
import { AIAssistantWithHistory } from '@/components/AIAssistantWithHistory'

export const metadata: Metadata = {
  title: 'Chat Asistente | Mi App',
  description: 'Conversa con nuestro asistente inteligente',
}

export default function ChatPage() {
  return (
    <main className="h-screen">
      <AIAssistantWithHistory
        url={process.env.NEXT_PUBLIC_AGENT_URL || 'https://localhost:4433'}
        userId="user123"
        showHistory={true}
      />
    </main>
  )
}
```

```tsx
// app/chat/layout.tsx
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">Asistente IA</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

## Ejemplo 7: Multi-Usuario con Autenticación

Integración con sistema de autenticación.

```tsx
'use client'

import { useSession } from 'next-auth/react'
import { AIAssistantWithHistory } from '@/components/AIAssistantWithHistory'
import { redirect } from 'next/navigation'

export default function AuthenticatedChatPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Cargando...</div>
  }

  if (status === 'unauthenticated') {
    redirect('/login')
  }

  return (
    <div className="h-screen">
      <AIAssistantWithHistory
        url="https://localhost:4433"
        userId={session?.user?.id || 'anonymous'}
        showHistory={true}
      />
    </div>
  )
}
```

## Variables de Entorno

Crea un archivo `.env.local` con:

```bash
# URL del servidor de agentes
NEXT_PUBLIC_AGENT_URL=https://localhost:4433

# Usuario por defecto (opcional)
NEXT_PUBLIC_DEFAULT_USER_ID=user123
```

## Consideraciones de Producción

### 1. Manejo de Errores

```tsx
const { error } = useWebTransport({
  url: process.env.NEXT_PUBLIC_AGENT_URL!,
  autoConnect: true,
  onError: (err) => {
    // Reportar a servicio de logging
    console.error('WebTransport error:', err)
    // Mostrar notificación al usuario
  },
})
```

### 2. Persistencia Local

```tsx
useEffect(() => {
  // Guardar thread_id en localStorage
  if (currentThreadId) {
    localStorage.setItem('lastThreadId', currentThreadId)
  }
}, [currentThreadId])

// Restaurar al cargar
useEffect(() => {
  const savedThreadId = localStorage.getItem('lastThreadId')
  if (savedThreadId) {
    // Cargar thread guardado
  }
}, [])
```

### 3. Optimización de Rendimiento

```tsx
// Lazy loading del componente
import dynamic from 'next/dynamic'

const AIAssistantWithHistory = dynamic(
  () => import('@/components/AIAssistantWithHistory').then(m => m.AIAssistantWithHistory),
  {
    ssr: false,
    loading: () => <div>Cargando chat...</div>
  }
)
```

## Recursos Adicionales

- [Documentación de Gestión de Contexto](./CONTEXT_MANAGEMENT.md)
- [API del Servidor](./API_DOCS.md)
- [Guía de WebTransport](./WEBTRANSPORT.md)
