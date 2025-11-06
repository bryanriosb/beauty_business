# Gestión de Contexto de Conversaciones - Guía de Uso

Esta guía explica cómo usar el sistema de gestión de contexto de conversaciones implementado en el cliente.

## Arquitectura

### Servidor
El sistema utiliza una arquitectura híbrida con:
- **Valkey/Redis**: Cache de alta velocidad (TTL 1 hora)
- **PostgreSQL**: Persistencia durable

### Cliente
El cliente usa **conexiones WebTransport separadas** por endpoint:
- `/agents/query` - Para enviar queries al agente
- `/agents/threads` - Para gestionar threads (listar, obtener mensajes, checkpoints)

**IMPORTANTE**: Nunca se envían queries vacías al conectar. Las conexiones solo se establecen y permanecen abiertas.

## Componentes Principales

### 1. Tipos (`lib/types/agent-stream.ts`)

Define todas las interfaces necesarias para la gestión de contexto:
- `ThreadInfo`: Información de una conversación
- `ThreadMessage`: Mensaje individual en una conversación
- `ThreadsResponse`: Respuesta con lista de threads
- `MessagesResponse`: Respuesta con mensajes de un thread

### 2. Servicio Centralizado de Agentes (`lib/services/agent/agent-service.ts`)

**Nuevo componente principal** que gestiona todas las conexiones WebTransport:

```typescript
import { AgentService } from '@/lib/services/agent/agent-service'

// Crear e inicializar el servicio
const service = new AgentService('https://localhost:4433')
await service.initialize()

// Esto crea 2 conexiones WebTransport:
// - https://localhost:4433/agents/query
// - https://localhost:4433/agents/threads

// Listar threads
const response = await service.listThreads({
  user_id: 'user123',
  limit: 20
})

// Obtener mensajes
const messages = await service.getMessages({
  thread_id: 'thread-id',
  get_messages: true,
  limit: 50
})

// Enviar query (solo cuando usuario escribe)
await service.sendQuery({
  query: '¿Cuál es el clima?',
  user_id: 'user123'
}, callbacks)
```

### 3. Hook useAgentService (`hooks/useAgentService.ts`)

Hook React para gestionar el servicio centralizado:

```typescript
import { useAgentService } from '@/hooks/useAgentService'

const {
  service,      // Instancia de AgentService
  isConnected,  // Estado de conexión
  isConnecting, // Estado de conexión en progreso
  error,        // Error si lo hay
  connect,      // Función para conectar manualmente
  disconnect    // Función para desconectar
} = useAgentService({
  url: 'https://localhost:4433',
  autoConnect: true // Conectar automáticamente al montar
})

// Usar el servicio en otros hooks
const { threads } = useThreads({ service, userId })
```

### 4. Hook useThreads (`hooks/useThreads.ts`)

Proporciona una interfaz React para gestionar threads:

```typescript
import { useAgentService } from '@/hooks/useAgentService'
import { useThreads } from '@/hooks/useThreads'

const { service } = useAgentService({ url: 'https://localhost:4433' })

const {
  threads,           // Lista de threads
  currentThread,     // Thread actual
  messages,          // Mensajes del thread actual
  isLoading,         // Estado de carga
  error,             // Error si lo hay
  loadThreads,       // Función para cargar threads
  loadMessages,      // Función para cargar mensajes
  setCurrentThread,  // Establecer thread actual
  clearCurrentThread // Limpiar thread actual
} = useThreads({
  service,  // ⚠️ Usa 'service' no 'transport'
  userId: 'user123'
})

// Cargar threads del usuario
await loadThreads(20) // límite opcional

// Cargar mensajes de un thread
await loadMessages('thread-id', 50) // límite opcional
```

### 5. Componente AIAssistant (`components/AIAssistant.tsx`)

El componente principal del asistente con gestión de contexto integrada:

```tsx
import { AIAssistant } from '@/components/AIAssistant'

<AIAssistant
  url="https://localhost:4433"
  userId="user123"
  onThreadIdChange={(threadId) => {
    console.log('Thread ID actual:', threadId)
  }}
/>
```

