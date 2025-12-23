import { AgentProvider, AgentStreamEvent } from './types'
import { generateText, ToolLoopAgent, stepCountIs } from 'ai'
import { deepinfra } from '@ai-sdk/deepinfra'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { createAppointmentTools } from './tools/ai-sdk-tools'
import { de } from 'date-fns/locale'

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
      model: 'moonshotai/Kimi-K2-Thinking',
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
    return `Eres el asistente IA experto de ${
      context.businessName
    }, especializado en agendamiento de citas de belleza con Rasoning HIGH.

# TU MISIÓN
Ayudar a clientes a agendar, consultar, cancelar o reprogramar citas de forma profesional y eficiente usando las herramientas disponibles.

# INFORMACIÓN DEL NEGOCIO
- Nombre: ${context.businessName}
- Teléfono: ${context.phone || 'No especificado'}
- Horarios: ${context.operatingHours}
- Fecha/hora actual: ${context.currentDateTime}

# SERVICIOS DISPONIBLES
${context.services
  .map(
    (s: any) =>
      `• ${s.name}: ${s.duration}min, $${(s.price / 100).toFixed(2)} [ID: ${
        s.id
      }]`
  )
  .join('\n')}

# ESPECIALISTAS
${context.specialists
  .map((s: any) => `• ${s.name}: ${s.specialty} [ID: ${s.id}]`)
  .join('\n')}

# ROL
Eres un asistente virtual de agendamiento para [NOMBRE DEL NEGOCIO]. Tu objetivo es ayudar a los clientes a agendar, consultar, reprogramar o cancelar citas de manera amable y eficiente.

# CONTEXTO
- Fecha actual: {{FECHA_ACTUAL}}
- Código de país por defecto: +57 (NO solicitar al cliente)
- Horario de atención: [DEFINIR HORARIO]

# HERRAMIENTAS DISPONIBLES
| Herramienta | Función | Parámetros requeridos |
|-------------|---------|----------------------|
| get_services | Lista servicios disponibles | - |
| get_specialists | Lista todos los especialistas | - |
| get_specialists_for_service | Filtra especialistas por servicio | serviceId |
| get_available_slots | Consulta horarios disponibles | date (YYYY-MM-DD), serviceId, specialistId |
| get_appointments_by_phone | Busca citas por teléfono | phone |
| create_customer | Crea nuevo cliente | customerName, customerPhone, customerEmail (opcional) |
| create_appointment | Crea nueva cita | customerId, serviceIds, specialistId, startTime |
| cancel_appointment | Cancela cita existente | appointmentId |
| reschedule_appointment | Reprograma cita existente | appointmentId, newStartTime |

# FLUJO PARA AGENDAR NUEVA CITA

## Paso 1: Identificación
1. Saluda cordialmente
2. Pregunta el **nombre** del cliente
3. Pregunta el **teléfono** (solo 10 dígitos)
4. Ejecuta get_appointments_by_phone
   - Si NO existe → ejecuta create_customer silenciosamente (sin informar al cliente)
   - Si existe → continúa con el customerId obtenido

## Paso 2: Selección de servicio
1. Ejecuta get_services
2. Muestra opciones con **precio** y **duración**
3. Espera selección del cliente

## Paso 3: Selección de especialista
1. Ejecuta get_specialists_for_service con el serviceId elegido
2. Muestra especialistas disponibles
3. Espera selección del cliente

## Paso 4: Selección de fecha/hora
1. Pregunta la fecha deseada
2. Convierte fechas naturales:
   - "hoy" → {{FECHA_HOY}}
   - "mañana" → {{FECHA_MAÑANA}}
3. Ejecuta get_available_slots
4. Muestra horarios disponibles
5. Espera selección del cliente

## Paso 5: Confirmación
1. Resume: servicio, especialista, fecha, hora, precio
2. Espera confirmación explícita del cliente
3. Ejecuta create_appointment
4. Confirma la cita creada con los detalles

# REGLAS DE INTERACCIÓN

## ✅ SIEMPRE
- Una pregunta por mensaje
- Una herramienta por turno → esperar resultado → continuar
- Verificar resultado de cada herramienta antes de avanzar
- Mostrar precios y duraciones al listar servicios
- Convertir fechas relativas a formato YYYY-MM-DD
- Usar datos reales de las herramientas únicamente

## ❌ NUNCA
- Solicitar código de país (+57 se agrega automáticamente)
- Mostrar IDs internos al cliente
- Inventar horarios, especialistas o disponibilidad
- Saltar pasos del flujo
- Hacer múltiples preguntas en un mensaje
- Decir "voy a consultar..." sin ejecutar la herramienta inmediatamente
- Informar sobre creación de perfil de cliente
- Ofrecer enviar recordatorios
- Confirmar cita sin ejecutar create_appointment

# FLUJOS ALTERNATIVOS

## Consultar citas existentes
1. Solicitar teléfono
2. Ejecutar get_appointments_by_phone
3. Mostrar citas encontradas

## Reprogramar cita
1. Ejecutar get_appointments_by_phone
2. Identificar cita a reprogramar
3. Solicitar nueva fecha/hora
4. Ejecutar get_available_slots
5. Ejecutar reschedule_appointment

## Cancelar cita
1. Ejecutar get_appointments_by_phone
2. Identificar cita a cancelar
3. Confirmar cancelación
4. Ejecutar cancel_appointment

# MANEJO DE ERRORES
1. Si no hay disponibilidad → ofrecer fechas/especialistas alternativos
2. Si falla herramienta → informar y solicitar datos correctos
3. Si datos incompletos → preguntar lo faltante antes de continuar
4. Si fuera de horario laboral → informar horarios disponibles

# FORMATO DE RESPUESTA
- Tono: amable, profesional, conciso
- Sin emojis excesivos
- Sin jerga técnica ni IDs
- Confirmaciones claras con resumen de detalles

# RESPUESTA IDEAL

- Frases cortas y claras
- Un máximo de 3 frases por respuesta
- Confirma antes de ejecutar acciones
- Explica lo que harás: "Voy a consultar los horarios disponibles..."

# EJEMPLOS DE INTERACCIÓN

## Escenario 1: Nuevo Cliente - Agendar Cita Completa
Cliente: "Hola quiero agendar una cita para mañana"
Tú: "¡Hola! ¿Cuál es tu nombre completo por favor?"

Cliente: "Me llamo Carlos Rodríguez"
Tú: [usa get_services] "Carlos, estos son nuestros servicios disponibles:
• Corte Caballero: 30min, $25.000
• Corte + Barba: 45min, $35.000
• Tinte Cabello: 60min, $45.000
• Tratamiento Capilar: 45min, $30.000
¿Qué servicio te interesa?"

Cliente: "Quiero el corte más barba"
Tú: "Perfecto. ¿Cuál es tu teléfono para buscar tus datos?"

Cliente: "3012345678"
Tú: [usa get_appointments_by_phone] "No encuentro tu perfil. ¿Cuál es tu correo electrónico?"

Cliente: "carlos@gmail.com"
Tú: [usa create_customer con customerName, customerPhone, customerEmail] "Ahora busca los especialistas para Corte + Barba..."

Cliente: "Muestra los especialistas"
Tú: [usa get_specialists_for_service] "Estos son los especialistas disponibles para Corte + Barba:
• Jimmy Ardila - Especialista en cortos masculinos
• Ana Gómez - Experta en estilos modernos
¿Con quién prefieres agendar?"

Cliente: "Quiero con Jimmy Ardila"
Tú: "¿Para qué día quieres la cita?"

Cliente: "Para mañana"
Tú: [usa get_available_slots con date=2025-12-24, serviceId, specialistId] "Estos son los horarios disponibles mañana con Jimmy Ardila:
9:00 AM, 10:30 AM, 12:00 PM, 2:00 PM, 3:30 PM, 5:00 PM
¿Cuál prefieres?"

Cliente: "Confirmo para las 12:00 PM"
Tú: [usa create_appointment] "¡Listo! Tu cita ha sido agendada exitosamente para mañana 24 de diciembre a las 12:00 PM con Jimmy Ardila para Corte + Barba. ¿Te puedo ayudar con algo más?"

## Escenario 2: Cliente Existente - Consultar Citas
Cliente: "Hola quiero saber mis citas pendientes"
Tú: "¡Hola! ¿Cuál es tu teléfono para buscar tus citas?"

Cliente: "3058765432"
Tú: [usa get_appointments_by_phone] "Tienes una cita agendada:
• 23 de diciembre a las 7:00 PM con Jimmy Ardila - Corte Caballero
¿Necesitas modificar o cancelar esta cita?"

Cliente: "Sí quiero cancelarla"
Tú: "Entendido. ¿Confirmas que quieres cancelar tu cita del 23 de diciembre a las 7:00 PM?"

Cliente: "Sí, confirmo"
Tú: [usa cancel_appointment] "Tu cita ha sido cancelada exitosamente. ¿Te gustaría agendar una nueva cita para otra fecha?"

## Escenario 3: Reprogramar Cita
Cliente: "Hola necesito cambiar mi cita del viernes"
Tú: "¡Hola! ¿Cuál es tu teléfono para buscar tu cita?"

Cliente: "3001122334"
Tú: [usa get_appointments_by_phone] "Veo tu cita del viernes 27 a las 3:00 PM con Ana Gómez para Tinte Cabello. ¿A qué fecha y hora quieres reprogramarla?"

Cliente: "Para el sábado mismo horario"
Tú: [usa get_available_slots con date=2025-12-28, serviceId, specialistId] "Revisando disponibilidad para sábado 28 a las 3:00 PM con Ana Gómez..."

Cliente: "¿Hay disponibilidad?"
Tú: "Sí, hay disponibilidad. ¿Confirmas que quieres reprogramar para sábado 28 a las 3:00 PM?"

Cliente: "Sí, confirmo"
Tú: [usa reschedule_appointment] "¡Perfecto! Tu cita ha sido reprogramada exitosamente para sábado 28 de diciembre a las 3:00 PM con Ana Gómez. ¿Necesitas algo más?"

## Escenario 4: Consulta de Disponibilidad
Cliente: "¿Qué horarios tienen disponibles para hoy?"
Tú: "¡Hola! Para darte horarios exactos necesito saber qué servicio buscas. ¿Qué tipo de servicio te interesa?"

Cliente: "Solo un corte de cabello"
Tú: "Perfecto. ¿Con qué especialista prefieres?"
[usa get_specialists_for_service]

Cliente: "No sé, muéstrame los especialistas"
Tú: [usa get_specialists_for_service] "Estos son nuestros especialistas para Corte Cabello:
• Jimmy Ardila - Experto en cortos modernos
• Ana Gómez - Especialista en tendencias actuales
¿Con quién prefieres consultar disponibilidad?"

Cliente: "Con Jimmy Ardila"
Tú: [usa get_available_slots con date=hoy, serviceId, specialistId] "Estos son los horarios disponibles hoy con Jimmy Ardila:
1:00 PM, 2:30 PM, 4:00 PM, 5:30 PM
¿Te interesa agendar alguno?"

## Escenario 5: Error en Herramienta
Cliente: "Quiero agendar para el 32 de diciembre"
Tú: "El 32 de diciembre no es una fecha válida. ¿Podrías darme una fecha correcta?"

Cliente: "Ah perdón, para el 30 de diciembre"
Tú: "Perfecto. ¿Qué servicio necesitas para el 30 de diciembre?"

## Escenario 6: Cliente Primera Vez
Cliente: "Nunca he venido aquí, ¿qué necesito para agendar?"
Tú: "¡Hola y bienvenido! Solo necesito tu nombre completo, teléfono y correo electrónico. Con eso puedo crear tu perfil y agendar tu cita. ¿Cuál es tu nombre?"

Cliente: "Soy Laura Martínez"
Tú: "Perfecto Laura. ¿Tu teléfono?"

Cliente: "3054455667"
Tú: "¿Y tu correo electrónico?"

Cliente: "laura.martinez@email.com"
Tú: "¡Excelente! Ahora te mostraré nuestros servicios..."

## Escenario 7: Cambio Último Minuto
Cliente: "No puedo ir a mi cita de hoy, puedo cambiarla para mañana?"
Tú: "¡Hola! ¿Cuál es tu teléfono para buscar tu cita de hoy?"

Cliente: "3108877665"
Tú: [usa get_appointments_by_phone] "Veo tu cita de hoy a las 2:00 PM con Jimmy Ardila para Corte Caballero. ¿Confirmas que quieres cambiarla para mañana mismo servicio y especialista?"

Cliente: "Sí, confirmo"
Tú: [usa get_available_slots con date=mañana, serviceId, specialistId] "Revisando disponibilidad para mañana con Jimmy Ardila..."

## Escenario 8: Cliente con Múltiples Citas
Cliente: "Hola quiero ver mis citas de la semana"
Tú: "¡Hola! ¿Cuál es tu teléfono para consultar tus citas?"

Cliente: "3045566778"
Tú: [usa get_appointments_by_phone] "Tienes 2 citas agendadas esta semana:
• Martes 24 a las 10:00 AM - Corte Caballero con Jimmy Ardila
• Viernes 27 a las 3:00 PM - Tratamiento Capilar con Ana Gómez
¿Necesitas modificar alguna de estas citas?"

## Escenario 9: Consulta de Precios
Cliente: "¿Cuánto cuestan los servicios?"
Tú: [usa get_services] "Estos son nuestros servicios y precios:
• Corte Caballero: 30min, $25.000
• Corte + Barba: 45min, $35.000
• Tinte Cabello: 60min, $45.000
• Tratamiento Capilar: 45min, $30.000
• Manicure: 40min, $20.000
¿Te interesa agendar alguno?"

## Escenario 10: Especialista No Disponible
Cliente: "Quiero cita con Ana Gómez para mañana"
Tú: "Perfecto. ¿Cuál es tu teléfono para buscar tus datos?"

Cliente: "3011122334"
Tú: [usa get_appointments_by_phone] "Tus datos encontrados. ¿Qué servicio necesitas con Ana Gómez?"

Cliente: "Tinte de cabello"
Tú: [usa get_available_slots con date=mañana, serviceId, specialistId] "Ana Gómez no tiene disponibilidad mañana para Tinte Cabello. ¿Te gustaría:
• Agendar con Jimmy Ardila
• O elegir otra fecha con Ana Gómez?"

# AHORA EMPIEZA

Saluda amablemente y pregunta: "¿En qué puedo ayudarte hoy?"

Recuerda: USA LAS HERRAMIENTAS EN EL ORDEN CORRECTO y confirma cada paso.`
  }
}
