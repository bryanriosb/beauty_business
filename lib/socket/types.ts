import type { Server, Socket } from 'socket.io'

export interface AgentSession {
  sessionId: string
  conversationId: string
  businessId: string
  userId?: string
}

export interface ServerToClientEvents {
  'agent:message': (data: { chunk: string; isComplete: boolean }) => void
  'agent:thinking': (data: { content: string }) => void
  'agent:typing': (data: { isTyping: boolean }) => void
  'agent:feedback': (data: { type: 'thinking' | 'progress' | 'waiting'; message: string; toolName?: string }) => void
  'agent:tool': (data: { status: 'start' | 'end'; toolName: string; success?: boolean }) => void
  'agent:error': (data: { error: string; code?: string }) => void
  'agent:interrupted': () => void
  'agent:audio': (data: { audio: ArrayBuffer; isFinal: boolean }) => void
  'session:started': (data: { session: AgentSession; welcomeMessage: string }) => void
  'session:error': (data: { error: string }) => void
  'connection:status': (data: { status: 'connected' | 'reconnecting' | 'disconnected' }) => void
}

export interface ClientToServerEvents {
  'session:start': (data: { token: string }, callback: (response: { success: boolean; error?: string }) => void) => void
  'session:end': (callback: (response: { success: boolean }) => void) => void
  'agent:send': (data: { message: string }, callback: (response: { success: boolean; error?: string }) => void) => void
  'agent:interrupt': () => void
  'agent:audio:start': () => void
  'agent:audio:chunk': (data: { audio: ArrayBuffer }) => void
  'agent:audio:stop': () => void
  'user:typing': (data: { isTyping: boolean }) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  session: AgentSession | null
  isProcessing: boolean
  abortController: AbortController | null
}

export type AgentSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
export type AgentServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
