'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
} from '@/lib/models/appointment/appointment'
import type { UserRole } from '@/const/roles'

export interface AppointmentListResponse {
  data: Appointment[]
  total: number
  total_pages: number
}

export async function fetchAppointmentsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  specialist_id?: string
  users_profile_id?: string
  status?: string[]
  start_date?: string
  end_date?: string
  user_role?: UserRole
  business_account_id?: string
}): Promise<AppointmentListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    let query = supabase
      .from('appointments')
      .select('*')
      .order('start_time', { ascending: true })

    if (params?.user_role === 'business_admin' && params?.business_account_id) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('business_account_id', params.business_account_id)

      if (businesses && businesses.length > 0) {
        const businessIds = businesses.map((b) => b.id)
        query = query.in('business_id', businessIds)
      } else {
        return {
          data: [],
          total: 0,
          total_pages: 0,
        }
      }
    }

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
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

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = filteredAppointments.slice(start, end)
    const totalPages = Math.ceil(filteredAppointments.length / pageSize)

    return {
      data: paginatedData,
      total: filteredAppointments.length,
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
  id: string
): Promise<Appointment | null> {
  try {
    return await getRecordById<Appointment>('appointments', id)
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return null
  }
}

export async function createAppointmentAction(
  data: AppointmentInsert
): Promise<{ success: boolean; data?: Appointment; error?: string }> {
  try {
    const appointment = await insertRecord<Appointment>('appointments', data)

    if (!appointment) {
      return { success: false, error: 'Error al crear la cita' }
    }

    return { success: true, data: appointment }
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateAppointmentAction(
  id: string,
  data: AppointmentUpdate
): Promise<{ success: boolean; data?: Appointment; error?: string }> {
  try {
    const appointment = await updateRecord<Appointment>('appointments', id, data)

    if (!appointment) {
      return { success: false, error: 'Error al actualizar la cita' }
    }

    return { success: true, data: appointment }
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
