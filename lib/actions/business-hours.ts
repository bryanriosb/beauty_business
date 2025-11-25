'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  BusinessHours,
  BusinessHoursInsert,
  BusinessSpecialHours,
  BusinessSpecialHoursInsert,
  BusinessSpecialHoursUpdate,
} from '@/lib/models/business/business-hours'

export async function fetchBusinessHoursAction(
  businessId: string
): Promise<BusinessHours[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('business_operating_hours')
      .select('*')
      .eq('business_id', businessId)
      .order('day')
      .order('shift_number')

    if (error) {
      console.error('Error fetching business hours:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchBusinessHoursAction:', error)
    return []
  }
}

export async function updateBusinessHoursAction(
  businessId: string,
  hours: Omit<BusinessHours, 'id' | 'business_id' | 'created_at' | 'updated_at'>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    await supabase
      .from('business_operating_hours')
      .delete()
      .eq('business_id', businessId)

    if (hours.length > 0) {
      const dataToInsert: BusinessHoursInsert[] = hours.map((h) => ({
        business_id: businessId,
        day: h.day,
        shift_number: h.shift_number || 1,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }))

      const { error } = await supabase
        .from('business_operating_hours')
        .insert(dataToInsert)

      if (error) throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating business hours:', error)
    return { success: false, error: error.message }
  }
}

export async function fetchBusinessSpecialHoursAction(
  businessId: string
): Promise<BusinessSpecialHours[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('business_special_hours')
      .select('*')
      .eq('business_id', businessId)
      .order('special_date', { ascending: true })
      .order('shift_number')

    if (error) {
      console.error('Error fetching special hours:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchBusinessSpecialHoursAction:', error)
    return []
  }
}

export async function createBusinessSpecialHoursAction(
  data: BusinessSpecialHoursInsert
): Promise<{ success: boolean; data?: BusinessSpecialHours; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data: created, error } = await supabase
      .from('business_special_hours')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: created }
  } catch (error: any) {
    console.error('Error creating special hours:', error)
    return { success: false, error: error.message }
  }
}

export async function updateBusinessSpecialHoursAction(
  id: string,
  data: BusinessSpecialHoursUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { error } = await supabase
      .from('business_special_hours')
      .update(data)
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating special hours:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteBusinessSpecialHoursAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { error } = await supabase
      .from('business_special_hours')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting special hours:', error)
    return { success: false, error: error.message }
  }
}
