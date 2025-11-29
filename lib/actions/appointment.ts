'use server'

import {
  getRecordById,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
} from '@/lib/models/appointment/appointment'

export interface AppointmentServiceInput {
  service_id: string
  price_at_booking_cents: number
  duration_minutes: number
}

export interface AppointmentSupplyInput {
  product_id: string
  quantity_used: number
  unit_price_cents: number
}

export interface AppointmentListResponse {
  data: Appointment[]
  total: number
  total_pages: number
}

export async function fetchAppointmentsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  business_ids?: string[]
  specialist_id?: string
  users_profile_id?: string
  status?: string[]
  start_date?: string
  end_date?: string
}): Promise<AppointmentListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    let query = supabase
      .from('appointments')
      .select(`
        *,
        specialist:specialists(
          id,
          first_name,
          last_name,
          specialty,
          profile_picture_url
        ),
        business:businesses(
          id,
          name,
          logo_url
        ),
        user_profile:users_profile!appointments_users_profile_id_fkey(
          id,
          user_id,
          profile_picture_url
        ),
        appointment_services(
          id,
          service_id,
          price_at_booking_cents,
          duration_minutes,
          service:services(
            id,
            name,
            description,
            category_id,
            service_category:service_categories(
              id,
              name,
              icon_key
            )
          )
        )
      `)
      .order('start_time', { ascending: true })

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
    }

    if (params?.business_ids && params.business_ids.length > 0) {
      query = query.in('business_id', params.business_ids)
    }

    if (params?.specialist_id) {
      query = query.eq('specialist_id', params.specialist_id)
    }

    if (params?.users_profile_id) {
      query = query.eq('users_profile_id', params.users_profile_id)
    }

    if (params?.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    if (params?.start_date) {
      query = query.gte('start_time', params.start_date)
    }

    if (params?.end_date) {
      query = query.lte('start_time', params.end_date)
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error('Error fetching appointments:', error)
      return {
        data: [],
        total: 0,
        total_pages: 0,
      }
    }

    const filteredAppointments = appointments || []

    const appointmentsWithUserData = await Promise.all(
      filteredAppointments.map(async (appointment: any) => {
        if (appointment.user_profile?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            appointment.user_profile.user_id
          )
          return {
            ...appointment,
            user_profile: {
              ...appointment.user_profile,
              user: authUser?.user ? {
                email: authUser.user.email,
                name: authUser.user.user_metadata?.name,
                phone: authUser.user.phone,
              } : null,
            },
          }
        }
        return appointment
      })
    )

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = appointmentsWithUserData.slice(start, end)
    const totalPages = Math.ceil(appointmentsWithUserData.length / pageSize)

    return {
      data: paginatedData,
      total: appointmentsWithUserData.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function getAppointmentByIdAction(
  id: string,
  withDetails = false
): Promise<Appointment | null> {
  try {
    if (!withDetails) {
      return await getRecordById<Appointment>('appointments', id)
    }

    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        specialist:specialists(
          id,
          first_name,
          last_name,
          specialty,
          profile_picture_url
        ),
        business:businesses(
          id,
          name,
          logo_url
        ),
        user_profile:users_profile!appointments_users_profile_id_fkey(
          id,
          user_id,
          profile_picture_url
        ),
        appointment_services(
          id,
          service_id,
          price_at_booking_cents,
          duration_minutes,
          service:services(
            id,
            name,
            description,
            category_id,
            service_category:service_categories(
              id,
              name,
              icon_key
            )
          )
        ),
        appointment_supplies(
          id,
          product_id,
          quantity_used,
          unit_price_cents,
          total_price_cents,
          product:products(
            id,
            name,
            unit_of_measure:unit_of_measures(abbreviation)
          )
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching appointment with details:', error)
      return null
    }

    if (data?.user_profile?.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(
        data.user_profile.user_id
      )
      return {
        ...data,
        user_profile: {
          ...data.user_profile,
          user: authUser?.user ? {
            email: authUser.user.email,
            name: authUser.user.user_metadata?.name,
            phone: authUser.user.phone,
          } : null,
        },
      } as any
    }

    return data as any
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return null
  }
}

export async function createAppointmentAction(
  data: AppointmentInsert,
  services?: AppointmentServiceInput[],
  supplies?: AppointmentSupplyInput[]
): Promise<{ success: boolean; data?: Appointment; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(data)
      .select()
      .single()

    if (appointmentError || !appointment) {
      return { success: false, error: appointmentError?.message || 'Error al crear la cita' }
    }

    if (services && services.length > 0) {
      const appointmentServices = services.map((service) => ({
        appointment_id: appointment.id,
        service_id: service.service_id,
        price_at_booking_cents: service.price_at_booking_cents,
        duration_minutes: service.duration_minutes,
      }))

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServices)

      if (servicesError) {
        console.error('Error creating appointment services:', servicesError)
      }
    }

    // Save appointment supplies
    if (supplies && supplies.length > 0) {
      const appointmentSupplies = supplies.map((supply) => ({
        appointment_id: appointment.id,
        product_id: supply.product_id,
        quantity_used: supply.quantity_used,
        unit_price_cents: supply.unit_price_cents,
        total_price_cents: Math.round(supply.quantity_used * supply.unit_price_cents),
      }))

      const { error: suppliesError } = await supabase
        .from('appointment_supplies')
        .insert(appointmentSupplies)

      if (suppliesError) {
        console.error('Error creating appointment supplies:', suppliesError)
      }
    }

    return { success: true, data: appointment as Appointment }
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateAppointmentAction(
  id: string,
  data: AppointmentUpdate,
  options?: {
    generateInvoice?: boolean
    businessData?: { name: string; address?: string; phone?: string; nit?: string }
    services?: AppointmentServiceInput[]
    supplies?: AppointmentSupplyInput[]
  }
): Promise<{ success: boolean; data?: Appointment; error?: string; invoiceGenerated?: boolean; stockDeducted?: boolean }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: currentAppointment } = await supabase
      .from('appointments')
      .select('payment_status, business_id, status')
      .eq('id', id)
      .single()

    const appointment = await updateRecord<Appointment>('appointments', id, data)

    if (!appointment) {
      return { success: false, error: 'Error al actualizar la cita' }
    }

    // Update services if provided
    if (options?.services) {
      await supabase.from('appointment_services').delete().eq('appointment_id', id)

      if (options.services.length > 0) {
        const appointmentServices = options.services.map((service) => ({
          appointment_id: id,
          service_id: service.service_id,
          price_at_booking_cents: service.price_at_booking_cents,
          duration_minutes: service.duration_minutes,
        }))

        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(appointmentServices)

        if (servicesError) {
          console.error('Error updating appointment services:', servicesError)
        }
      }
    }

    // Update supplies if provided
    if (options?.supplies) {
      await supabase.from('appointment_supplies').delete().eq('appointment_id', id)

      if (options.supplies.length > 0) {
        const appointmentSupplies = options.supplies.map((supply) => ({
          appointment_id: id,
          product_id: supply.product_id,
          quantity_used: supply.quantity_used,
          unit_price_cents: supply.unit_price_cents,
          total_price_cents: Math.round(supply.quantity_used * supply.unit_price_cents),
        }))

        const { error: suppliesError } = await supabase
          .from('appointment_supplies')
          .insert(appointmentSupplies)

        if (suppliesError) {
          console.error('Error updating appointment supplies:', suppliesError)
        }
      }
    }

    let invoiceGenerated = false
    let stockDeducted = false

    // Deduct stock when appointment is completed
    const shouldDeductStock =
      data.status === 'COMPLETED' &&
      currentAppointment?.status !== 'COMPLETED'

    if (shouldDeductStock && currentAppointment?.business_id) {
      // Get appointment supplies
      const { data: supplies } = await supabase
        .from('appointment_supplies')
        .select('product_id, quantity_used, unit_price_cents')
        .eq('appointment_id', id)

      if (supplies && supplies.length > 0) {
        const { createBulkConsumptionAction } = await import('./inventory')
        const consumptionResult = await createBulkConsumptionAction(
          id,
          currentAppointment.business_id,
          supplies.map((s) => ({
            product_id: s.product_id,
            quantity: s.quantity_used,
            unit_price_cents: s.unit_price_cents,
          }))
        )
        stockDeducted = consumptionResult.success
      }
    }

    const shouldGenerateInvoice =
      data.payment_status === 'PAID' &&
      currentAppointment?.payment_status !== 'PAID' &&
      options?.generateInvoice !== false

    if (shouldGenerateInvoice && options?.businessData) {
      const { createInvoiceFromAppointmentAction } = await import('./invoice')
      const invoiceResult = await createInvoiceFromAppointmentAction(id, {
        business_name: options.businessData.name,
        business_address: options.businessData.address,
        business_phone: options.businessData.phone,
        business_nit: options.businessData.nit,
      })
      invoiceGenerated = invoiceResult.success
    }

    return { success: true, data: appointment, invoiceGenerated, stockDeducted }
  } catch (error: any) {
    console.error('Error updating appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteAppointmentAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('appointments', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
