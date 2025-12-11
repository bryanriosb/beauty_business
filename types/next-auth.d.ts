import { UserRole } from '@/const/roles'
import 'next-auth'

declare module 'next-auth' {
  /**
   * Extender la interfaz Session para incluir los campos personalizados del usuario
   */
  interface Session {
    user: {
      id: string
      username: string
      name: string
      role: UserRole
      business_id?: string | null
      business_account_id?: string | null
      user_profile_id?: string | null
      specialist_id?: string | null
      business_type?: string | null
      subscription_plan?: string | null
      businesses?: Array<{
        id: string
        name: string
        business_account_id: string
      }> | null
    }
  }

  /**
   * Extender la interfaz User para incluir los campos personalizados
   */
  interface User {
    id: string
    username: string
    name: string
    role: UserRole
    business_id?: string | null
    business_account_id?: string | null
    user_profile_id?: string | null
    specialist_id?: string | null
    business_type?: string | null
    subscription_plan?: string | null
    businesses?: Array<{
      id: string
      name: string
      business_account_id: string
    }> | null
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extender la interfaz JWT para incluir los campos personalizados
   */
  interface JWT {
    id: string
    username: string
    name: string
    role: UserRole
    business_id?: string | null
    business_account_id?: string | null
    user_profile_id?: string | null
    specialist_id?: string | null
    business_type?: string | null
    subscription_plan?: string | null
    businesses?: Array<{
      id: string
      name: string
      business_account_id: string
    }> | null
  }
}
