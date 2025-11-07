'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

import type { UserRole } from '@/const/roles'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  business_id?: string | null
  business_account_id?: string | null
  user_profile_id?: string | null
}

/**
 * Authenticate user with Supabase Auth using email and password
 * @param credentials - Object containing email and password
 * @returns User session data if successful, null otherwise
 */
export async function authenticateWithSupabase(
  credentials: Record<'email' | 'password', string> | undefined
): Promise<AuthUser | null> {
  try {
    if (!credentials) return null

    const supabase = await getSupabaseAdminClient()
    const { email, password } = credentials

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (authError || !authData.user) {
      console.error('Authentication error:', authError?.message)
      return null
    }

    // Get user profile with business account membership
    const { data: userProfile, error: profileError } = await supabase
      .from('users_profile')
      .select(`
        id,
        user_id,
        role,
        business_id,
        business_account_members!inner (
          business_account_id,
          role,
          status
        )
      `)
      .eq('user_id', authData.user.id)
      .eq('business_account_members.status', 'active')
      .limit(1)
      .single()

    // Si el error es por columna inexistente, intentar sin business_id
    if (profileError?.message?.includes('business_id does not exist')) {
      const { data: userProfileWithoutBusinessId, error: retryError } =
        await supabase
          .from('users_profile')
          .select('id, user_id, role')
          .eq('user_id', authData.user.id)
          .single()

      if (retryError || !userProfileWithoutBusinessId) {
        console.error('Error fetching user profile:', retryError?.message)
        return null
      }

      return {
        id: authData.user.id,
        email: authData.user.email || email,
        name: authData.user.user_metadata?.name || userProfileWithoutBusinessId.role || 'User',
        role: (userProfileWithoutBusinessId.role as UserRole) || 'customer',
        business_id: null,
      }
    }

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError?.message)
      return null
    }

    const membership = (userProfile as any).business_account_members?.[0]

    return {
      id: authData.user.id,
      email: authData.user.email || email,
      name: authData.user.user_metadata?.name || userProfile.role || 'User',
      role: (userProfile.role as UserRole) || 'customer',
      business_id: (userProfile as any).business_id || null,
      business_account_id: membership?.business_account_id || null,
      user_profile_id: userProfile.id,
    }
  } catch (err) {
    console.error('Cannot sign in:', err)
    return null
  }
}

/**
 * Sign out the current user
 */
export async function signOutSupabase(): Promise<void> {
  try {
    const supabase = await getSupabaseAdminClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Error signing out:', err)
  }
}

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Get user profile
    // Intentar obtener business_id, pero si no existe la columna, ignorar el error
    const { data: userProfile, error: profileError } = await supabase
      .from('users_profile')
      .select('id, user_id, role, business_id')
      .eq('user_id', user.id)
      .single()

    // Si el error es por columna inexistente, intentar sin business_id
    if (profileError?.message?.includes('business_id does not exist')) {
      const { data: userProfileWithoutBusinessId, error: retryError } =
        await supabase
          .from('users_profile')
          .select('id, user_id, role')
          .eq('user_id', user.id)
          .single()

      if (retryError || !userProfileWithoutBusinessId) {
        return null
      }

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || userProfileWithoutBusinessId.role || 'User',
        role: (userProfileWithoutBusinessId.role as UserRole) || 'customer',
        business_id: null,
      }
    }

    if (profileError || !userProfile) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || userProfile.role || 'User',
      role: (userProfile.role as UserRole) || 'customer',
      business_id: (userProfile as any).business_id || null,
    }
  } catch (err) {
    console.error('Error getting current user:', err)
    return null
  }
}

/**
 * Create a new admin user account
 */
export async function createAdminAccount(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Failed to create account',
      }
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users_profile')
      .insert({
        user_id: authData.user.id,
      })

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error creating admin account:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}
