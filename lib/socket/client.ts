'use client'

import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from './types'

export type AgentClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AgentClientSocket | null = null

export function getSocket(): AgentClientSocket {
  if (!socket) {
    socket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
  }
  return socket
}

export function connectSocket(): AgentClientSocket {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}
