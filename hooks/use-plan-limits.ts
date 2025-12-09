'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import { createBrowserClient } from '@supabase/ssr'

export type LimitType =
  | 'max_appointments_per_month'
  | 'max_products'
  | 'max_services'
  | 'max_customers'
  | 'max_storage_mb'
  | 'max_businesses'
  | 'max_users_per_business'
  | 'max_specialists_per_business'

export interface LimitInfo {
  limit: number | null // null = sin límite
  current: number
  remaining: number | null // null = sin límite
  isAtLimit: boolean
  percentageUsed: number | null // null = sin límite
  isLoading: boolean
}

export interface PlanLimits {
  max_appointments_per_month: number | null
  max_products: number | null
  max_services: number | null
  max_customers: number | null
  max_storage_mb: number | null
  max_businesses: number
  max_users_per_business: number
  max_specialists_per_business: number
}

const DEFAULT_LIMIT_INFO: LimitInfo = {
  limit: null,
  current: 0,
  remaining: null,
  isAtLimit: false,
  percentageUsed: null,
  isLoading: true,
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Hook para obtener los límites del plan actual
 */
export function usePlanLimits(): {
  limits: PlanLimits | null
  isLoading: boolean
  error: string | null
  refetch: () => void
} {
  const { activeBusiness } = useActiveBusinessStore()
  const [limits, setLimits] = useState<PlanLimits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLimits = useCallback(async () => {
    if (!activeBusiness?.business_account_id) {
      setLimits(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()

      const { data, error: queryError } = await supabase
        .from('business_accounts')
        .select(`
          plan:plans(
            features,
            max_businesses,
            max_users_per_business,
            max_specialists_per_business
          )
        `)
        .eq('id', activeBusiness.business_account_id)
        .single()

      if (queryError) throw queryError

      if (!data?.plan) {
        setLimits(null)
        setIsLoading(false)
        return
      }

      const plan = data.plan as any
      const features = plan.features || {}

      setLimits({
        max_appointments_per_month: features.max_appointments_per_month ?? null,
        max_products: features.max_products ?? null,
        max_services: features.max_services ?? null,
        max_customers: features.max_customers ?? null,
        max_storage_mb: features.max_storage_mb ?? null,
        max_businesses: plan.max_businesses ?? 1,
        max_users_per_business: plan.max_users_per_business ?? 1,
        max_specialists_per_business: plan.max_specialists_per_business ?? 1,
      })
    } catch (err: any) {
      console.error('Error fetching plan limits:', err)
      setError(err.message || 'Error al obtener límites del plan')
      setLimits(null)
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.business_account_id])

  useEffect(() => {
    fetchLimits()
  }, [fetchLimits])

  return { limits, isLoading, error, refetch: fetchLimits }
}

// Límites "sin límite" para COMPANY_ADMIN
const UNLIMITED_LIMIT_INFO: LimitInfo = {
  limit: null,
  current: 0,
  remaining: null,
  isAtLimit: false,
  percentageUsed: null,
  isLoading: false,
}

/**
 * Hook para verificar un límite específico con conteo actual
 * COMPANY_ADMIN no tiene límites
 */
export function useLimitCheck(limitType: LimitType): LimitInfo {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [limitInfo, setLimitInfo] = useState<LimitInfo>(DEFAULT_LIMIT_INFO)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    // COMPANY_ADMIN no tiene límites
    if (isCompanyAdmin) {
      setLimitInfo(UNLIMITED_LIMIT_INFO)
      return
    }

    const checkLimit = async () => {
      if (!activeBusiness?.business_account_id) {
        setLimitInfo({ ...DEFAULT_LIMIT_INFO, isLoading: false })
        return
      }

      setLimitInfo((prev) => ({ ...prev, isLoading: true }))

      try {
        const supabase = getSupabase()

        // Obtener límite del plan
        const { data: accountData, error: accountError } = await supabase
          .from('business_accounts')
          .select(`
            plan:plans(
              features,
              max_businesses,
              max_users_per_business,
              max_specialists_per_business
            )
          `)
          .eq('id', activeBusiness.business_account_id)
          .single()

        if (accountError || !accountData?.plan) {
          setLimitInfo({ ...DEFAULT_LIMIT_INFO, isLoading: false })
          return
        }

        const plan = accountData.plan as any
        const features = plan.features || {}

        // Obtener el límite según el tipo
        let limit: number | null = null
        if (limitType.startsWith('max_') && limitType in plan) {
          limit = plan[limitType]
        } else if (limitType in features) {
          limit = features[limitType]
        }

        // Obtener el conteo actual
        let current = 0
        const businessId = activeBusiness.id

        switch (limitType) {
          case 'max_appointments_per_month': {
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const { count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('business_id', businessId)
              .gte('scheduled_start', startOfMonth.toISOString())
            current = count || 0
            break
          }
          case 'max_products': {
            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('business_id', businessId)
            current = count || 0
            break
          }
          case 'max_services': {
            const { count } = await supabase
              .from('services')
              .select('*', { count: 'exact', head: true })
              .eq('business_id', businessId)
            current = count || 0
            break
          }
          case 'max_customers': {
            const { count } = await supabase
              .from('customers')
              .select('*', { count: 'exact', head: true })
              .eq('business_id', businessId)
            current = count || 0
            break
          }
          case 'max_specialists_per_business': {
            const { count } = await supabase
              .from('specialists')
              .select('*', { count: 'exact', head: true })
              .eq('business_id', businessId)
            current = count || 0
            break
          }
          case 'max_users_per_business': {
            const { count } = await supabase
              .from('business_members')
              .select('*', { count: 'exact', head: true })
              .eq('business_id', businessId)
            current = count || 0
            break
          }
          case 'max_businesses': {
            const { count } = await supabase
              .from('businesses')
              .select('*', { count: 'exact', head: true })
              .eq('business_account_id', activeBusiness.business_account_id)
            current = count || 0
            break
          }
          case 'max_storage_mb': {
            // Esto requeriría una implementación específica de conteo de storage
            current = 0
            break
          }
        }

        const remaining = limit !== null ? Math.max(0, limit - current) : null
        const isAtLimit = limit !== null && current >= limit
        const percentageUsed = limit !== null && limit > 0 ? (current / limit) * 100 : null

        setLimitInfo({
          limit,
          current,
          remaining,
          isAtLimit,
          percentageUsed,
          isLoading: false,
        })
      } catch (error) {
        console.error(`Error checking limit ${limitType}:`, error)
        setLimitInfo({ ...DEFAULT_LIMIT_INFO, isLoading: false })
      }
    }

    checkLimit()
  }, [activeBusiness?.business_account_id, activeBusiness?.id, limitType, isCompanyAdmin])

  // Retornar sin límites para COMPANY_ADMIN
  if (isCompanyAdmin) {
    return UNLIMITED_LIMIT_INFO
  }

  return limitInfo
}

/**
 * Hook para verificar si se puede crear un nuevo recurso
 */
export function useCanCreate(resourceType: 'product' | 'service' | 'customer' | 'specialist' | 'business' | 'appointment'): {
  canCreate: boolean
  limitInfo: LimitInfo
} {
  const limitTypeMap: Record<string, LimitType> = {
    product: 'max_products',
    service: 'max_services',
    customer: 'max_customers',
    specialist: 'max_specialists_per_business',
    business: 'max_businesses',
    appointment: 'max_appointments_per_month',
  }

  const limitInfo = useLimitCheck(limitTypeMap[resourceType])

  return {
    canCreate: !limitInfo.isAtLimit,
    limitInfo,
  }
}

/**
 * Componente helper para mostrar información de uso de límite
 */
export function formatLimitUsage(limitInfo: LimitInfo): string {
  if (limitInfo.limit === null) {
    return `${limitInfo.current} (sin límite)`
  }
  return `${limitInfo.current} / ${limitInfo.limit}`
}

export function getLimitStatusColor(limitInfo: LimitInfo): 'default' | 'warning' | 'error' {
  if (limitInfo.percentageUsed === null) return 'default'
  if (limitInfo.percentageUsed >= 100) return 'error'
  if (limitInfo.percentageUsed >= 80) return 'warning'
  return 'default'
}
