import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { getAvailableSlotsForServiceAction } from '@/lib/actions/availability'
import {
  type GetAvailableSlotsInput,
  type GetServicesInput,
  type GetSpecialistsInput,
  type GetAppointmentsByPhoneInput,
  type CreateAppointmentInput,
  type CancelAppointmentInput,
  type RescheduleAppointmentInput,
} from './appointment-tools'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function handleGetAvailableSlots(input: GetAvailableSlotsInput): Promise<string> {
  try {
    const result = await getAvailableSlotsForServiceAction({
      businessId: input.businessId,
      serviceId: input.serviceId,
      date: input.date,
    })

    if (!result.success) {
      return `Error: ${result.error}`
    }

    if (!result.businessOpen) {
      return `El negocio está cerrado el ${format(new Date(input.date), "EEEE d 'de' MMMM", { locale: es })}.`
    }

    const availableSlots = result.slots.filter((slot) => slot.available)

    if (availableSlots.length === 0) {
      return `No hay horarios disponibles para el ${format(new Date(input.date), "EEEE d 'de' MMMM", { locale: es })}. Por favor, intenta con otra fecha.`
    }

    const slotsFormatted = availableSlots.map((slot) => {
      const [hours, minutes] = slot.time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    })

    return `Horarios disponibles para el ${format(new Date(input.date), "EEEE d 'de' MMMM", { locale: es })}:\n${slotsFormatted.join(', ')}`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al obtener disponibilidad: ${message}`
  }
}

export async function handleGetServices(input: GetServicesInput): Promise<string> {
  try {
    console.log('[AI Agent] handleGetServices called with businessId:', input.businessId)
    const supabase = await getSupabaseAdminClient()

    const { data: services, error } = await supabase
      .from('services')
      .select('id, name, description, price_cents, duration_minutes')
      .eq('business_id', input.businessId)
      .order('name')

    if (error) {
      console.error('[AI Agent] Error fetching services:', error)
      throw error
    }

    console.log('[AI Agent] Services found:', services?.length || 0)

    if (!services || services.length === 0) {
      return 'No hay servicios disponibles en este momento.'
    }

    const servicesFormatted = services.map((s) => {
      const price = (s.price_cents / 100).toFixed(2)
      return `- ${s.name} (ID: ${s.id}): $${price} (${s.duration_minutes} min)${s.description ? ` - ${s.description}` : ''}`
    })

    return `Servicios disponibles:\n${servicesFormatted.join('\n')}`
  } catch (error: unknown) {
    console.error('[AI Agent] handleGetServices error:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al obtener servicios: ${message}`
  }
}

