/**
 * Servicio para manejar la comunicación dual-stream con el agente
 */

import type {
  AgentRequest,
  AgentResponse,
  StreamInfo,
  StreamMessage,
  StreamCallbacks,
} from '@/lib/types/agent-stream'

export class AgentStreamService {
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()

  /**
   * Envía una petición al agente y maneja los streams de thinking y content
   */
  async sendRequest(
    transport: WebTransport,
    request: AgentRequest,
    callbacks: StreamCallbacks
  ): Promise<AgentResponse> {
    try {
      // 1. Crear stream de request bidireccional
      const requestStream = await transport.createBidirectionalStream()
      const writer = requestStream.writable.getWriter()
      const reader = requestStream.readable.getReader()

      // 2. Enviar el request JSON
      await writer.write(this.encoder.encode(JSON.stringify(request)))
      // No cerrar el writer porque necesitamos leer la respuesta

      // 3. Leer StreamInfo (primera respuesta en request stream)
      const { value: streamInfoData } = await reader.read()
      if (!streamInfoData) {
        throw new Error('No se recibió información de streams')
      }

      const streamInfoText = this.decoder.decode(streamInfoData)
      const streamInfo: StreamInfo = JSON.parse(streamInfoText)

      console.log('📊 Stream Info:', streamInfo)

      // 4. Preparar IDs de streams
      const thinkingID = streamInfo.thinking_stream_id
      const contentID = streamInfo.content_stream_id

      // 5. Aceptar y procesar streams unidireccionales
      const streamsPromise = this.acceptBothUniStreams(
        transport,
        thinkingID,
        contentID,
        callbacks
      )

      // 6. Leer respuesta final del request stream
      const finalPromise = (async () => {
        const { value: finalData } = await reader.read()
        if (!finalData) {
          throw new Error('No se recibió respuesta final')
        }
        const finalResponse: AgentResponse = JSON.parse(
          this.decoder.decode(finalData)
        )
        console.log('🎯 Final Response:', finalResponse)
        return finalResponse
      })()

      // 7. Esperar a que todos los streams terminen
      const [, finalResponse] = await Promise.all([
        streamsPromise,
        finalPromise,
      ])

      // 8. Notificar completado
      callbacks.onComplete?.(finalResponse)

      return finalResponse
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Error desconocido')
      callbacks.onError?.(err)
      throw err
    }
  }

  /**
   * Acepta ambos streams unidireccionales del servidor y los procesa
   */
  private async acceptBothUniStreams(
    transport: WebTransport,
    _thinkingID: number,
    _contentID: number,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const streamPromises: Promise<void>[] = []
    let streamsAccepted = 0

    try {
      // Leer streams unidireccionales entrantes
      const reader = transport.incomingUnidirectionalStreams.getReader()

      // Aceptar los dos streams
      while (streamsAccepted < 2) {
        const { value: stream, done } = await reader.read()
        if (done) break

        console.log('📨 Stream unidireccional recibido')

        // Procesar el stream en paralelo
        const streamPromise = this.processUniStream(stream, callbacks)
        streamPromises.push(streamPromise)
        streamsAccepted++
      }

      reader.releaseLock()

      // Esperar a que ambos streams terminen
      await Promise.all(streamPromises)
      console.log('✅ Ambos streams procesados')
    } catch (error) {
      console.error('Error aceptando streams:', error)
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

        // Decodificar chunk y procesar línea por línea
        const text = this.decoder.decode(value, { stream: true })
        buffer += text

        // Procesar líneas completas (separadas por \n)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Guardar línea incompleta

        for (const line of lines) {
          if (line.trim()) {
            try {
              const msg: StreamMessage = JSON.parse(line)

              // Enrutar mensaje según tipo
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
      console.error('Error procesando stream:', error)
    }
  }
}

/**
 * Instancia singleton del servicio
 */
export const agentStreamService = new AgentStreamService()
