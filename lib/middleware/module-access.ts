'use server'

import { getCurrentUser } from '@/lib/services/auth/supabase-auth'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  hasModuleAccess,
  type ModuleName,
  type SubscriptionPlan,
} from '@/lib/config/module-access'
import type { BusinessType } from '@/lib/types/enums'
import { USER_ROLES } from '@/const/roles'

export interface ModuleAccessValidationResult {
  hasAccess: boolean
  reason?: string
  redirectTo?: string
}

/**
 * Valida el acceso a un módulo en el servidor
 * Esta función debe ser llamada en las Server Actions o API Routes
 * para verificar que el usuario tiene acceso al módulo solicitado
 *
 * @example
 * ```ts
 * export async function createMedicalRecordAction(data: any) {
 *   const access = await validateModuleAccess('medical_records')
 *   if (!access.hasAccess) {
 *     return { success: false, error: access.reason }
 *   }
 *   // ... continuar con la lógica
 * }
 * ```
 */
export async function validateModuleAccess(
  module: ModuleName
): Promise<ModuleAccessValidationResult> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return {
        hasAccess: false,
        reason: 'Usuario no autenticado',
        redirectTo: '/auth/sign-in',
      }
    }

    // COMPANY_ADMIN tiene acceso completo a todos los módulos
    if (currentUser.role === USER_ROLES.COMPANY_ADMIN) {
      return { hasAccess: true }
    }

    // Obtener el tipo de negocio y plan de suscripción
    const businessType = currentUser.business_type as BusinessType | null
    const subscriptionPlan = currentUser.subscription_plan as
      | SubscriptionPlan
      | null

    if (!businessType || !subscriptionPlan) {
      return {
        hasAccess: false,
        reason:
          'No se pudo verificar tu tipo de negocio o plan de suscripción',
      }
    }

    // Validar acceso al módulo
    const hasAccess = hasModuleAccess(module, businessType, subscriptionPlan)

    if (!hasAccess) {
      const { getAccessDeniedReason } = await import(
        '@/lib/config/module-access'
      )
      const reason = getAccessDeniedReason(
        module,
        businessType,
        subscriptionPlan
      )

      return {
        hasAccess: false,
        reason: reason || 'No tienes acceso a este módulo',
        redirectTo: '/admin',
      }
    }

    return { hasAccess: true }
  } catch (error) {
    console.error('Error validating module access:', error)
    return {
      hasAccess: false,
      reason: 'Error al validar el acceso al módulo',
    }
  }
}

/**
 * Obtiene el tipo de negocio de una cuenta de negocio
 * Útil cuando no tienes el usuario actual pero sí el business_account_id
 */
export async function getBusinessTypeForAccount(
  businessAccountId: string
): Promise<BusinessType | null> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: businesses } = await client
      .from('businesses')
      .select('type')
      .eq('business_account_id', businessAccountId)
      .limit(1)

    return (businesses?.[0]?.type as BusinessType) || null
  } catch (error) {
    console.error('Error getting business type:', error)
    return null
  }
}

/**
 * Obtiene el plan de suscripción de una cuenta de negocio
 */
export async function getSubscriptionPlanForAccount(
  businessAccountId: string
): Promise<SubscriptionPlan | null> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account } = await client
      .from('business_accounts')
      .select('subscription_plan')
      .eq('id', businessAccountId)
      .single()

    return (account?.subscription_plan as SubscriptionPlan) || null
  } catch (error) {
    console.error('Error getting subscription plan:', error)
    return null
  }
}
