import { tool } from 'ai';
import { z } from 'zod';

// Esquemas para las herramientas (mismos que antes pero adaptados)
const getAvailableSlotsSchema = z.object({
  date: z
    .string()
    .describe('Fecha en formato YYYY-MM-DD. Puedes usar expresiones como "hoy", "mañana", "pasado mañana" y convertirlas a YYYY-MM-DD'),
  serviceId: z
    .string()
    .optional()
    .describe(
      'ID del servicio (requerido para consultar disponibilidad)'
    ),
  specialistId: z
    .string()
    .optional()
    .describe('ID del especialista (requerido para consulta precisa)'),
});

const createAppointmentSchema = z.object({
  customerName: z
    .string()
    .optional()
    .describe('Nombre del cliente (opcional si ya fue identificado)'),
  customerPhone: z
    .string()
    .optional()
    .describe('Teléfono del cliente (opcional si ya fue identificado)'),
  customerEmail: z.string().optional().describe('Email del cliente (opcional)'),
  serviceIds: z.array(z.string()).describe('IDs de los servicios a agendar'),
  specialistId: z.string().describe('ID del especialista'),
  startTime: z.string().describe('Fecha y hora de inicio en formato ISO'),
});

const getAppointmentsByPhoneSchema = z.object({
  phone: z.string().describe('Teléfono del cliente'),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().optional().describe('Motivo de la cancelación (opcional)'),
});

const rescheduleAppointmentSchema = z.object({
  newStartTime: z
    .string()
    .describe(
      'Nueva fecha y hora en formato ISO (ejemplo: 2025-12-05T16:00:00)'
    ),
  newSpecialistId: z
    .string()
    .optional()
    .describe('Nuevo especialista (opcional)'),
});

const getServicesSchema = z.object({});

const getSpecialistsSchema = z.object({
  serviceId: z.string().optional().describe('Filtrar por servicio específico'),
});

// Contexto para las herramientas
interface BusinessContext {
  businessId: string;
  sessionId: string;
}

// Importar los handlers existentes
import {
  handleGetAvailableSlots,
  handleGetServices,
  handleGetSpecialists,
  handleGetAppointmentsByPhone,
  handleCreateAppointment,
  handleCancelAppointment,
  handleRescheduleAppointment,
} from './handlers';

// Crear herramientas en formato AI SDK 6
export function createAppointmentTools(context: BusinessContext) {
  const getAvailableSlots = tool({
    description: 'Obtiene los horarios disponibles para una fecha. Para reprogramar, usa automáticamente el servicio de la cita del cliente.',
    inputSchema: getAvailableSlotsSchema,
    execute: async ({ date, serviceId, specialistId }) => {
      try {
        console.log('[AI SDK Tool] getAvailableSlots ejecutando con:', { date, serviceId, specialistId, ...context });
        const result = await handleGetAvailableSlots({
          date,
          serviceId,
          specialistId,
          ...context,
        });
        console.log('[AI SDK Tool] getAvailableSlots resultado:', { resultLength: result.length, success: !result.includes('[ERROR]') });
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getAvailableSlots error:', error);
        return `[ERROR] Error al obtener horarios: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getServices = tool({
    description: 'Obtiene la lista de servicios disponibles del negocio con precios y duraciones',
    inputSchema: getServicesSchema,
    execute: async () => {
      try {
        console.log('[AI SDK Tool] getServices ejecutando para businessId:', context.businessId);
        const result = await handleGetServices(context);
        console.log('[AI SDK Tool] getServices resultado length:', result.length, 'primeros 100 chars:', result.substring(0, 100));
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getServices error:', error);
        return `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getSpecialists = tool({
    description: 'Obtiene la lista de especialistas disponibles, opcionalmente filtrados por servicio',
    inputSchema: getSpecialistsSchema,
    execute: async ({ serviceId }) => {
      try {
        console.log('[AI SDK Tool] getSpecialists ejecutando con:', { serviceId, ...context });
        const result = await handleGetSpecialists({
          serviceId,
          ...context,
        });
        console.log('[AI SDK Tool] getSpecialists resultado:', { resultLength: result.length, success: !result.includes('[ERROR]') });
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getSpecialists error:', error);
        return `[ERROR] Error al obtener especialistas: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getSpecialistsForService = tool({
    description: 'Obtiene especialistas disponibles para un servicio específico, filtrados por categoría del servicio',
    inputSchema: z.object({
      serviceId: z.string().describe('ID del servicio para obtener especialistas de su categoría'),
    }),
    execute: async ({ serviceId }) => {
      try {
        console.log('[AI SDK Tool] getSpecialistsForService ejecutando con:', { serviceId, ...context });
        const result = await handleGetSpecialists({
          serviceId,
          ...context,
        });
        console.log('[AI SDK Tool] getSpecialistsForService resultado:', { resultLength: result.length, success: !result.includes('[ERROR]') });
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getSpecialistsForService error:', error);
        return `[ERROR] Error al obtener especialistas del servicio: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getAppointmentsByPhone = tool({
    description: 'Busca las citas de un cliente por su número de teléfono. Guarda los datos para usarlos después.',
    inputSchema: getAppointmentsByPhoneSchema,
    execute: async ({ phone }) => {
      return await handleGetAppointmentsByPhone({
        phone,
        ...context,
      });
    },
  });

  const createAppointment = tool({
    description: 'Crea una Crear Cita. Si el cliente ya fue identificado (get_appointments_by_phone), usa automáticamente sus datos. Solo pide nombre y teléfono si es cliente nuevo.',
    inputSchema: createAppointmentSchema,
    execute: async ({ customerName, customerPhone, customerEmail, serviceIds, specialistId, startTime }) => {
      return await handleCreateAppointment({
        customerName,
        customerPhone,
        customerEmail,
        serviceIds,
        specialistId,
        startTime,
        ...context,
      });
    },
  });

  const cancelAppointment = tool({
    description: 'Cancela la cita del cliente. Usa automáticamente la cita identificada previamente.',
    inputSchema: cancelAppointmentSchema,
    execute: async ({ reason }) => {
      return await handleCancelAppointment({
        reason,
        ...context,
      });
    },
  });

  const rescheduleAppointment = tool({
    description: 'Reprograma la cita del cliente. Usa automáticamente la cita identificada previamente.',
    inputSchema: rescheduleAppointmentSchema,
    execute: async ({ newStartTime, newSpecialistId }) => {
      return await handleRescheduleAppointment({
        newStartTime,
        newSpecialistId,
        ...context,
      });
    },
  });

  return {
    getAvailableSlots,
    getServices,
    getSpecialists,
    getSpecialistsForService,
    getAppointmentsByPhone,
    createAppointment,
    cancelAppointment,
    rescheduleAppointment,
  };
}

export type AppointmentTools = ReturnType<typeof createAppointmentTools>;