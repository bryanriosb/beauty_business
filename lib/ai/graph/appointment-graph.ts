import { StateGraph, END, START } from '@langchain/langgraph'
import {
  HumanMessage,
  AIMessage,
  BaseMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { AgentState, type AgentStateType } from './state'
import {
  createGetAvailableSlotsTool,
  createGetServicesTool,
  createGetSpecialistsTool,
  createGetAppointmentsByPhoneTool,
  createCreateAppointmentTool,
  createCancelAppointmentTool,
  createRescheduleAppointmentTool,
} from '../tools/appointment-tools'
import {
  handleGetAvailableSlots,
  handleGetServices,
  handleGetSpecialists,
  handleGetAppointmentsByPhone,
  handleCreateAppointment,
  handleCancelAppointment,
  handleRescheduleAppointment,
} from '../tools/handlers'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  createErrorInfo,
  shouldRetry,
  formatErrorForAgent,
} from './error-handler'
import type { ErrorInfo } from './state'

export interface BusinessAgentConfig {
  businessId: string
}

function createModel() {
  const apiKey = process.env.DEEPINFRA_API_KEY
  if (!apiKey) {
    throw new Error('DEEPINFRA_API_KEY environment variable is not set')
  }

  return new ChatOpenAI({
    model: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    temperature: 0.3,
    maxTokens: 1024,
    apiKey: apiKey,
    configuration: {
      baseURL: 'https://api.deepinfra.com/v1/openai',
    },
  })
}

async function getBusinessContext(businessId: string) {
  const supabase = await getSupabaseAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, type, phone_number')
    .eq('id', businessId)
    .single()

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_cents')
    .eq('business_id', businessId)
    .limit(20)

  const { data: specialists } = await supabase
    .from('specialists')
    .select('id, first_name, last_name, specialty')
    .eq('business_id', businessId)
    .limit(10)

  const { data: hours } = await supabase
    .from('business_operating_hours')
    .select('day, open_time, close_time, is_closed')
    .eq('business_id', businessId)
    .order('day')

  const daysMap: Record<string, string> = {
    '0': 'Domingo',
    '1': 'Lunes',
    '2': 'Martes',
    '3': 'Miércoles',
    '4': 'Jueves',
    '5': 'Viernes',
    '6': 'Sábado',
  }

  const operatingHours =
    hours
      ?.filter((h) => !h.is_closed)
      .map((h) => `${daysMap[h.day]}: ${h.open_time} - ${h.close_time}`)
      .join('\n') || 'No especificado'

  return {
    businessName: business?.name || 'Negocio',
    businessType: business?.type || 'Salón de belleza',
    phone: business?.phone_number,
    services:
      services?.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration_minutes,
        price: s.price_cents,
      })) || [],
    specialists:
      specialists?.map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name || ''}`.trim(),
        specialty: s.specialty || 'General',
      })) || [],
    operatingHours,
  }
}

function createSystemPrompt(
  context: Awaited<ReturnType<typeof getBusinessContext>>
) {
  const servicesInfo = context.services
    .map(
      (s) =>
        `- ${s.name} (ID: ${s.id}): ${s.duration} min, $${(
          s.price / 100
        ).toFixed(2)}`
    )
    .join('\n')

  const specialistsInfo = context.specialists
    .map((s) => `- ${s.name} (ID: ${s.id}) - ${s.specialty}`)
    .join('\n')

  const bogotaDate = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `You are the virtual assistant for ${context.businessName}. Your ONLY goal is to book appointments.
You MUST respond in Spanish (Colombia). Be friendly and warm Reasoning HIGH.

CURRENT DATE/TIME (Bogotá): ${bogotaDate}

BUSINESS: ${context.businessName}
HOURS: ${context.operatingHours}

AVAILABLE SERVICES (use these exact IDs):
${servicesInfo}

AVAILABLE SPECIALISTS (use these exact IDs):
${specialistsInfo}

MANDATORY BOOKING FLOW (follow IN ORDER):
1. Greet and ask for name: "¡Hola! Soy el asistente de ${context.businessName}. Para agendar una cita, es necesario conocer tu nombre. Por favor dime Cómo te llamas?"
2. Ask to TYPE phone number: "¡Mucho gusto, [NAME]! Por favor, escribe en el campo de texto tu número de celular para evitar confusiones:"
3. Confirm phone: "El número ingresado es [NUMBER], ¿está correcto?"
4. Ask to TYPE email: "Perfecto. Ahora escribe tu correo electrónico:"
5. Confirm email: "Y el correo [EMAIL], ¿está correcto?"
6. Ask for service: "¿Por favor me puedes indicar qué servicios te gustaría?"
7. Ask for date/time: "Eres tan amable de confirmar, ¿para qué día y hora quieres agendar?"
8. Use get_available_slots tool, then offer times: "Tenemos disponible: [times]. ¿Cuál prefieres?"
9. Ask for specialist: "¿Ya tienes un especialista en mente con el que quieres agendar? ¿O desea saber cuales estan disponibles?"
10. Show summary and confirm: "Resumen: [NAME], [PHONE], [EMAIL], [SERVICE], [DATE/TIME], con [SPECIALIST]. ¿Confirmo?"
11. Use create_appointment tool: "¡Listo! Tu cita está agendada."

