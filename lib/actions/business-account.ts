'use server'

import { getSupabaseClient } from './supabase'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import type {
  BusinessAccountMember,
  BusinessAccountMemberInsert,
  BusinessAccountMemberUpdate,
} from '@/lib/models/business-account/business-account-member'

export interface BusinessAccountListResponse {
  data: BusinessAccount[]
  total: number
  total_pages: number
}

export async function fetchBusinessAccountsAction(params?: {
  page?: number
  page_size?: number
  company_name?: string[]
}): Promise<BusinessAccountListResponse> {
  try {
    const page = params?.page || 1
    const pageSize = params?.page_size || 10
    const offset = (page - 1) * pageSize

    const client = await getSupabaseClient()
    let query = client.from('business_accounts').select('*', { count: 'exact' })

    if (params?.company_name && params.company_name.length > 0) {
      const searchTerm = params.company_name[0]
      query = query.ilike('company_name', `%${searchTerm}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) throw error

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return {
      data: data || [],
      total,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching business accounts:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function createBusinessAccountAction(
  data: BusinessAccountInsert
): Promise<{ data: BusinessAccount | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: account, error } = await client
      .from('business_accounts')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return { data: account, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function updateBusinessAccountAction(
  id: string,
  data: BusinessAccountUpdate
): Promise<{ data: BusinessAccount | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: account, error } = await client
      .from('business_accounts')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data: account, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function getBusinessAccountByIdAction(
  id: string
): Promise<{ data: BusinessAccount | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: account, error } = await client
      .from('business_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { data: account, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function getUserBusinessAccountsAction(
  userId: string
): Promise<{ data: BusinessAccount[] | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: accounts, error } = await client
      .rpc('get_user_business_accounts', { user_uuid: userId })

    if (error) throw error

    return { data: accounts || [], error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function addAccountMemberAction(
  data: BusinessAccountMemberInsert
): Promise<{ data: BusinessAccountMember | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: member, error } = await client
      .from('business_account_members')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return { data: member, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function updateAccountMemberAction(
  id: string,
  data: BusinessAccountMemberUpdate
): Promise<{ data: BusinessAccountMember | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: member, error } = await client
      .from('business_account_members')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data: member, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function removeAccountMemberAction(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { error } = await client
      .from('business_account_members')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getAccountMembersAction(
  accountId: string
): Promise<{ data: BusinessAccountMember[] | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: members, error } = await client
      .from('business_account_members')
      .select(`
        *,
        users_profile:user_profile_id (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('business_account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data: members || [], error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function isAccountAdminAction(
  userId: string,
  accountId: string
): Promise<{ isAdmin: boolean; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data, error } = await client
      .rpc('is_account_admin', { user_uuid: userId, account_uuid: accountId })

    if (error) throw error

    return { isAdmin: data || false, error: null }
  } catch (error: any) {
    return { isAdmin: false, error: error.message }
  }
}

export async function canCreateBusinessInAccountAction(
  accountId: string
): Promise<{ canCreate: boolean; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data, error } = await client
      .rpc('can_create_business_in_account', { account_uuid: accountId })

    if (error) throw error

    return { canCreate: data || false, error: null }
  } catch (error: any) {
    return { canCreate: false, error: error.message }
  }
}

export async function findUserProfileByEmailAction(
  email: string
): Promise<{ data: { id: string; email: string; full_name: string | null } | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()

    // Buscar en users_profile por email
    const { data: profile, error } = await client
      .from('users_profile')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'Usuario no encontrado con ese email' }
      }
      throw error
    }

    return { data: profile, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
