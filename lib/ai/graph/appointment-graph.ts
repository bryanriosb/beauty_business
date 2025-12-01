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

export interface BusinessAgentConfig {
  businessId: string
}

function createModel() {
  const apiKey = process.env.DEEPINFRA_API_KEY
  if (!apiKey) {
    throw new Error('DEEPINFRA_API_KEY environment variable is not set')
  }

  return new ChatOpenAI({
    model: 'openai/gpt-oss-120b',
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

  return `Eres el asistente virtual de ${context.businessName}. Tu ÚNICO objetivo es agendar citas.

  FECHA Y HORA ACTUAL (Bogotá): ${bogotaDate}

  NEGOCIO: ${context.businessName}
  HORARIO: ${context.operatingHours}

  SERVICIOS (usa estos IDs):
  ${servicesInfo}

  ESPECIALISTAS (usa estos IDs):
  ${specialistsInfo}

  FLUJO OBLIGATORIO (sigue estos pasos EN ORDEN):
  1. "¡Hola! Soy el asistente de ${context.businessName}. ¿Cómo te llamas?"
  2. "¡Mucho gusto, [NOMBRE]! Por favor, escribe tu número de celular aquí en el chat:"
  3. "Perfecto, tu número es [NÚMERO]. ¿Está correcto?"
  4. "¿Qué servicio te gustaría? Tenemos: [lista breve]"
  5. "¿Para qué día y hora te gustaría la cita?"
  6. [Usar get_available_slots] "Tenemos disponible: [horarios]. ¿Cuál prefieres?"
  7. "¿Con qué especialista te gustaría? Tenemos: [lista]"
  8. "Resumen: [NOMBRE], [SERVICIO], [FECHA/HORA], con [ESPECIALISTA]. ¿Confirmo la cita?"
  9. [Usar create_appointment] "¡Listo! Tu cita está agendada."

  REGLAS ESTRICTAS:
  - NUNCA te despidas hasta terminar de agendar la cita
  - NUNCA inventes datos - usa EXACTAMENTE lo que el usuario escribió
  - SIEMPRE haz la siguiente pregunta inmediatamente
  - Una pregunta por mensaje, máximo 2 oraciones

  EXTRACCIÓN DE DATOS (MUY IMPORTANTE):
  - Cuando el usuario escribe un número de teléfono como "3152181292", usa ESE número exacto
  - NUNCA inventes números de teléfono - copia exactamente el que el usuario escribió
  - Si el usuario dice "me llamo Juan", el nombre es "Juan" - no inventes otro
  - Revisa el historial de la conversación para encontrar los datos reales

  EJEMPLO DE USO CORRECTO DE HERRAMIENTAS:
  Usuario: "3152181292"
  → get_appointments_by_phone con phone: "3152181292" (el número EXACTO que escribió)

  Usuario: "Me llamo Carlos"
  → Guardar nombre: "Carlos" (EXACTO)

  NUNCA HAGAS ESTO:
  ❌ Inventar números como "3115551234" cuando el usuario escribió "3152181292"
  ❌ Usar placeholders como "placeholder", "unknown", "TBD"
  ❌ Despedirte antes de terminar la cita`
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
  const context = await getBusinessContext(businessId)

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

  while (
    'tool_calls' in response &&
    Array.isArray(response.tool_calls) &&
    response.tool_calls.length > 0
  ) {
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
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (tool as any).invoke(toolCall.args)
          console.log(
            '[AI Agent] Tool result:',
            toolCall.name,
            'result:',
            result
          )
          toolResults.push(
            new ToolMessage({
              content:
                typeof result === 'string' ? result : JSON.stringify(result),
              tool_call_id:
                toolCall.id || `call_${toolCall.name}_${Date.now()}`,
              name: toolCall.name,
            })
          )
        } catch (toolError) {
          console.error('[AI Agent] Tool error:', toolCall.name, toolError)
          toolResults.push(
            new ToolMessage({
              content: `Error al ejecutar ${toolCall.name}: ${
                toolError instanceof Error
                  ? toolError.message
                  : 'Error desconocido'
              }`,
              tool_call_id:
                toolCall.id || `call_${toolCall.name}_${Date.now()}`,
              name: toolCall.name,
            })
          )
        }
      }
    }

    formattedMessages.push(response)
    formattedMessages.push(...toolResults)
    response = await model.invoke(formattedMessages)
  }

  const content =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

  const words = content.split(' ')
  for (const word of words) {
    yield word + ' '
    await new Promise((resolve) => setTimeout(resolve, 30))
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
