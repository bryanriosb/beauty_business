/**
 * Servicio centralizado para gestionar todas las conexiones WebTransport
 * con los diferentes endpoints del servidor de agentes
 */

import { generateJWEToken } from '@/lib/actions/jwe'
import type {
  AgentRequest,
  AgentResponse,
  StreamCallbacks,
  ThreadsRequest,
  ThreadsResponse,
  MessagesRequest,
  MessagesResponse,
  CheckpointsRequest,
  CheckpointsResponse,
  StreamInfo,
  StreamMessage,
} from '@/lib/types/agent-stream'

export class AgentService {
  private queryTransport: WebTransport | null = null
  private threadsTransport: WebTransport | null = null
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()
  private baseUrl: string
  private currentThreadId: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Inicializa las conexiones WebTransport a los diferentes endpoints
   * IMPORTANTE: No envía queries vacías, solo establece las conexiones
   */
  async initialize(): Promise<void> {
    try {
      // Conexión para queries
      this.queryTransport = await this.connect('/agents/query')
      await this.queryTransport.ready
      console.log('✅ Agent transport connected')

      // Conexión para threads
      this.threadsTransport = await this.connect('/agents/threads')
      await this.threadsTransport.ready
      console.log('✅ Threads transport connected')
    } catch (error) {
      console.error('❌ Failed to initialize agent service:', error)
      throw error
    }
  }

  private async connect(path: string): Promise<WebTransport> {
    const certHash = new Uint8Array([
      0xce, 0x01, 0xe4, 0x66, 0xcb, 0xf7, 0x95, 0x9f, 0x40, 0x38, 0x98, 0x8b,
      0x73, 0x5c, 0x24, 0xcc, 0x7b, 0xf6, 0xd0, 0x3d, 0x01, 0x47, 0x21, 0xcd,
      0xbe, 0xb1, 0x6b, 0x20, 0x83, 0xbd, 0x0f, 0xa1,
    ])

    // Generar el token JWE
    const token = await generateJWEToken()

    // Construir la URL con el query parameter token
    const url = `${this.baseUrl}${path}?token=${encodeURIComponent(
      token
    )}&arch=router_executor`

    const transport = new WebTransport(url, {
      serverCertificateHashes: [
        {
          algorithm: 'sha-256',
          value: certHash,
        },
      ],
    })

    return transport
  }

  /**
   * Verifica si el servicio está conectado
   */
  isConnected(): boolean {
    return this.queryTransport !== null && this.threadsTransport !== null
  }

  /**
   * Lista los threads de un usuario
   */
  async listThreads(request: ThreadsRequest): Promise<ThreadsResponse> {
    if (!this.threadsTransport) {
      throw new Error('Threads transport not initialized')
    }

    try {
      const stream = await this.threadsTransport.createBidirectionalStream()
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Enviar request
      await writer.write(this.encoder.encode(JSON.stringify(request)))
      await writer.close()

      // Leer respuesta
      const { value } = await reader.read()
      if (!value) {
        throw new Error('No response received from server')
      }

      const response: ThreadsResponse = JSON.parse(this.decoder.decode(value))
      reader.releaseLock()

      return response
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to list threads')
    }
  }

  /**
   * Obtiene los mensajes de un thread
   */
  async getMessages(request: MessagesRequest): Promise<MessagesResponse> {
    if (!this.threadsTransport) {
      throw new Error('Threads transport not initialized')
    }

    try {
      const stream = await this.threadsTransport.createBidirectionalStream()
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Enviar request
      await writer.write(this.encoder.encode(JSON.stringify(request)))
      await writer.close()

      // Leer respuesta
      const { value } = await reader.read()
      if (!value) {
        throw new Error('No response received from server')
      }

      const response: MessagesResponse = JSON.parse(this.decoder.decode(value))
      reader.releaseLock()

      return response
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get messages')
    }
  }

  /**
   * Obtiene los checkpoints de un thread
   */
  async getCheckpoints(
    request: CheckpointsRequest
  ): Promise<CheckpointsResponse> {
    if (!this.threadsTransport) {
      throw new Error('Threads transport not initialized')
    }

    try {
      const stream = await this.threadsTransport.createBidirectionalStream()
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Enviar request
      await writer.write(this.encoder.encode(JSON.stringify(request)))
      await writer.close()

      // Leer respuesta
      const { value } = await reader.read()
      if (!value) {
        throw new Error('No response received from server')
      }

      const response: CheckpointsResponse = JSON.parse(
        this.decoder.decode(value)
      )
      reader.releaseLock()

      return response
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to get checkpoints')
    }
  }

