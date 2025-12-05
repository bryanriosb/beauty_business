'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  BusinessCustomer,
  BusinessCustomerInsert,
  BusinessCustomerUpdate,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'

export interface BusinessCustomerListResponse {
  data: BusinessCustomer[]
  total: number
  total_pages: number
}

export async function fetchBusinessCustomersAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  search?: string
  status?: string
}): Promise<BusinessCustomerListResponse> {
  try {
    if (!params?.business_id) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('business_customers')
      .select('*', { count: 'exact' })
      .eq('business_id', params.business_id)
      .order('first_name', { ascending: true })

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`
      query = query.or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      )
    }

    const page = params.page || 1
    const pageSize = params.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error('Error fetching business customers:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getBusinessCustomerByIdAction(
  id: string
): Promise<BusinessCustomer | null> {
  try {
    return await getRecordById<BusinessCustomer>('business_customers', id)
  } catch (error) {
    console.error('Error fetching business customer:', error)
    return null
  }
}

export async function getBusinessCustomerByUserProfileAction(
  businessId: string,
  userProfileId: string
): Promise<BusinessCustomer | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('user_profile_id', userProfileId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching business customer by user profile:', error)
    return null
  }
}

export async function createBusinessCustomerAction(
  data: BusinessCustomerInsert
): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
  try {
    const customer = await insertRecord<BusinessCustomer>('business_customers', {
      ...data,
      status: data.status || 'active',
      total_visits: 0,
      total_spent_cents: 0,
    })

    if (!customer) {
      return { success: false, error: 'Error al crear el cliente' }
    }

    return { success: true, data: customer }
  } catch (error: any) {
    console.error('Error creating business customer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function createFullCustomerAction(
  input: CreateCustomerInput
): Promise<{
  success: boolean
  data?: BusinessCustomer
  userProfileId?: string
  error?: string
  isNew?: boolean
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    // 1. Verificar si ya existe un business_customer con este email en este negocio
    const { data: existingCustomer } = await supabase
      .from('business_customers')
      .select('*, user_profile_id')
      .eq('business_id', input.business_id)
      .eq('email', input.email)
      .maybeSingle()

    if (existingCustomer) {
      return {
        success: true,
        data: existingCustomer,
        userProfileId: existingCustomer.user_profile_id,
        isNew: false,
      }
    }

    // 2. Verificar si existe un usuario en Supabase Auth con este email
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === input.email.toLowerCase()
    )

    let authUserId: string
    let userProfileId: string

    if (existingAuthUser) {
      authUserId = existingAuthUser.id

      // 3a. Verificar si ya tiene users_profile
      const { data: existingProfile } = await supabase
        .from('users_profile')
        .select('id')
        .eq('user_id', authUserId)
        .maybeSingle()

      if (existingProfile) {
        userProfileId = existingProfile.id
        // Actualizar datos de ubicación si se proporcionan
        if (input.city || input.state || input.country || input.date_of_birth || input.gender || input.identification_type) {
          await supabase
            .from('users_profile')
            .update({
              city: input.city || 'Cali',
              state: input.state || 'Valle del Cauca',
              country: input.country || 'CO',
              date_of_birth: input.date_of_birth || null,
              gender: input.gender || null,
              identification_type: input.identification_type || null,
              identification_number: input.identification_number || null,
            })
            .eq('id', existingProfile.id)
        }
      } else {
        // Crear users_profile con datos completos
        const { data: newProfile, error: profileError } = await supabase
          .from('users_profile')
          .insert({
            user_id: authUserId,
            role: 'customer',
            city: input.city || 'Cali',
            state: input.state || 'Valle del Cauca',
            country: input.country || 'CO',
            date_of_birth: input.date_of_birth || null,
            gender: input.gender || null,
            identification_type: input.identification_type || null,
            identification_number: input.identification_number || null,
          })
          .select('id')
          .single()

        if (profileError) throw profileError
        userProfileId = newProfile.id
      }
    } else {
      // 3b. Crear nuevo usuario en Supabase Auth
      const tempPassword = `Temp${Date.now()}!${Math.random().toString(36).slice(2, 8)}`

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: tempPassword,
        email_confirm: true,
        phone: input.phone || undefined,
        phone_confirm: input.phone ? true : undefined,
        user_metadata: {
          name: `${input.first_name} ${input.last_name || ''}`.trim(),
          first_name: input.first_name,
          last_name: input.last_name || '',
        },
      })

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Error al crear usuario en auth')
      }

      authUserId = authData.user.id

      // 4. Crear users_profile con datos completos
      const { data: newProfile, error: profileError } = await supabase
        .from('users_profile')
        .insert({
          user_id: authUserId,
          role: 'customer',
          city: input.city || 'Cali',
          state: input.state || 'Valle del Cauca',
          country: input.country || 'CO',
          date_of_birth: input.date_of_birth || null,
          gender: input.gender || null,
          identification_type: input.identification_type || null,
          identification_number: input.identification_number || null,
        })
        .select('id')
        .single()

      if (profileError) throw profileError
      userProfileId = newProfile.id
    }

    // 5. Crear business_customer
    const { data: businessCustomer, error: customerError } = await supabase
      .from('business_customers')
      .insert({
        business_id: input.business_id,
        user_profile_id: userProfileId,
        first_name: input.first_name,
        last_name: input.last_name || null,
        email: input.email,
        phone: input.phone || null,
        source: input.source || 'walk_in',
        notes: input.notes || null,
        status: 'active',
        total_visits: 0,
        total_spent_cents: 0,
      })
      .select('*')
      .single()

    if (customerError) throw customerError

    return {
      success: true,
      data: businessCustomer,
      userProfileId,
      isNew: true,
    }
  } catch (error: any) {
    console.error('Error in createFullCustomer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateBusinessCustomerAction(
  id: string,
  data: BusinessCustomerUpdate
): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
  try {
    const customer = await updateRecord<BusinessCustomer>('business_customers', id, data)

    if (!customer) {
      return { success: false, error: 'Error al actualizar el cliente' }
    }

    return { success: true, data: customer }
  } catch (error: any) {
    console.error('Error updating business customer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteBusinessCustomerAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('business_customers', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting business customer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function searchBusinessCustomersAction(
  businessId: string,
  query: string,
  limit: number = 10
): Promise<BusinessCustomer[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const searchTerm = `%${query}%`

    const { data, error } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      )
      .order('first_name', { ascending: true })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error searching business customers:', error)
    return []
  }
}

export async function getRecentBusinessCustomersAction(
  businessId: string,
  limit: number = 10
): Promise<BusinessCustomer[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching recent business customers:', error)
    return []
  }
}

export async function incrementCustomerVisitAction(
  businessCustomerId: string,
  amountCents: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase.rpc('increment_customer_visit', {
      p_customer_id: businessCustomerId,
      p_amount_cents: amountCents,
    })

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error incrementing customer visit:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteBusinessCustomersAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('business_customers')
      .delete()
      .in('id', ids)

    if (error) throw error

    return { success: true, deletedCount: ids.length }
  } catch (error: any) {
    console.error('Error batch deleting business customers:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}
