'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type { DayOfWeek } from '@/lib/types/enums'
import type { Specialist } from '@/lib/models/specialist/specialist'

export interface TimeSlot {
  time: string
  available: boolean
  availableSpecialistIds: string[]
}

export interface AvailabilityParams {
  businessId: string
  serviceId: string
  date: string
}

export interface AvailabilityResult {
  success: boolean
  date: string
  dayOfWeek: DayOfWeek
  businessOpen: boolean
  serviceDurationMinutes: number
  slots: TimeSlot[]
  error?: string
}

export interface AvailableSpecialist extends Specialist {
  isAvailable: boolean
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function isTimeOverlapping(
  slotStart: number,
  slotEnd: number,
  blockStart: number,
  blockEnd: number
): boolean {
  return slotStart < blockEnd && slotEnd > blockStart
}

export async function getAvailableSlotsForServiceAction(
  params: AvailabilityParams
): Promise<AvailabilityResult> {
  try {
    const { businessId, serviceId, date } = params
    const supabase = await getSupabaseAdminClient()

    // 1. Obtener el servicio y su duración
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes, category_id, name')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return {
        success: false,
        date,
        dayOfWeek: '0',
        businessOpen: false,
        serviceDurationMinutes: 0,
        slots: [],
        error: 'Servicio no encontrado',
      }
    }

    const serviceDurationMinutes = service.duration_minutes
    const categoryId = service.category_id

    const selectedDate = new Date(date + 'T00:00:00')
    const dayOfWeek = selectedDate.getDay().toString() as DayOfWeek

    // 2. Obtener horarios del negocio para ese día
    const { data: businessHours } = await supabase
      .from('business_operating_hours')
      .select('*')
      .eq('business_id', businessId)
      .eq('day', dayOfWeek)
      .order('shift_number')

    if (!businessHours || businessHours.length === 0) {
      return {
        success: true,
        date,
        dayOfWeek,
        businessOpen: false,
        serviceDurationMinutes,
        slots: [],
      }
    }

    const openShifts = businessHours.filter((h) => !h.is_closed && h.open_time && h.close_time)
    if (openShifts.length === 0) {
      return {
        success: true,
        date,
        dayOfWeek,
        businessOpen: false,
        serviceDurationMinutes,
        slots: [],
      }
    }

    // 3. Obtener especialistas que ofrecen esta categoría de servicio (del negocio actual)
    let specialistIds: string[] = []

    if (categoryId) {
      // Join con specialists para filtrar por business_id
      const { data: specialistCategories } = await supabase
        .from('specialist_service_categories')
        .select('specialist_id, specialists!inner(business_id)')
        .eq('service_category_id', categoryId)
        .eq('specialists.business_id', businessId)

      if (specialistCategories && specialistCategories.length > 0) {
        specialistIds = specialistCategories.map((sc) => sc.specialist_id)
      }
    }

    // Si no hay categoría o no hay especialistas asignados, obtener todos los del negocio
    if (specialistIds.length === 0) {
      const { data: allSpecialists } = await supabase
        .from('specialists')
        .select('id')
        .eq('business_id', businessId)

      if (allSpecialists) {
        specialistIds = allSpecialists.map((s) => s.id)
      }
    }

    if (specialistIds.length === 0) {
      return {
        success: true,
        date,
        dayOfWeek,
        businessOpen: true,
        serviceDurationMinutes,
        slots: [],
        error: 'No hay especialistas disponibles para este servicio',
      }
    }

