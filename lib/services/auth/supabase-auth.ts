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
  specialist_id?: string | null
  businesses?: Array<{
    id: string
    name: string
    business_account_id: string
  }> | null
}

/**
 * Get businesses associated with a business account
 * @param businessAccountId - The business account ID
 * @returns Array of businesses or null
 */
async function getAccountBusinesses(
  businessAccountId: string
): Promise<Array<{ id: string; name: string; business_account_id: string }> | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name, business_account_id')
      .eq('business_account_id', businessAccountId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching account businesses:', error.message)
      return null
    }

    return businesses || []
  } catch (err) {
    console.error('Error in getAccountBusinesses:', err)
    return null
  }
}

/**
 * Get specialist data for a professional user
 * @param userProfileId - The user profile ID
 * @returns Specialist data or null
 */
async function getSpecialistForProfessional(
  userProfileId: string
): Promise<{ id: string; business_id: string | null } | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data: specialist, error } = await supabase
      .from('specialists')
      .select('id, business_id')
      .eq('user_profile_id', userProfileId)
      .single()

    if (error || !specialist) {
      return null
    }

    return specialist
  } catch (err) {
    console.error('Error in getSpecialistForProfessional:', err)
    return null
  }
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

    console.log('Attempting authentication for:', email)

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (authError || !authData.user) {
      console.error('Authentication error:', authError?.message, authError)
      return null
    }

    console.log('Auth successful, user ID:', authData.user.id)

    // Primero obtener el user_profile básico usando user_id de Supabase Auth
    const { data: userProfile, error: profileError } = await supabase
      .from('users_profile')
      .select('id, user_id, role')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError?.message, profileError)
      console.error('Attempted to find profile with user_id:', authData.user.id)
      return null
    }

    console.log('User profile found:', userProfile.id)

    // Bloquear acceso a usuarios con rol customer
    if (userProfile.role === 'customer') {
      console.log('Customer role detected - access denied')
      return null // Retornar null simula credenciales inválidas
    }

    // Luego intentar obtener las membresías (puede que no tenga ninguna)
    const { data: memberships } = await supabase
      .from('business_account_members')
      .select('business_account_id, role, status')
      .eq('user_profile_id', userProfile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    const membership = memberships?.[0] || null
    console.log('Membership found:', membership ? 'Yes' : 'No')

    // Si el usuario es business_admin y tiene una cuenta asociada, obtener sus negocios
    let businesses = null
    let specialistId: string | null = null
    let businessId: string | null = null

    if (userProfile.role === 'business_admin' && membership?.business_account_id) {
      console.log('Fetching businesses for business_admin...')
      businesses = await getAccountBusinesses(membership.business_account_id)
      console.log('Businesses found:', businesses?.length || 0)
    }

    // Si el usuario es professional, obtener su specialist_id y business_id
    if (userProfile.role === 'professional') {
      console.log('Fetching specialist data for professional, userProfile.id:', userProfile.id)
      const specialist = await getSpecialistForProfessional(userProfile.id)
      console.log('Specialist query result:', specialist)
      if (specialist) {
        specialistId = specialist.id
        businessId = specialist.business_id
        console.log('Specialist found, id:', specialistId, 'business_id:', businessId)

        // Obtener el business para el profesional
        if (businessId) {
          const { data: business } = await supabase
            .from('businesses')
            .select('id, name, business_account_id')
            .eq('id', businessId)
            .single()

          if (business) {
            businesses = [business]
          }
        }
      }
    }

    return {
      id: authData.user.id,
      email: authData.user.email || email,
      name: authData.user.user_metadata?.name || userProfile.role || 'User',
      role: (userProfile.role as UserRole) || 'customer',
      business_id: businessId,
      business_account_id: membership?.business_account_id || null,
      user_profile_id: userProfile.id,
      specialist_id: specialistId,
      businesses,
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
    const { data: userProfile, error: profileError } = await supabase
      .from('users_profile')
      .select('id, user_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError?.message)
      return null
    }

    // Intentar obtener las membresías (puede que no tenga ninguna)
    const { data: memberships } = await supabase
      .from('business_account_members')
      .select('business_account_id, role, status')
      .eq('user_profile_id', userProfile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    const membership = memberships?.[0] || null

    // Si el usuario es business_admin y tiene una cuenta asociada, obtener sus negocios
    let businesses = null
    let specialistId: string | null = null
    let businessId: string | null = null

    if (userProfile.role === 'business_admin' && membership?.business_account_id) {
      businesses = await getAccountBusinesses(membership.business_account_id)
    }

    // Si el usuario es professional, obtener su specialist_id y business_id
    if (userProfile.role === 'professional') {
      const specialist = await getSpecialistForProfessional(userProfile.id)
      if (specialist) {
        specialistId = specialist.id
        businessId = specialist.business_id

        if (businessId) {
          const { data: business } = await supabase
            .from('businesses')
            .select('id, name, business_account_id')
            .eq('id', businessId)
            .single()

          if (business) {
            businesses = [business]
          }
        }
      }
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || userProfile.role || 'User',
      role: (userProfile.role as UserRole) || 'customer',
      business_id: businessId,
      business_account_id: membership?.business_account_id || null,
      user_profile_id: userProfile.id,
      specialist_id: specialistId,
      businesses,
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
