import { ChatOpenAI } from '@langchain/openai'

export type Intent =
  | 'BOOKING'
  | 'INQUIRY'
  | 'AVAILABILITY'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'GENERAL'

export interface RouterResult {
  intent: Intent
  confidence: number
  extractedInfo?: {
    serviceMentioned?: string
    dateMentioned?: string
    hasExistingAppointment?: boolean
  }
}

const ROUTER_SYSTEM_PROMPT = `Reasoning HIGH

You are an intent classifier for a beauty salon appointment assistant.
Analyze the user message (which may be in Spanish) and classify it into ONE of these intents:

## INTENTS

BOOKING - User wants to create a NEW appointment
  Keywords: agendar, reservar, hacer cita, quiero una cita, necesito cita, sacar cita

INQUIRY - User asks about services, prices, specialists, or their existing appointments
  Keywords: cuánto cuesta, qué servicios, precios, mis citas, tengo cita, información

AVAILABILITY - User wants to check available times WITHOUT booking yet
  Keywords: disponibilidad, qué horarios, cuándo pueden, hay espacio, tienen cupo

RESCHEDULE - User wants to change an existing appointment to different date/time
  Keywords: cambiar cita, reprogramar, mover cita, otra fecha, modificar

CANCEL - User wants to cancel an existing appointment
  Keywords: cancelar, anular, no puedo ir, eliminar cita, quitar cita

GENERAL - Greetings, thanks, farewells, or unclear intent
  Keywords: hola, gracias, buenos días, adiós, chao

## CLASSIFICATION RULES

1. If user just greets ("hola", "buenos días") → GENERAL
2. If user asks about prices or services info → INQUIRY
3. If user explicitly wants to book/schedule → BOOKING
4. If user mentions CHANGING or MOVING an EXISTING appointment → RESCHEDULE
5. If user wants to CHECK availability without commitment → AVAILABILITY
6. If user wants to CANCEL or cannot attend → CANCEL

## OUTPUT FORMAT

Respond ONLY with a JSON object in this exact format:
{"intent": "INTENT_NAME", "confidence": 0.95}

Do not include any other text, explanation, or markdown.`

function createRouterModel() {
  const apiKey = process.env.DEEPINFRA_API_KEY
  if (!apiKey) {
    throw new Error('DEEPINFRA_API_KEY environment variable is not set')
  }

  return new ChatOpenAI({
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    temperature: 0.1,
    maxTokens: 100,
    apiKey,
    configuration: {
      baseURL: 'https://api.deepinfra.com/v1/openai',
    },
  })
}

export async function routeIntent(
  userMessage: string,
  conversationContext?: string
): Promise<RouterResult> {
  const model = createRouterModel()

  const contextInfo = conversationContext
    ? `\n\nConversation context (previous messages summary): ${conversationContext}`
    : ''

  const prompt = `${ROUTER_SYSTEM_PROMPT}${contextInfo}

User message: "${userMessage}"`

  try {
    const response = await model.invoke(prompt)
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    const jsonMatch = content.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      console.warn('[Router] Could not parse JSON, defaulting to GENERAL:', content)
      return { intent: 'GENERAL', confidence: 0.5 }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const intent = validateIntent(parsed.intent)

    return {
      intent,
      confidence: parsed.confidence || 0.8,
      extractedInfo: parsed.extractedInfo,
    }
  } catch (error) {
    console.error('[Router] Error classifying intent:', error)
    return { intent: 'GENERAL', confidence: 0.3 }
  }
}

function validateIntent(intent: string): Intent {
  const validIntents: Intent[] = ['BOOKING', 'INQUIRY', 'AVAILABILITY', 'RESCHEDULE', 'CANCEL', 'GENERAL']
  const normalized = intent?.toUpperCase() as Intent
  return validIntents.includes(normalized) ? normalized : 'GENERAL'
}

export function getConversationContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  if (messages.length === 0) return ''

  const recentMessages = messages.slice(-4)
  return recentMessages
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Asistente'}: ${m.content.substring(0, 100)}`)
    .join(' | ')
}