    // 4. Obtener disponibilidad de cada especialista para ese día
    const { data: specialistAvailabilities } = await supabase
      .from('specialist_availability')
      .select('*')
      .in('specialist_id', specialistIds)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)

    // 5. Obtener tiempo libre de especialistas para esa fecha
    const dateStart = new Date(date + 'T00:00:00').toISOString()
    const dateEnd = new Date(date + 'T23:59:59').toISOString()

    const { data: timeOffs } = await supabase
      .from('specialist_time_off')
      .select('*')
      .in('specialist_id', specialistIds)
      .lte('start_time', dateEnd)
      .gte('end_time', dateStart)

    // 6. Obtener citas existentes para esa fecha
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('specialist_id, start_time, end_time, status')
      .in('specialist_id', specialistIds)
      .gte('start_time', dateStart)
      .lte('start_time', dateEnd)
      .in('status', ['PENDING', 'CONFIRMED'])

    // 7. Generar todos los slots posibles del negocio
    const allPossibleSlots: Set<string> = new Set()
    const slotInterval = 30 // Intervalo de 30 minutos para los slots

    for (const shift of openShifts) {
      const shiftStart = timeToMinutes(shift.open_time!)
      const shiftEnd = timeToMinutes(shift.close_time!)

      for (let time = shiftStart; time + serviceDurationMinutes <= shiftEnd; time += slotInterval) {
        allPossibleSlots.add(minutesToTime(time))
      }
    }

    // 8. Para cada slot, determinar qué especialistas están disponibles
    const now = new Date()
    const slots: TimeSlot[] = []

    for (const slotTime of Array.from(allPossibleSlots).sort()) {
      const slotStartMinutes = timeToMinutes(slotTime)
      const slotEndMinutes = slotStartMinutes + serviceDurationMinutes
      const slotDateTime = new Date(`${date}T${slotTime}:00`)

      // Verificar si el slot está en el pasado
      if (slotDateTime <= now) {
        slots.push({ time: slotTime, available: false, availableSpecialistIds: [] })
        continue
      }

      const availableSpecialistIdsForSlot: string[] = []

      for (const specialistId of specialistIds) {
        let isAvailable = false

        // Verificar si el especialista trabaja ese día y en ese horario
        const specialistAvail = specialistAvailabilities?.filter(
          (sa) => sa.specialist_id === specialistId
        )

        if (specialistAvail && specialistAvail.length > 0) {
          for (const avail of specialistAvail) {
            const availStart = timeToMinutes(avail.start_time)
            const availEnd = timeToMinutes(avail.end_time)

            if (slotStartMinutes >= availStart && slotEndMinutes <= availEnd) {
              isAvailable = true
              break
            }
          }
        }

        if (!isAvailable) continue

        // Verificar tiempo libre
        const specialistTimeOff = timeOffs?.filter((to) => to.specialist_id === specialistId)
        if (specialistTimeOff && specialistTimeOff.length > 0) {
          for (const to of specialistTimeOff) {
            const toStartTime = new Date(to.start_time)
            const toEndTime = new Date(to.end_time)
            const slotStart = new Date(`${date}T${slotTime}:00`)
            const slotEnd = new Date(`${date}T${minutesToTime(slotEndMinutes)}:00`)

            if (slotStart < toEndTime && slotEnd > toStartTime) {
              isAvailable = false
              break
            }
          }
        }

        if (!isAvailable) continue

        // Verificar citas existentes
        const specialistAppointments = existingAppointments?.filter(
          (apt) => apt.specialist_id === specialistId
        )
        if (specialistAppointments && specialistAppointments.length > 0) {
          for (const apt of specialistAppointments) {
            const aptStartMinutes = timeToMinutes(
              new Date(apt.start_time).toTimeString().slice(0, 5)
            )
            const aptEndMinutes = timeToMinutes(
              new Date(apt.end_time).toTimeString().slice(0, 5)
            )

            if (isTimeOverlapping(slotStartMinutes, slotEndMinutes, aptStartMinutes, aptEndMinutes)) {
              isAvailable = false
              break
            }
          }
        }

        if (isAvailable) {
          availableSpecialistIdsForSlot.push(specialistId)
        }
      }

      slots.push({
        time: slotTime,
        available: availableSpecialistIdsForSlot.length > 0,
        availableSpecialistIds: availableSpecialistIdsForSlot,
      })
    }

    // Ordenar slots por hora
    slots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))

    return {
      success: true,
      date,
      dayOfWeek,
      businessOpen: true,
      serviceDurationMinutes,
      slots,
    }
  } catch (error: any) {
    console.error('Error getting available slots:', error)
    return {
      success: false,
      date: params.date,
      dayOfWeek: '0',
      businessOpen: false,
      serviceDurationMinutes: 0,
      slots: [],
      error: error.message || 'Error al obtener disponibilidad',
    }
  }
}

export async function getAvailableSpecialistsForSlotAction(
  businessId: string,
  serviceId: string,
  date: string,
  time: string
): Promise<{ success: boolean; specialists: AvailableSpecialist[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Obtener disponibilidad para esa fecha/servicio
    const availability = await getAvailableSlotsForServiceAction({
      businessId,
      serviceId,
      date,
    })

    if (!availability.success) {
      return { success: false, specialists: [], error: availability.error }
    }

    // Encontrar el slot correspondiente
    const slot = availability.slots.find((s) => s.time === time)
    if (!slot) {
      return { success: false, specialists: [], error: 'Horario no encontrado' }
    }

    // Obtener datos de los especialistas disponibles
    if (slot.availableSpecialistIds.length === 0) {
      return { success: true, specialists: [] }
    }

    const { data: specialists, error } = await supabase
      .from('specialists')
      .select('*')
      .in('id', slot.availableSpecialistIds)
      .order('first_name')

    if (error) throw error

    return {
      success: true,
      specialists: (specialists || []).map((s) => ({ ...s, isAvailable: true })),
    }
  } catch (error: any) {
    console.error('Error getting available specialists:', error)
    return { success: false, specialists: [], error: error.message }
  }
}

export async function validateAppointmentAction(params: {
  businessId: string
  serviceId: string
  specialistId: string
  date: string
  startTime: string
}): Promise<{ valid: boolean; endTime?: string; error?: string }> {
  try {
    const { businessId, serviceId, specialistId, date, startTime } = params

    const availability = await getAvailableSlotsForServiceAction({
      businessId,
      serviceId,
      date,
    })

    if (!availability.success) {
      return { valid: false, error: availability.error }
    }

    if (!availability.businessOpen) {
      return { valid: false, error: 'El negocio está cerrado en esta fecha' }
    }

    const slot = availability.slots.find((s) => s.time === startTime)
    if (!slot) {
      return { valid: false, error: 'Horario no válido' }
    }

    if (!slot.available) {
      return { valid: false, error: 'No hay especialistas disponibles en este horario' }
    }

    if (!slot.availableSpecialistIds.includes(specialistId)) {
      return { valid: false, error: 'El especialista seleccionado no está disponible en este horario' }
    }

    // Calcular hora de fin
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = startMinutes + availability.serviceDurationMinutes
    const endTime = minutesToTime(endMinutes)

    return { valid: true, endTime }
  } catch (error: any) {
    console.error('Error validating appointment:', error)
    return { valid: false, error: error.message }
  }
}