**Características:**
- ✅ Usa `AgentService` internamente (conexiones separadas por endpoint)
- ✅ Mantiene automáticamente el `thread_id` entre consultas
- ✅ Muestra el thread_id actual en la UI
- ✅ Botón "Nueva conversación" para iniciar un nuevo thread
- ✅ Incluye el `thread_id` en cada petición al servidor
- ✅ Valida que las queries no estén vacías
- ✅ **NO envía queries vacías al conectar**

### 6. Componente ConversationHistory (`components/ConversationHistory.tsx`)

Lista de conversaciones previas con capacidad de selección:

```tsx
import { useAgentService } from '@/hooks/useAgentService'
import { ConversationHistory } from '@/components/ConversationHistory'

const { service } = useAgentService({ url: 'https://localhost:4433' })

<ConversationHistory
  service={service}  // ⚠️ Usa 'service' no 'transport'
  userId="user123"
  currentThreadId={currentThreadId}
  onThreadSelect={(thread) => {
    console.log('Thread seleccionado:', thread)
  }}
  onNewConversation={() => {
    console.log('Nueva conversación')
  }}
/>
```

**Características:**
- Lista threads ordenados por fecha de actualización
- Muestra último mensaje y número de mensajes
- Resalta el thread actual
- Botón para refrescar la lista

### 7. Componente AIAssistantWithHistory (`components/AIAssistantWithHistory.tsx`)

Componente integrado que combina AIAssistant con ConversationHistory:

```tsx
import { AIAssistantWithHistory } from '@/components/AIAssistantWithHistory'

<AIAssistantWithHistory
  url="https://localhost:4433"
  userId="user123"
  showHistory={true} // Mostrar sidebar por defecto
/>
```

**Características:**
- ✅ Usa `AgentService` internamente
- ✅ Sidebar con historial de conversaciones
- ✅ Toggle para mostrar/ocultar historial
- ✅ Integración automática entre componentes
- ✅ Gestión centralizada del estado
- ✅ Una sola instancia de AgentService compartida

## Flujos de Uso

### Flujo 1: Inicialización del Cliente

```typescript
// 1. El servicio se inicializa automáticamente
const { service, isConnected } = useAgentService({
  url: 'https://localhost:4433',
  autoConnect: true
})

// Esto crea 2 conexiones WebTransport:
// ✅ https://localhost:4433/agents/query
// ✅ https://localhost:4433/agents/threads
//
// ⚠️ NO envía queries vacías, solo establece conexiones

// 2. Esperar a que esté conectado
if (!isConnected) {
  return <div>Conectando...</div>
}

// 3. Usar el servicio en otros hooks
const { threads, loadThreads } = useThreads({ service, userId })
const { sendQuery } = useAgentStream({ service, ... })
```

### Flujo 2: Nueva Conversación

```typescript
// 1. Usuario envía primera consulta
await sendQuery("¿Cuál es el clima en Madrid?", {
  user_id: "user123",
  session_path: "/dashboard"
  // ⚠️ NO incluir thread_id en primera consulta
})

// 2. Servidor responde con thread_id
// response.thread_id = "550e8400-e29b-41d4-a716-446655440000"

// 3. AgentService guarda thread_id automáticamente

// 4. Siguientes consultas incluyen thread_id automáticamente
await sendQuery("¿Y mañana?", {
  user_id: "user123"
  // ✅ thread_id se incluye automáticamente
})
```

### Flujo 3: Continuar Conversación Existente

```typescript
// 1. Cargar lista de threads (solo cuando sea necesario)
await loadThreads()

// 2. Usuario selecciona un thread
const selectedThread = threads[0]

// 3. Cargar mensajes del thread
await loadMessages(selectedThread.id)

// 4. Establecer como thread actual
service.setCurrentThreadId(selectedThread.id)

// 5. Usuario continúa la conversación
await sendQuery("Continúa explicando", {
  user_id: "user123"
  // ✅ thread_id se incluye automáticamente
})
```

### Flujo 4: Recuperar Historial