  /**
   * Envía una query al agente
   * IMPORTANTE: Solo llamar cuando el usuario escribe algo (NO enviar vacío)
   */
  async sendQuery(
    request: AgentRequest,
    callbacks: StreamCallbacks
  ): Promise<AgentResponse> {
    // Validar que la query no esté vacía
    if (!request.query || request.query.trim() === '') {
      throw new Error('Query cannot be empty')
    }

    if (!this.queryTransport) {
      throw new Error('Query transport not initialized')
    }

    try {
      // Agregar thread_id actual si existe y no se especificó uno
      if (!request.thread_id && this.currentThreadId) {
        request.thread_id = this.currentThreadId
      }

      // Crear stream bidireccional
      const requestStream =
        await this.queryTransport.createBidirectionalStream()
      const writer = requestStream.writable.getWriter()
      const reader = requestStream.readable.getReader()

      // Enviar request
      await writer.write(this.encoder.encode(JSON.stringify(request)))

      // Leer StreamInfo (primera respuesta)
      const { value: streamInfoData } = await reader.read()
      if (!streamInfoData) {
        throw new Error('No stream info received')
      }

      const streamInfo: StreamInfo = JSON.parse(
        this.decoder.decode(streamInfoData)
      )
      console.log('📊 Stream Info:', streamInfo)

      // Procesar streams unidireccionales
      const streamsPromise = this.processBothUniStreams(
        streamInfo.thinking_stream_id,
        streamInfo.content_stream_id,
        callbacks
      )

      // Leer respuesta final
      const finalPromise = (async () => {
        const { value: finalData } = await reader.read()
        if (!finalData) {
          throw new Error('No final response received')
        }
        const finalResponse: AgentResponse = JSON.parse(
          this.decoder.decode(finalData)
        )
        console.log('🎯 Final Response:', finalResponse)
        return finalResponse
      })()

      // Esperar ambos
      const [, finalResponse] = await Promise.all([
        streamsPromise,
        finalPromise,
      ])

      // Guardar thread_id para próximas queries
      if (finalResponse.thread_id) {
        this.currentThreadId = finalResponse.thread_id
      }

      // Notificar completado
      callbacks.onComplete?.(finalResponse)

      return finalResponse
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      callbacks.onError?.(err)
      throw err
    }
  }

  /**
   * Procesa los streams unidireccionales (thinking y content)
   */
  private async processBothUniStreams(
    _thinkingID: number,
    _contentID: number,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (!this.queryTransport) return

    const streamPromises: Promise<void>[] = []
    let streamsAccepted = 0

    try {
      const reader =
        this.queryTransport.incomingUnidirectionalStreams.getReader()

      // Aceptar los dos streams
      while (streamsAccepted < 2) {
        const { value: stream, done } = await reader.read()
        if (done) break

        console.log('📨 Unidirectional stream received')

        const streamPromise = this.processUniStream(stream, callbacks)
        streamPromises.push(streamPromise)
        streamsAccepted++
      }

      reader.releaseLock()

      // Esperar a que ambos streams terminen
      await Promise.all(streamPromises)
      console.log('✅ Both streams processed')
    } catch (error) {
      console.error('Error processing streams:', error)
    }
  }

  /**
   * Procesa un stream unidireccional línea por línea
   */
  private async processUniStream(
    stream: ReadableStream,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const reader = stream.getReader()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const text = this.decoder.decode(value, { stream: true })
        buffer += text

        // Procesar líneas completas
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const msg: StreamMessage = JSON.parse(line)

              if (msg.type === 'thinking') {
                callbacks.onThinking?.(msg.content, msg.meta)
              } else if (msg.type === 'content') {
                callbacks.onContent?.(msg.content, msg.meta)
              } else if (msg.type === 'control') {
                if (msg.content === 'completed') {
                  callbacks.onProgress?.('Completado', msg.meta)
                } else {
                  callbacks.onProgress?.(msg.content, msg.meta)
                }
              }
            } catch (e) {
              console.warn('Error parsing message:', line, e)
            }
          }
        }
      }

      reader.releaseLock()
    } catch (error) {
      console.error('Error processing stream:', error)
    }
  }

  /**
   * Obtiene el thread_id actual
   */
  getCurrentThreadId(): string | null {
    return this.currentThreadId
  }

  /**
   * Establece un nuevo thread_id (útil para continuar conversaciones)
   */
  setCurrentThreadId(threadId: string | null): void {
    this.currentThreadId = threadId
  }

  /**
   * Limpia el thread_id actual (para nueva conversación)
   */
  clearCurrentThreadId(): void {
    this.currentThreadId = null
  }

  /**
   * Cierra todas las conexiones
   */
  disconnect(): void {
    try {
      this.queryTransport?.close()
      this.threadsTransport?.close()
      console.log('✅ Services disconnected')
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }
}

/**
 * Instancia singleton del servicio (opcional)
 * Puede usarse directamente o crear instancias nuevas según necesidad
 */
let agentServiceInstance: AgentService | null = null

export function getAgentService(baseUrl: string): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService(baseUrl)
  }
  return agentServiceInstance
}

export function resetAgentService(): void {
  if (agentServiceInstance) {
    agentServiceInstance.disconnect()
    agentServiceInstance = null
  }
}
