import { AgentProvider, AgentStreamEvent } from './types'
import { generateText, ToolLoopAgent, stepCountIs } from 'ai'
import { deepinfra } from '@ai-sdk/deepinfra'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { createAppointmentTools } from './tools/ai-sdk-tools'
import { createVercelAIAgentPrompt } from './prompts/vercel-ai-agent-prompt'

interface VercelAIAgentConfig {
  businessId: string
  sessionId: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export class VercelAIAgent implements AgentProvider {
  private config: VercelAIAgentConfig

  constructor(config: VercelAIAgentConfig) {
    this.config = {
      // model: 'gemini-2.5-flash-preview-09-2025', // Modelo estándar de Gemini
      model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
      temperature: 0,
      ...config,
    }

    // Logging del motor
    console.log(
      `🤖 [VERCEL AI SDK 6] Iniciando agente con Vercel AI para business: ${config.businessId}, session: ${config.sessionId}`
    )
  }

  async *streamResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      businessId?: string
      sessionId?: string
      assistantName?: string
    }
  ): AsyncGenerator<AgentStreamEvent> {
    try {
      const businessId = options?.businessId || this.config.businessId
      const sessionId = options?.sessionId || this.config.sessionId
      const assistantName = options?.assistantName

      console.log(
        `🚀 [VERCEL AI SDK 6] Iniciando streaming con ${messages.length} mensajes`
      )

      const businessContext = await this.getBusinessContext(
        businessId,
        assistantName
      )

      const model = deepinfra(this.config.model!)
      const systemPrompt = this.createSystemPrompt(businessContext)

      const fullMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages,
      ]

      console.log(`🛠️ [VERCEL AI SDK 6] Preparando agente con herramientas...`)

      // Preparar herramientas
      const tools = createAppointmentTools({ businessId, sessionId })
      console.log(
        `🔧 [VERCEL AI SDK 6] Herramientas preparadas: ${
          Object.keys(tools).length
        }`
      )

      console.log(
        `🚀 [VERCEL AI SDK 6] Iniciando streamText con modelo:`,
        this.config.model
      )
      console.log(`🔧 [VERCEL AI SDK 6] Tipo de modelo:`, model.provider)

      // Detectar si el usuario está pidiendo acciones que requieren herramientas
      const lastMessage =
        messages[messages.length - 1]?.content.toLowerCase() || ''
      const requiresToolExecution =
        lastMessage.includes('disponibilidad') ||
        lastMessage.includes('mañana') ||
        lastMessage.includes('hoy') ||
        lastMessage.includes('horario') ||
        lastMessage.includes('cita') ||
        lastMessage.includes('10') ||
        lastMessage.includes('servicio') ||
        messages.some((m) => m.content.includes('especialistas'))

      // Configuración optimizada según Vercel SDK v6 best practices
      const agent = new ToolLoopAgent({
        model: model,
        instructions: systemPrompt,
        tools,
        temperature: 0, // Temperatura 0 para resultados determinísticos
        toolChoice: 'auto', // Dejar que el modelo decida cuándo usar herramientas
        stopWhen: stepCountIs(10), // Límite de pasos para evitar loops
      })

      console.log(
        `🔧 [TOOL LOOP] Configurado: toolChoice=auto, maxSteps=8, necesitaHerramientas=${requiresToolExecution}`
      )

      console.log(
        `🔧 [TOOL LOOP] toolChoice: ${
          requiresToolExecution ? 'required' : 'auto'
        }, razón: ${
          requiresToolExecution ? 'requiere herramientas' : 'respuesta libre'
        }`
      )

      const result = await agent.stream({ messages: fullMessages })

      let hasContent = false
      let chunkCount = 0
      let toolCallCount = 0
      let evaluationFailures = 0

      try {
        // Usar textStream simple para evitar loops
        for await (const chunk of result.textStream) {
          chunkCount++
          if (chunk.trim()) {
            hasContent = true
          }

          // Detectar errores de evaluación en el chunk
          if (chunk.includes('[ERROR]')) {
            evaluationFailures++
            console.warn(
              `⚠️ [EVALUATION] Error detected in chunk ${evaluationFailures}:`,
              chunk.substring(0, 100)
            )

            if (evaluationFailures >= 2) {
              console.error(
                `🚨 [EVALUATION] Múltiples errores de evaluación detectados (${evaluationFailures}), intentando recuperación`
              )
              yield {
                type: 'chunk',
                content: `\n\nHa habido dificultades en el proceso. Por favor, intentemos de nuevo con la información que necesitas.`,
              }
              return
            }
          }

          yield {
            type: 'chunk',
            content: chunk,
          }
        }

        console.log(
          `📊 [TOOL LOOP] Completado: ${chunkCount} chunks, ${toolCallCount} tool calls, ${evaluationFailures} evaluaciones fallidas`
        )

        // Si no hubo contenido pero hubo tool calls, dar respuesta de fallback
        if (!hasContent && toolCallCount > 0) {
          console.warn(
            '⚠️ [TOOL LOOP] Hubo tool calls pero sin respuesta de texto'
          )
          yield {
            type: 'chunk',
            content:
              '\n\nBasado en la información obtenida, ¿necesitas algo más específico de tu parte para continuar?',
          }
        }

        // Si hubo errores de evaluación, proporcionar feedback útil
        if (evaluationFailures > 0) {
          console.warn(
            '⚠️ [TOOL LOOP] Se detectaron errores de evaluación durante el proceso'
          )
          yield {
            type: 'chunk',
            content:
              '\n\nHe detectado algunas dificultades técnicas. Si necesitas agendar una cita, por favor proporciona toda la información clara y específica (nombre, teléfono, servicio, especialista, fecha y hora).',
          }
        }
      } catch (streamError) {
        console.error('❌ [VERCEL AI SDK 6] Error en textStream:', streamError)

        yield {
          type: 'error',
          error: `Error en streaming: ${
            streamError instanceof Error
              ? streamError.message
              : 'Error desconocido'
          }`,
        }
        return
      }

      console.log(
        `📊 [VERCEL AI SDK 6] Stream completado: ${chunkCount} chunks, hasContent: ${hasContent}`
      )

      // Si no hubo contenido en el stream, generar un error
      if (!hasContent) {
        console.warn('⚠️ [VERCEL AI SDK 6] Stream sin contenido detectado')
        yield {
          type: 'error',
          error:
            'No se recibió contenido en la respuesta. Por favor, intenta de nuevo.',
        }
        return
      }

      try {
        // Obtener el texto final
        const finalText = await result.text
        console.log(
          `📄 [VERCEL AI SDK 6] Texto final generado: ${finalText.length} caracteres`
        )

        // Detectar respuesta vacía y lanzar error
        if (!finalText.trim()) {
          console.warn('⚠️ [VERCEL AI SDK 6] Respuesta vacía detectada')
          yield {
            type: 'error',
            error:
              'El agente generó una respuesta vacía. Por favor, intenta de nuevo.',
          }
          return
        }
      } catch (textError) {
        console.error(
          '❌ [VERCEL AI SDK 6] Error obteniendo texto final:',
          textError
        )
        yield {
          type: 'error',
          error: `Error al procesar respuesta: ${
            textError instanceof Error ? textError.message : 'Error desconocido'
          }`,
        }
        return
      }
    } catch (error) {
      console.error(`❌ [VERCEL AI SDK 6] Error en streaming:`, error)
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
      }
    }
  }

  async invokeResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      businessId?: string
      sessionId?: string
      assistantName?: string
    }
  ): Promise<{ content: string; messages?: any[] }> {
    try {
      const businessId = options?.businessId || this.config.businessId
      const sessionId = options?.sessionId || this.config.sessionId
      const assistantName = options?.assistantName

      console.log(
        `⚡ [VERCEL AI SDK 6] Iniciando invoke con ${messages.length} mensajes`
      )

      const businessContext = await this.getBusinessContext(
        businessId,
        assistantName
      )

      const model = openai(this.config.model!)
      const systemPrompt = this.createSystemPrompt(businessContext)

      const fullMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages,
      ]

      console.log(`📄 [VERCEL AI SDK 6] Generando respuesta`)

      // Preparar herramientas
      const tools = createAppointmentTools({ businessId, sessionId })

      // Generación sin streaming
      const result = await generateText({
        model,
        messages: fullMessages,
        tools,
        temperature: this.config.temperature,
      })

      console.log(
        `📄 [VERCEL AI SDK 6] Texto generado: ${result.text.length} caracteres`
      )

      return {
        content: result.text,
        messages: fullMessages,
      }
    } catch (error) {
      console.error(`❌ [VERCEL AI SDK 6] Error en invoke:`, error)
      return {
        content: `Error: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`,
      }
    }
  }

  private async getBusinessContext(businessId: string, assistantName?: string) {
    // Importar dinámicamente para evitar errores de types
    const { getBusinessContext } = await import('./graph/appointment-graph')
    return getBusinessContext(businessId, assistantName)
  }

  private createSystemPrompt(context: any): string {
    return createVercelAIAgentPrompt(context)
  }
}
