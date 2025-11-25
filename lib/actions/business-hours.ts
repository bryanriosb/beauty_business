'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type { BusinessHours, BusinessHoursInsert } from '@/lib/models/business/business-hours'

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
