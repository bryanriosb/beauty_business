'use server'

import { authenticateWithSupabase } from './supabase-auth'

export async function authenticate(
  credentials: Record<'username' | 'password', string> | undefined
) {
  try {
    if (!credentials) return null

    // Convert username to email for Supabase Auth
    const { username, password } = credentials

    // Authenticate with Supabase
    const user = await authenticateWithSupabase({
      email: username, // In case username is actually an email
      password,
    })

    if (!user) return null

    // Return user session data in the format expected by NextAuth
    const userSessionData = {
      id: user.id,
      username: user.email,
      name: user.name || 'Admin',
      role: user.role,
    }

    return userSessionData
  } catch (err) {
    console.error('Cannot sign in:', err)
    return null
  }
}
