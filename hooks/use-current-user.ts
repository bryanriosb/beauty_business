'use client'

import { useSession } from 'next-auth/react'
import type { AuthUser } from '@/lib/services/auth/supabase-auth'
import type { UserRole } from '@/const/roles'

export function useCurrentUser() {
  const { data: session, status } = useSession()

  const user: AuthUser | null = session?.user
    ? {
        id: (session.user as any).id,
        email: session.user.email || '',
        name: session.user.name || null,
        role: ((session.user as any).role as UserRole) || 'customer',
        business_id: (session.user as any).business_id,
      }
    : null

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    role: user?.role || null,
    businessId: user?.business_id || null,
  }
}
