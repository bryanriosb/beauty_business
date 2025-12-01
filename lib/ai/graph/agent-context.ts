import type { CustomerData, CustomerAppointment } from './state'

export interface AgentContext {
  businessId: string
  sessionId: string
  customer: CustomerData | null
  selectedAppointmentId: string | null
}

const contextStore = new Map<string, AgentContext>()

export function getAgentContext(sessionId: string, businessId: string): AgentContext {
  let context = contextStore.get(sessionId)
  if (!context) {
    context = {
      businessId,
      sessionId,
      customer: null,
      selectedAppointmentId: null,
    }
    contextStore.set(sessionId, context)
  }
  return context
}

export function setCustomerData(sessionId: string, customer: CustomerData): void {
  const context = contextStore.get(sessionId)
  if (context) {
    context.customer = customer
    console.log('[AgentContext] Customer data set:', {
      sessionId,
      customerId: customer.id,
      phone: customer.phone,
      appointmentsCount: customer.appointments.length,
    })
  }
}

export function getCustomerData(sessionId: string): CustomerData | null {
  const context = contextStore.get(sessionId)
  return context?.customer || null
}

export function setSelectedAppointment(sessionId: string, appointmentId: string): void {
  const context = contextStore.get(sessionId)
  if (context) {
    context.selectedAppointmentId = appointmentId
    console.log('[AgentContext] Selected appointment set:', { sessionId, appointmentId })
  }
}

export function getSelectedAppointment(sessionId: string): CustomerAppointment | null {
  const context = contextStore.get(sessionId)
  if (!context?.customer || !context.selectedAppointmentId) {
    return null
  }
  return context.customer.appointments.find(
    (apt) => apt.appointmentId === context.selectedAppointmentId
  ) || null
}

export function getFirstAppointment(sessionId: string): CustomerAppointment | null {
  const context = contextStore.get(sessionId)
  if (!context?.customer || context.customer.appointments.length === 0) {
    return null
  }
  return context.customer.appointments[0]
}

export function clearContext(sessionId: string): void {
  contextStore.delete(sessionId)
  console.log('[AgentContext] Context cleared for session:', sessionId)
}

export function getAppointmentById(sessionId: string, appointmentId: string): CustomerAppointment | null {
  const context = contextStore.get(sessionId)
  if (!context?.customer) {
    return null
  }
  return context.customer.appointments.find((apt) => apt.appointmentId === appointmentId) || null
}