export async function handleGetSpecialists(input: GetSpecialistsInput): Promise<string> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('specialists')
      .select('id, first_name, last_name, specialty, bio')
      .eq('business_id', input.businessId)
      .order('first_name')

    const { data: specialists, error } = await query

    if (error) throw error

    if (!specialists || specialists.length === 0) {
      return 'No hay especialistas disponibles en este momento.'
    }

    const specialistsFormatted = specialists.map((s) => {
      return `- ${s.first_name} ${s.last_name || ''}${s.specialty ? ` (${s.specialty})` : ''}`
    })

    return `Especialistas disponibles:\n${specialistsFormatted.join('\n')}`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al obtener especialistas: ${message}`
  }
}

export async function handleGetAppointmentsByPhone(input: GetAppointmentsByPhoneInput): Promise<string> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: customer, error: customerError } = await supabase
      .from('business_customers')
      .select('id, first_name, last_name, user_profile_id')
      .eq('business_id', input.businessId)
      .eq('phone', input.phone)
      .single()

    if (customerError || !customer) {
      return `No se encontró un cliente con el teléfono ${input.phone}. ¿Deseas crear una nueva cita?`
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id, start_time, end_time, status,
        specialists (first_name, last_name),
        appointment_services (
          services (name)
        )
      `)
      .eq('business_id', input.businessId)
      .eq('users_profile_id', customer.user_profile_id)
      .in('status', ['PENDING', 'CONFIRMED'])
      .gte('start_time', new Date().toISOString())
      .order('start_time')

    if (error) throw error

    if (!appointments || appointments.length === 0) {
      return `${customer.first_name} no tiene citas programadas. ¿Deseas agendar una nueva cita?`
    }

    const appointmentsFormatted = appointments.map((apt) => {
      const date = format(new Date(apt.start_time), "EEEE d 'de' MMMM 'a las' h:mm a", { locale: es })
      const specialist = apt.specialists as unknown as { first_name: string; last_name: string } | null
      const appointmentServices = apt.appointment_services as unknown as Array<{ services: { name: string } | null }> | null
      const servicesNames = appointmentServices
        ?.filter((as) => as.services)
        .map((as) => as.services!.name)
        .join(', ') || 'Sin servicios'
      const specialistName = specialist ? `${specialist.first_name} ${specialist.last_name || ''}`.trim() : 'Sin especialista'
      return `- ${date} con ${specialistName} - ${servicesNames} (${apt.status})`
    })

    return `Citas de ${customer.first_name} ${customer.last_name || ''}:\n${appointmentsFormatted.join('\n')}`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al buscar citas: ${message}`
  }
}

export async function handleCreateAppointment(input: CreateAppointmentInput): Promise<string> {
  try {
    const supabase = await getSupabaseAdminClient()

    let customerId: string | null = null
    let userProfileId: string | null = null

    const { data: existingCustomer } = await supabase
      .from('business_customers')
      .select('id, user_profile_id')
      .eq('business_id', input.businessId)
      .eq('phone', input.customerPhone)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
      userProfileId = existingCustomer.user_profile_id
    } else {
      const nameParts = input.customerName.split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || null

      const { data: newCustomer, error: createError } = await supabase
        .from('business_customers')
        .insert({
          business_id: input.businessId,
          first_name: firstName,
          last_name: lastName,
          phone: input.customerPhone,
          email: input.customerEmail || null,
          source: 'ai_agent',
          status: 'active',
        })
        .select('id, user_profile_id')
        .single()

      if (createError) throw createError
      customerId = newCustomer.id
      userProfileId = newCustomer.user_profile_id
    }

    const { data: services } = await supabase
      .from('services')
      .select('id, price_cents, duration_minutes, tax_rate')
      .in('id', input.serviceIds)

    if (!services || services.length === 0) {
      return 'Error: Los servicios seleccionados no son válidos.'
    }

    const totalDuration = services.reduce((acc, s) => acc + s.duration_minutes, 0)
    const subtotal = services.reduce((acc, s) => acc + s.price_cents, 0)
    const taxTotal = services.reduce((acc, s) => acc + Math.round(s.price_cents * (s.tax_rate || 0)), 0)

    const startTime = new Date(input.startTime)
    const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000)

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        business_id: input.businessId,
        specialist_id: input.specialistId,
        users_profile_id: userProfileId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'PENDING',
        subtotal_cents: subtotal,
        tax_cents: taxTotal,
        discount_cents: 0,
        total_price_cents: subtotal + taxTotal,
        amount_paid_cents: 0,
        payment_status: 'UNPAID',
        payment_method: 'AT_VENUE',
        customer_note: 'Cita agendada vía asistente virtual',
      })
      .select('id')
      .single()

    if (aptError) throw aptError

    const appointmentServices = services.map((s) => ({
      appointment_id: appointment.id,
      service_id: s.id,
      price_at_booking_cents: s.price_cents,
      duration_minutes: s.duration_minutes,
    }))

    await supabase.from('appointment_services').insert(appointmentServices)

    const { data: specialist } = await supabase
      .from('specialists')
      .select('first_name, last_name')
      .eq('id', input.specialistId)
      .single()

    const dateFormatted = format(startTime, "EEEE d 'de' MMMM 'a las' h:mm a", { locale: es })
    const servicesNames = services.map((s) => s.id).join(', ')

    return `¡Cita agendada exitosamente!

