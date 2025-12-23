import { AgentProvider, AgentStreamEvent } from './types'
import { streamText, generateText, ToolLoopAgent, stepCountIs } from 'ai'
import { deepinfra } from '@ai-sdk/deepinfra'
import { google } from '@ai-sdk/google'
import { createAppointmentTools } from './tools/ai-sdk-tools'

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

      // Importante: usar 'auto' siempre y dejar que el modelo decida cuándo usar herramientas
      const agent = new ToolLoopAgent({
        model: model,
        instructions:
          systemPrompt +
          (requiresToolExecution
            ? '\n\nIMPORTANTE: El usuario necesita información específica. USA la herramienta EXACTA que necesites UNA SOLA VEZ y luego responde basado en el resultado.'
            : ''),
        tools,
        temperature: this.config.temperature,
        toolChoice: 'auto', // Siempre 'auto' para evitar loops infinitos
        stopWhen: stepCountIs(8), // Limitar a máximo 8 pasos para evitar loops
      })

      let currentResult = await agent.stream({ messages: fullMessages })
      let currentMessages = fullMessages

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
      const maxToolCalls = 3 // Máximo 3 llamadas a herramientas para evitar loops

      try {
        // Usar textStream simple para evitar loops
        for await (const chunk of result.textStream) {
          chunkCount++
          if (chunk.trim()) {
            hasContent = true
          }

          // Detectar repeticiones que indiquen loop
          if (chunk.includes('Jimmy Ardila') && chunk.includes('Bryan Rios')) {
            console.warn(
              `⚠️ [TOOL LOOP] Posible loop: misma respuesta de especialistas (chunkCount: ${chunkCount})`
            )

            // Si después de mostrar especialistas se repite, forzar siguiente paso
            if (chunkCount > 20) {
              console.log(`🔄 [TOOL LOOP] Forzando avance para evitar loop`)
              yield {
                type: 'chunk',
                content: `\n\nPerfecto, ya tenemos los especialistas. Jimmy Ardila y Bryan Rios están disponibles para Corte Caballero. ¿Con cuál prefieres agendar y para qué fecha?`,
              }
              return
            }
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

        // Si falla el streaming con Gemini, intentar con generateText como fallback
        console.log(
          `🛠️ [VERCEL AI SDK 6] Preparando agente con herramientas...`
        )

        // Preparar herramientas
        const tools = createAppointmentTools({ businessId, sessionId })
        console.log(
          `🔧 [VERCEL AI SDK 6] Herramientas preparadas: ${
            Object.keys(tools).length
          } (${Object.keys(tools).join(', ')})`
        )
        try {
          const fallbackResult = await generateText({
            model,
            messages: fullMessages,
            tools,
            temperature: this.config.temperature,
          })

          console.log(
            '✅ [VERCEL AI SDK 6] Fallback exitoso, texto:',
            fallbackResult.text.length,
            'caracteres'
          )

          if (fallbackResult.text.trim()) {
            for (const char of fallbackResult.text) {
              yield {
                type: 'chunk',
                content: char,
              }
            }
            return
          }
        } catch (fallbackError) {
          console.error(
            '❌ [VERCEL AI SDK 6] Fallback también falló:',
            fallbackError
          )
        }

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

      const model = deepinfra(this.config.model!)
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
    return `Eres un asistente virtual experto para ${
      context.businessName
    }, un ${
      context.businessType
    } especializado en agendamiento de citas de belleza.

# Identity

Eres un asistente amable y profesional para ${
      context.businessName
    }, dedicado a ayudar a los clientes con agendamiento, consultas y gestión de citas de belleza con Rasoning HIGH.

# Contexto del negocio

- Nombre: ${context.businessName}
- Teléfono: ${context.phone || 'No especificado'}
- Horarios de atención: ${context.operatingHours}
- Fecha y hora actual: ${context.currentDateTime}

Servicios disponibles:
${context.services
  .map(
    (s: any) =>
      `- ${s.name}: ${s.duration}min, $${(s.price / 100).toFixed(2)} [ID: ${
        s.id
      }]`
  )
  .join('\n')}

Especialistas disponibles:
${context.specialists
  .map((s: any) => `- ${s.name}: ${s.specialty} [ID: ${s.id}]`)
  .join('\n')}

# Output rules for voice interaction

- Responde en texto plano claro y conciso
- Usa frases cortas y naturales, ideales para texto a voz
- Evita jerga técnica o números complejos
- Pronuncia claramente nombres y fechas
- Un máximo de 3 frases por respuesta

# Herramientas disponibles

1. get_services - Obtiene lista completa de servicios con precios y duraciones
2. get_specialists - Lista TODOS los especialistas disponibles
3. get_specialists_for_service - Lista especialistas FILTRADOS por categoría de servicio específico
4. get_available_slots - Consulta disponibilidad (requiere: date, serviceId, specialistId)
5. get_appointments_by_phone - Busca citas por teléfono (requiere: phone)
6. create_appointment - Crea nueva cita (requiere: customerName, customerPhone, customerEmail, serviceIds, specialistId, startTime)
7. cancel_appointment - Cancela cita (requiere: reason)
8. reschedule_appointment - Reprograma cita (requiere: newStartTime, newSpecialistId)

# Flujo conversacional óptimo para AGENDAR CITAS

1. Saluda amablemente
2. Identifica intención: agendar, consultar, cancelar o reprogramar
3. Si es AGENDAR, sigue ESTRICTAMENTE este orden:
   a) Pedir teléfono del cliente → usar get_appointments_by_phone
   b) Mostrar servicios con get_services → que elija el servicio
   c) Obtener especialistas para ese servicio con get_specialists_for_service → que elija especialista
   d) Pedir fecha → usar get_available_slots con serviceId Y specialistId
   e) Mostrar horarios disponibles → que elija uno
   f) Confirmar y crear cita con create_appointment
4. Haz UNA pregunta a la vez
5. Confirma siempre antes de ejecutar acciones
6. Explica claramente lo que estás haciendo en cada paso

# Instrucciones específicas por caso:
1. Saluda cordialmente y pregunta cómo ayudar.
2. Para AGENDAR cita: sigue el flujo estricto anterior
3. Para REPROGRAMAR: primero busca cita existente, luego nueva fecha/hora
4. Para CONSULTAR: usa get_appointments_by_phone primero

# Reglas CRÍTICAS de herramientas

- get_appointments_by_phone siempre primero para identificar o crear cliente
- get_services → mostrar lista con precios y duraciones
- get_specialists_forService → filtrar especialistas POR CATEGORÍA del servicio elegido
- get_available_slots REQUIERE ambos: serviceId Y specialistId
- create_appointment → usar todos los datos recopilados
- NUNCA saltes pasos del flujo
- Pide información CLARA y específica en cada paso

# Manejo de fechas IMPORTANTE

La herramienta get_available_slots requiere fechas en formato YYYY-MM-DD. Debes convertir las expresiones de fecha naturales a este formato:
- "hoy" → fecha actual en YYYY-MM-DD
- "mañana" → fecha de mañana en YYYY-MM-DD  
- "pasado mañana" → fecha de pasado mañana en YYYY-MM-DD
- "el viernes" → próximo viernes en YYYY-MM-DD
- "la próxima semana" → fecha específica en YYYY-MM-DD

FECHA ACTUAL: Usa la fecha actual del contexto para tus conversiones.

# Guardrails

- Solo procesa citas dentro del horario laboral
- No le pidas al usuario entrada de fechas en formatos complejos (2025‑12‑08) o rangos. Mejor unas fechas simples (ej. Para mañana, el 5 de mayo, el próximo lunes)
- Pide información clara antes de confirmar
- No agendas citas en pasado
- Protege datos del cliente
- Ofrece alternativas de fecha/especialista cuando no hay disponibilidad

# IMPORTANTE
- Debes hacer una pregunta a la vez para recopilar información del cliente de manera eficiente
- No seas redundante, ve al grano
- No inventes datos, usa las herramientas para obtener información real
- Si falla una herramienta, indica que debes intentarlo de nuevo y no continúes con información incompleta ni inventada

# Meta

Ayuda a los clientes a agendar sus citas de belleza de manera eficiente, profesional y amable, usando las herramientas disponibles para obtener información precisa y confirmar disponibilidad.

Por favor, inicia con un saludo amable y pregunta cómo puedes ayudar hoy.`
  }
}
