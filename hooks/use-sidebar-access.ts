'use client'

import { useState, useEffect, useMemo } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import { checkPlanModuleAccessAction } from '@/lib/actions/plan'
import type { MenuItem, MenuSubItem, ModuleCode } from '@/const/sidebar-menu'

export interface SidebarAccessState {
  moduleAccess: Record<string, boolean>
  isLoading: boolean
}

/**
 * Hook para filtrar items del sidebar basado en acceso del plan
 * COMPANY_ADMIN tiene acceso completo sin verificación de plan
 */
export function useSidebarAccess(items: MenuItem[]): {
  filteredItems: MenuItem[]
  isLoading: boolean
} {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // Extraer todos los códigos de módulo únicos
  const moduleCodes = useMemo(() => {
    const codes = new Set<ModuleCode>()

    items.forEach((item) => {
      if (item.moduleCode && !item.skipPlanCheck) {
        codes.add(item.moduleCode)
      }
      item.items?.forEach((subItem) => {
        if (subItem.moduleCode) {
          codes.add(subItem.moduleCode)
        }
      })
    })

    return Array.from(codes)
  }, [items])

  useEffect(() => {
    // COMPANY_ADMIN tiene acceso completo
    if (isCompanyAdmin) {
      const allAccess = moduleCodes.reduce(
        (acc, code) => ({ ...acc, [code]: true }),
        {}
      )
      setModuleAccess(allAccess)
      setIsLoading(false)
      return
    }

    const checkAllAccess = async () => {
      if (!activeBusiness?.business_account_id) {
        // Sin business account, permitir todos los módulos (se verificará en la página)
        const allAccess = moduleCodes.reduce(
          (acc, code) => ({ ...acc, [code]: true }),
          {}
        )
        setModuleAccess(allAccess)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const results = await Promise.all(
          moduleCodes.map(async (code) => {
            const result = await checkPlanModuleAccessAction(
              activeBusiness.business_account_id,
              code
            )
            return { code, hasAccess: result.hasAccess }
          })
        )

        const accessMap = results.reduce(
          (acc, { code, hasAccess }) => ({ ...acc, [code]: hasAccess }),
          {}
        )

        setModuleAccess(accessMap)
      } catch (error) {
        console.error('Error checking sidebar access:', error)
        // En caso de error, permitir todos para evitar bloquear la UI
        const allAccess = moduleCodes.reduce(
          (acc, code) => ({ ...acc, [code]: true }),
          {}
        )
        setModuleAccess(allAccess)
      } finally {
        setIsLoading(false)
      }
    }

    if (moduleCodes.length > 0) {
      checkAllAccess()
    } else {
      setIsLoading(false)
    }
  }, [activeBusiness?.business_account_id, moduleCodes.join(','), isCompanyAdmin])

  // Filtrar items basado en acceso del plan
  const filteredItems = useMemo(() => {
    if (isLoading) return items // Mostrar todos mientras carga

    return items
      .filter((item) => {
        // Si skipPlanCheck, siempre mostrar
        if (item.skipPlanCheck) return true
        // Si no tiene moduleCode, mostrar
        if (!item.moduleCode) return true
        // Verificar acceso al módulo
        return moduleAccess[item.moduleCode] !== false
      })
      .map((item) => {
        // Filtrar sub-items también
        if (!item.items) return item

        const filteredSubItems = item.items.filter((subItem) => {
          if (!subItem.moduleCode) return true
          return moduleAccess[subItem.moduleCode] !== false
        })

        return { ...item, items: filteredSubItems }
      })
  }, [items, moduleAccess, isLoading])

  return { filteredItems, isLoading }
}

/**
 * Hook simplificado para verificar si un módulo es accesible
 */
export function useModuleVisible(moduleCode: ModuleCode | undefined): boolean {
  const { activeBusiness } = useActiveBusinessStore()
  const [hasAccess, setHasAccess] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!moduleCode || !activeBusiness?.business_account_id) {
        setHasAccess(true)
        return
      }

      try {
        const result = await checkPlanModuleAccessAction(
          activeBusiness.business_account_id,
          moduleCode
        )
        setHasAccess(result.hasAccess)
      } catch (error) {
        console.error(`Error checking module access for ${moduleCode}:`, error)
        setHasAccess(true)
      }
    }

    checkAccess()
  }, [activeBusiness?.business_account_id, moduleCode])

  return hasAccess
}
