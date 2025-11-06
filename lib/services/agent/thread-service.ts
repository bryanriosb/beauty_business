/**
 * Servicio para manejar la gestión de threads/conversaciones
 */

import type {
  ThreadsRequest,
  ThreadsResponse,
  MessagesRequest,
  MessagesResponse,
  CheckpointsRequest,
  CheckpointsResponse,
} from '@/lib/types/agent-stream'

export class ThreadService {
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()

  /**
   * Lista todos los threads de un usuario
   */
  async listThreads(
    transport: WebTransport,
    request: ThreadsRequest
  ): Promise<ThreadsResponse> {
    try {
      const stream = await transport.createBidirectionalStream()
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Enviar request
      await writer.write(this.encoder.encode(JSON.stringify(request)))
      await writer.close()

      // Leer respuesta
      const { value } = await reader.read()
      if (!value) {
        throw new Error('No se recibió respuesta del servidor')
      }

      const response: ThreadsResponse = JSON.parse(this.decoder.decode(value))
      reader.releaseLock()

      return response
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Error al listar threads')
    }
  }

  /**
   * Obtiene los mensajes de un thread específico
   */
  async getMessages(
    transport: WebTransport,
    request: MessagesRequest
  ): Promise<MessagesResponse> {
    try {
      const stream = await transport.createBidirectionalStream()
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Enviar request
      await writer.write(this.encoder.encode(JSON.stringify(request)))
      await writer.close()

      // Leer respuesta
      const { value } = await reader.read()
      if (!value) {
        throw new Error('No se recibió respuesta del servidor')
      }

      const response: MessagesResponse = JSON.parse(this.decoder.decode(value))
      reader.releaseLock()

      return response
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Error al obtener mensajes')
    }
  }

  /**
   * Obtiene los checkpoints de un thread específico
   */
  async getCheckpoints(
    transport: WebTransport,
    request: CheckpointsRequest
  ): Promise<CheckpointsResponse> {
    try {
      const stream = await transport.createBidirectionalStream()
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Enviar request
      await writer.write(this.encoder.encode(JSON.stringify(request)))
      await writer.close()

      // Leer respuesta
      const { value } = await reader.read()
      if (!value) {
        throw new Error('No se recibió respuesta del servidor')
      }

      const response: CheckpointsResponse = JSON.parse(
        this.decoder.decode(value)
      )
      reader.releaseLock()

      return response
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Error al obtener checkpoints')
    }
  }
}

/**
 * Instancia singleton del servicio
 */
export const threadService = new ThreadService()