```typescript
// 1. Inicializar servicio
const { service } = useAgentService({ url: 'https://localhost:4433' })

// 2. Listar threads del usuario
const response = await service.listThreads({
  user_id: "user123",
  limit: 20
})

// 3. Obtener mensajes de un thread específico
const messagesResponse = await service.getMessages({
  thread_id: response.threads[0].id,
  get_messages: true,
  limit: 50
})

// 4. Mostrar mensajes en la UI
messagesResponse.messages.forEach(msg => {
  console.log(`${msg.role}: ${msg.content}`)
})
```

## Ejemplo Completo de Integración

```tsx
'use client'

import { useState } from 'react'
import { AIAssistantWithHistory } from '@/components/AIAssistantWithHistory'

export default function ChatPage() {
  const [userId] = useState('user123')

  return (
    <div className="h-screen">
      <AIAssistantWithHistory
        url="https://localhost:4433"
        userId={userId}
        showHistory={true}
      />
    </div>
  )
}
```

## Persistencia de Datos

### Cache (Valkey/Redis)
- **Duración**: 1 hora
- **Velocidad**: <1ms de lectura
- **Uso**: Contexto reciente y acceso rápido

### Base de Datos (PostgreSQL)
- **Duración**: Permanente
- **Velocidad**: ~10-20ms de lectura
- **Uso**: Persistencia durable y recuperación

## Gestión de Thread ID

El `thread_id` se gestiona automáticamente:

1. **Primera consulta**: No se envía `thread_id`
2. **Servidor genera**: Crea nuevo thread y devuelve ID
3. **Cliente guarda**: Almacena en estado local
4. **Consultas siguientes**: Incluyen automáticamente el `thread_id`
5. **Nueva conversación**: Se limpia el `thread_id` y se genera uno nuevo

## Mejores Prácticas

### 1. Usar AgentService

```typescript
// ✅ Usar el servicio centralizado
const { service } = useAgentService({ url })
const { threads } = useThreads({ service, userId })

// ❌ No crear conexiones WebTransport manualmente
const transport = new WebTransport(url) // ❌ Incorrecto
```

### 2. Esperar a que el servicio esté conectado

```typescript
// ✅ Verificar conexión antes de usar
const { service, isConnected } = useAgentService({ url })

if (!isConnected) {
  return <div>Conectando...</div>
}

// Ahora es seguro usar el servicio
```

### 3. No enviar queries vacías

```typescript
// ✅ Validar antes de enviar
const handleSend = async () => {
  if (!query.trim()) return
  await sendQuery(query, { user_id })
}

// ❌ No enviar queries vacías
await sendQuery('', { user_id }) // ❌ Error
```

### 2. Manejo de Errores

```typescript
try {
  await loadMessages(threadId)
} catch (error) {
  console.error('Error al cargar mensajes:', error)
  // Mostrar mensaje de error al usuario
}
```

### 3. Optimización de Rendimiento

```typescript
// Cargar solo los threads necesarios
await loadThreads(10) // En lugar de cargar todos

// Cargar mensajes bajo demanda
const handleThreadClick = async (thread: ThreadInfo) => {
  await loadMessages(thread.id)
}
```

### 4. Limpieza de Recursos

```typescript
useEffect(() => {
  return () => {
    // Limpiar thread actual al desmontar
    clearCurrentThread()
  }
}, [clearCurrentThread])
```

## Debugging

### Ver thread_id actual

```typescript
console.log('Thread ID actual:', currentThreadId)
```

### Ver mensajes cargados

```typescript
console.log('Mensajes:', messages)
```

### Ver estado de carga

```typescript
console.log('Cargando:', isLoading)
console.log('Error:', error)
```

## Próximas Funcionalidades

- [ ] Búsqueda en historial de conversaciones
- [ ] Exportar conversaciones
- [ ] Compartir conversaciones entre usuarios
- [ ] Tags y categorización de threads
- [ ] Búsqueda semántica en mensajes

## Soporte

Para más información sobre la API del servidor, consulta la documentación de la API en el backend.
