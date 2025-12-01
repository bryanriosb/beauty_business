import { tool } from '@langchain/core/tools'
import { z } from 'zod'

const getAvailableSlotsToolSchema = z.object({
  serviceId: z.string().describe('ID del servicio solicitado'),
  date: z.string().describe('Fecha en formato YYYY-MM-DD'),
  specialistId: z.string().optional().describe('ID del especialista preferido (opcional)'),
})

const createAppointmentToolSchema = z.object({
  customerName: z.string().describe('Nombre completo del cliente'),
  customerPhone: z.string().describe('Teléfono del cliente'),
  customerEmail: z.string().optional().describe('Email del cliente (opcional)'),
  serviceIds: z.array(z.string()).describe('IDs de los servicios a agendar'),
  specialistId: z.string().describe('ID del especialista'),
  startTime: z.string().describe('Fecha y hora de inicio en formato ISO'),
})

const getAppointmentsByPhoneToolSchema = z.object({
  phone: z.string().describe('Teléfono del cliente'),
})

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().describe('ID de la cita a cancelar'),
  reason: z.string().optional().describe('Motivo de la cancelación'),
})

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().describe('ID de la cita a reprogramar'),
  newStartTime: z.string().describe('Nueva fecha y hora en formato ISO'),
  newSpecialistId: z.string().optional().describe('Nuevo especialista (opcional)'),
})

const getServicesToolSchema = z.object({}).describe('No requiere parámetros')

const getSpecialistsToolSchema = z.object({
  serviceId: z.string().optional().describe('Filtrar por servicio específico'),
})

export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsToolSchema> & { businessId: string }
export type CreateAppointmentInput = z.infer<typeof createAppointmentToolSchema> & { businessId: string }
export type GetAppointmentsByPhoneInput = z.infer<typeof getAppointmentsByPhoneToolSchema> & { businessId: string }
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>
export type GetServicesInput = { businessId: string }
export type GetSpecialistsInput = z.infer<typeof getSpecialistsToolSchema> & { businessId: string }

export function createGetAvailableSlotsTool(
  businessId: string,
  handler: (input: GetAvailableSlotsInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof getAvailableSlotsToolSchema>) =>
      handler({ ...input, businessId }),
    {
      name: 'get_available_slots',
      description: 'Obtiene los horarios disponibles para un servicio en una fecha específica',
      schema: getAvailableSlotsToolSchema,
    }
  )
}

export function createGetServicesTool(
  businessId: string,
  handler: (input: GetServicesInput) => Promise<string>
) {
  return tool(
    async () => {
      console.log('[AI Agent] get_services tool invoked for businessId:', businessId)
      try {
        const result = await handler({ businessId })
        console.log('[AI Agent] get_services result length:', result.length)
        return result
      } catch (err) {
        console.error('[AI Agent] get_services handler error:', err)
        throw err
      }
    },
    {
      name: 'get_services',
      description: 'Obtiene la lista de servicios disponibles del negocio con precios y duraciones',
      schema: getServicesToolSchema,
    }
  )
}

export function createGetSpecialistsTool(
  businessId: string,
  handler: (input: GetSpecialistsInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof getSpecialistsToolSchema>) =>
      handler({ ...input, businessId }),
    {
      name: 'get_specialists',
      description: 'Obtiene la lista de especialistas disponibles, opcionalmente filtrados por servicio',
      schema: getSpecialistsToolSchema,
    }
  )
}

export function createGetAppointmentsByPhoneTool(
  businessId: string,
  handler: (input: GetAppointmentsByPhoneInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof getAppointmentsByPhoneToolSchema>) =>
      handler({ ...input, businessId }),
    {
      name: 'get_appointments_by_phone',
      description: 'Busca las citas de un cliente por su número de teléfono',
      schema: getAppointmentsByPhoneToolSchema,
    }
  )
}

export function createCreateAppointmentTool(
  businessId: string,
  handler: (input: CreateAppointmentInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof createAppointmentToolSchema>) =>
      handler({ ...input, businessId }),
    {
      name: 'create_appointment',
      description: 'Crea una nueva cita para el cliente. Solo usar después de confirmar todos los detalles con el cliente',
      schema: createAppointmentToolSchema,
    }
  )
}

export function createCancelAppointmentTool(handler: (input: CancelAppointmentInput) => Promise<string>) {
  return tool(handler, {
    name: 'cancel_appointment',
    description: 'Cancela una cita existente. Solo usar después de confirmar con el cliente',
    schema: cancelAppointmentSchema,
  })
}

export function createRescheduleAppointmentTool(handler: (input: RescheduleAppointmentInput) => Promise<string>) {
  return tool(handler, {
    name: 'reschedule_appointment',
    description: 'Reprograma una cita existente a una nueva fecha/hora. Solo usar después de confirmar disponibilidad',
    schema: rescheduleAppointmentSchema,
  })
}