Detalles:
- Cliente: ${input.customerName}
- Fecha: ${dateFormatted}
- Especialista: ${specialist?.first_name} ${specialist?.last_name || ''}
- Total: $${((subtotal + taxTotal) / 100).toFixed(2)}

Se ha enviado una confirmación. ¿Hay algo más en lo que pueda ayudarte?`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al crear la cita: ${message}`
  }
}

export async function handleCancelAppointment(input: CancelAppointmentInput): Promise<string> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id, start_time, status,
        specialists (first_name, last_name)
      `)
      .eq('id', input.appointmentId)
      .single()

    if (fetchError || !appointment) {
      return 'No se encontró la cita especificada.'
    }

    if (appointment.status === 'CANCELLED') {
      return 'Esta cita ya fue cancelada anteriormente.'
    }

    if (appointment.status === 'COMPLETED') {
      return 'No se puede cancelar una cita que ya fue completada.'
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'CANCELLED',
        customer_note: input.reason ? `Cancelada: ${input.reason}` : 'Cancelada vía asistente virtual',
      })
      .eq('id', input.appointmentId)

    if (updateError) throw updateError

    const specialist = appointment.specialists as unknown as { first_name: string; last_name: string } | null
    const dateFormatted = format(new Date(appointment.start_time), "EEEE d 'de' MMMM 'a las' h:mm a", { locale: es })
    const specialistName = specialist ? `${specialist.first_name} ${specialist.last_name || ''}`.trim() : 'el especialista'

    return `Cita cancelada exitosamente.

La cita del ${dateFormatted} con ${specialistName} ha sido cancelada.

¿Deseas agendar una nueva cita?`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al cancelar la cita: ${message}`
  }
}

export async function handleRescheduleAppointment(input: RescheduleAppointmentInput): Promise<string> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id, start_time, end_time, status, specialist_id,
        specialists (first_name, last_name),
        appointment_services (
          services (duration_minutes)
        )
      `)
      .eq('id', input.appointmentId)
      .single()

    if (fetchError || !appointment) {
      return 'No se encontró la cita especificada.'
    }

    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return `No se puede reprogramar una cita ${appointment.status === 'CANCELLED' ? 'cancelada' : 'completada'}.`
    }

    const appointmentServices = appointment.appointment_services as unknown as Array<{ services: { duration_minutes: number } | null }> | null
    const totalDuration = appointmentServices
      ?.filter((as) => as.services)
      .reduce((acc, as) => acc + as.services!.duration_minutes, 0) || 30

    const newStartTime = new Date(input.newStartTime)
    const newEndTime = new Date(newStartTime.getTime() + totalDuration * 60 * 1000)

    const specialistId = input.newSpecialistId || appointment.specialist_id

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
        specialist_id: specialistId,
      })
      .eq('id', input.appointmentId)

    if (updateError) throw updateError

    let specialistName = ''
    if (input.newSpecialistId && input.newSpecialistId !== appointment.specialist_id) {
      const { data: newSpecialist } = await supabase
        .from('specialists')
        .select('first_name, last_name')
        .eq('id', input.newSpecialistId)
        .single()
      specialistName = `${newSpecialist?.first_name} ${newSpecialist?.last_name || ''}`.trim()
    } else {
      const specialist = appointment.specialists as unknown as { first_name: string; last_name: string } | null
      specialistName = specialist ? `${specialist.first_name} ${specialist.last_name || ''}`.trim() : 'el especialista'
    }

    const oldDate = format(new Date(appointment.start_time), "EEEE d 'de' MMMM 'a las' h:mm a", { locale: es })
    const newDate = format(newStartTime, "EEEE d 'de' MMMM 'a las' h:mm a", { locale: es })

    return `¡Cita reprogramada exitosamente!

Cambio realizado:
- Fecha anterior: ${oldDate}
- Nueva fecha: ${newDate}
- Especialista: ${specialistName}

¿Hay algo más en lo que pueda ayudarte?`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al reprogramar la cita: ${message}`
  }
}
