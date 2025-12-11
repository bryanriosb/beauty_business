'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  hasModuleAccess,
  getAccessDeniedReason,
  getAvailableModules,
  type ModuleName,
  type SubscriptionPlan,
} from '@/lib/config/module-access'
import type { BusinessType } from '@/lib/types/enums'

interface ModuleAccessResult {
  hasAccess: boolean
  reason: string | null
}

/**
 * Hook para verificar el acceso a módulos basado en el tipo de negocio y plan de suscripción
 *
 * @example
 * ```tsx
 * const { checkModuleAccess, availableModules } = useModuleAccess()
 * const medicalRecordsAccess = checkModuleAccess('medical_records')
 *
 * if (!medicalRecordsAccess.hasAccess) {
 *   return <Alert>{medicalRecordsAccess.reason}</Alert>
 * }
 * ```
 */
export function useModuleAccess() {
  const { data: session } = useSession()

  const businessType = session?.user?.business_type as BusinessType | undefined
  const plan = session?.user?.subscription_plan as SubscriptionPlan | undefined

  /**
   * Verifica si el usuario tiene acceso a un módulo específico
   */
  const checkModuleAccess = useMemo(() => {
    return (module: ModuleName): ModuleAccessResult => {
      // Si no hay sesión o no hay información de negocio, denegar acceso
      if (!session || !businessType || !plan) {
        return {
          hasAccess: false,
          reason: 'No se pudo verificar tu información de acceso',
        }
      }

      const hasAccess = hasModuleAccess(module, businessType, plan)
      const reason = hasAccess
        ? null
        : getAccessDeniedReason(module, businessType, plan)

      return {
        hasAccess,
        reason,
      }
    }
  }, [session, businessType, plan])

  /**
   * Lista de todos los módulos disponibles para el usuario actual
   */
  const availableModules = useMemo(() => {
    if (!businessType || !plan) {
      return []
    }

    return getAvailableModules(businessType, plan)
  }, [businessType, plan])

  /**
   * Verifica si un módulo específico está disponible (versión simple que retorna boolean)
   */
  const isModuleAvailable = useMemo(() => {
    return (module: ModuleName): boolean => {
      return checkModuleAccess(module).hasAccess
    }
  }, [checkModuleAccess])

  return {
    checkModuleAccess,
    availableModules,
    isModuleAvailable,
    businessType,
    plan,
  }
}