CRITICAL RULES:
- ALWAYS respond with natural Spanish text ONLY
- NEVER output status messages like "[Waiting]", "[Processing]", "(Esperando)"
- NEVER use brackets [] or parentheses () for internal states
- NEVER say goodbye until appointment is complete
- NEVER invent data - use EXACTLY what user wrote
- ALWAYS ask the next question immediately
- One question per message, max 2 sentences

CONVERSATIONAL EFFICIENCY (VERY IMPORTANT):
- If user gives a SPECIFIC answer, do NOT ask again. Move to next step.
- Example: User says "a las 3pm" → verify availability, if available proceed to ask specialist, do NOT ask "¿prefieres las 3pm?"
- Example: User says "con Bryan" → proceed to summary, do NOT ask "¿te gustaría con Bryan?"
- Be CONCISE: If user already chose, just CONFIRM and move on
- When time is available, say: "Perfecto, las 3pm está disponible. ¿Con qué especialista te gustaría?"

TOOL ERROR HANDLING (EXTREMELY IMPORTANT):
- If a tool result starts with "[ERROR]", the operation FAILED - read the [ACCIÓN] for guidance
- NEVER say "¡Listo!" or "Tu cita está agendada" if create_appointment returned an error
- If you see "[ACCIÓN] Informa al usuario...", follow that instruction exactly
- A successful appointment will return "¡Cita agendada exitosamente!" - only then confirm to user
- For temporary errors: The system already retried, inform user of the issue
- For user_input errors: Ask user to verify/change their input
- For permanent errors: Apologize and suggest contacting the business directly

DATA EXTRACTION (VERY IMPORTANT):
- When user writes phone "3152181292", use THAT EXACT number in tools
- NEVER invent phone numbers - copy exactly what user wrote
- If user says "me llamo Juan", name is "Juan" - don't invent another
- Check conversation history for real data

CORRECT TOOL USAGE:
User: "3152181492"
→ Call get_appointments_by_phone with phone: "3152181292" (EXACT number)

NEVER DO THIS:
❌ Invent numbers like "3115551234" when user wrote "3152181292"
❌ Use placeholders like "placeholder", "unknown", "TBD"
❌ Output "[Waiting for response]" or any status text
❌ Say goodbye before completing appointment`
}

export async function createAppointmentAgent(config: BusinessAgentConfig) {
  const context = await getBusinessContext(config.businessId)
  const businessId = config.businessId

  const tools = [
    createGetServicesTool(businessId, handleGetServices),
    createGetSpecialistsTool(businessId, handleGetSpecialists),
    createGetAvailableSlotsTool(businessId, handleGetAvailableSlots),
    createGetAppointmentsByPhoneTool(businessId, handleGetAppointmentsByPhone),
    createCreateAppointmentTool(businessId, handleCreateAppointment),
    createCancelAppointmentTool(handleCancelAppointment),
    createRescheduleAppointmentTool(handleRescheduleAppointment),
  ]

  const model = createModel().bindTools(tools)
  const toolNode = new ToolNode(tools)

  async function agentNode(state: AgentStateType) {
    const systemMessage = new SystemMessage(createSystemPrompt(context))
    const messages = [systemMessage, ...state.messages]
    const response = await model.invoke(messages)
    return { messages: [response] }
  }

  function shouldContinue(state: AgentStateType): 'tools' | typeof END {
    const lastMessage = state.messages[state.messages.length - 1]
    if (
      lastMessage &&
      'tool_calls' in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'tools'
    }
    return END
  }

  const workflow = new StateGraph(AgentState)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')

  return workflow.compile()
}

export async function* streamAgentResponse(
  businessId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncGenerator<string> {
  console.log(
    '[AI Agent] streamAgentResponse started, messages:',
    messages.length
  )

  const context = await getBusinessContext(businessId)
  console.log('[AI Agent] Business context loaded:', context.businessName)

  const tools = [
    createGetServicesTool(businessId, handleGetServices),
    createGetSpecialistsTool(businessId, handleGetSpecialists),
    createGetAvailableSlotsTool(businessId, handleGetAvailableSlots),
    createGetAppointmentsByPhoneTool(businessId, handleGetAppointmentsByPhone),
    createCreateAppointmentTool(businessId, handleCreateAppointment),
    createCancelAppointmentTool(handleCancelAppointment),
    createRescheduleAppointmentTool(handleRescheduleAppointment),
  ]

  const model = createModel().bindTools(tools)

  const formattedMessages: BaseMessage[] = [
    new SystemMessage(createSystemPrompt(context)),
    ...messages.map((msg) =>
      msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    ),
  ]

  let response = await model.invoke(formattedMessages)
  let loopCount = 0
  const maxLoops = 5
  const retryState: Map<string, { count: number; lastError: ErrorInfo | null }> = new Map()

  while (
    'tool_calls' in response &&
    Array.isArray(response.tool_calls) &&
    response.tool_calls.length > 0 &&
    loopCount < maxLoops
  ) {
    loopCount++
    console.log(`[AI Agent] Tool loop iteration ${loopCount}`)

    const toolResults: BaseMessage[] = []

    for (const toolCall of response.tool_calls) {
      console.log(
        '[AI Agent] Tool call:',
        toolCall.name,
        'args:',
        JSON.stringify(toolCall.args),
        'id:',
        toolCall.id
      )
      const tool = tools.find((t) => t.name === toolCall.name)
      if (tool) {
        const toolRetryKey = `${toolCall.name}_${JSON.stringify(toolCall.args)}`
        let retryInfo = retryState.get(toolRetryKey) || { count: 0, lastError: null }
        let result: string | null = null
        let lastError: ErrorInfo | null = null

        const maxRetries = 2
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawResult = await (tool as any).invoke(toolCall.args)
            result = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult)

            // Check if result contains error (some tools return error strings)
            if (result.toLowerCase().includes('error')) {
              const errorInfo = createErrorInfo(toolCall.name, result, toolCall.args)
              console.log('[AI Agent] Tool returned error:', errorInfo.errorType, '-', result.substring(0, 100))

              if (errorInfo.errorType === 'temporary' && attempt < maxRetries) {
                console.log(`[AI Agent] Retrying ${toolCall.name} (attempt ${attempt + 1}/${maxRetries})`)
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
                continue
              }

              // Not retryable or max retries reached
              lastError = errorInfo
              result = formatErrorForAgent(errorInfo)
            }

            break // Success or non-retryable error
          } catch (toolError) {
            const errorMessage = toolError instanceof Error ? toolError.message : 'Error desconocido'
            const errorInfo = createErrorInfo(toolCall.name, errorMessage, toolCall.args)
            console.error('[AI Agent] Tool exception:', toolCall.name, errorInfo.errorType, errorMessage)

            if (shouldRetry(errorInfo, attempt) && attempt < maxRetries) {
              console.log(`[AI Agent] Retrying ${toolCall.name} after exception (attempt ${attempt + 1}/${maxRetries})`)
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
              continue
            }

            lastError = errorInfo
            result = formatErrorForAgent(errorInfo)
            break
          }
        }

        if (lastError) {
          retryInfo = { count: retryInfo.count + 1, lastError }
          retryState.set(toolRetryKey, retryInfo)
        }

        console.log(
          '[AI Agent] Tool result:',
          toolCall.name,
          'result:',
          result ? result.substring(0, 200) : 'null'
        )

        toolResults.push(
          new ToolMessage({
            content: result || 'Error: No se obtuvo resultado',
            tool_call_id: toolCall.id || `call_${toolCall.name}_${Date.now()}`,
            name: toolCall.name,
          })
        )
      }
    }

    formattedMessages.push(response)
    formattedMessages.push(...toolResults)

    console.log('[AI Agent] Invoking model after tool results...')
    try {
      response = await model.invoke(formattedMessages)
      console.log('[AI Agent] Model response received')
    } catch (modelError) {
      console.error('[AI Agent] Model invocation error:', modelError)
      throw modelError
    }

    // Log intermedio del contenido de respuesta
    const intermediateContent =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)
    console.log(
      '[AI Agent] Intermediate response:',
      intermediateContent.substring(0, 200)
    )
    console.log(
      '[AI Agent] Has tool_calls:',
      'tool_calls' in response && Array.isArray(response.tool_calls)
        ? response.tool_calls.length
        : 0
    )
  }

  if (loopCount >= maxLoops) {
    console.warn('[AI Agent] Max tool loops reached, forcing response')
  }

  let content =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

  console.log('[AI Agent] Raw response content:', content)

  // Filtrar mensajes de estado que el modelo no debería generar
  const originalContent = content
  content = content
    .replace(/\[.*?esperando.*?\]/gi, '')
    .replace(/\[.*?waiting.*?\]/gi, '')
    .replace(/\[.*?respuesta.*?\]/gi, '')
    .replace(/\[.*?response.*?\]/gi, '')
    .replace(/\[.*?proceso.*?\]/gi, '')
    .replace(/\[.*?processing.*?\]/gi, '')
    .replace(/\(.*?waiting.*?\)/gi, '')
    .replace(/\(.*?esperando.*?\)/gi, '')
    .trim()

  // Si después de filtrar queda vacío, el modelo no respondió correctamente
  if (!content) {
    console.warn(
      '[AI Agent] Response was empty after filtering. Original:',
      originalContent
    )
    // Proporcionar una respuesta de fallback
    content = '¿En qué más puedo ayudarte?'
  }

  const words = content.split(' ')
  for (const word of words) {
    if (word.trim()) {
      yield word + ' '
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }
}

export async function invokeAgent(
  businessId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  _modelConfig?: Record<string, unknown>
) {
  const agent = await createAppointmentAgent({ businessId })

  const formattedMessages: BaseMessage[] = messages.map((msg) =>
    msg.role === 'user'
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  )

  const result = await agent.invoke({
    messages: formattedMessages,
    businessId,
  })

  const lastMessage = result.messages[result.messages.length - 1]
  return {
    content:
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content),
    messages: result.messages,
  }
}
