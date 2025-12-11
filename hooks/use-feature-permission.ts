'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import {
  checkFeaturePermissionAction,
  getAllFeaturePermissionsAction,
} from '@/lib/actions/plan'
import type { FeaturePermission, ModuleCode } from '@/lib/models/plan/feature-permissions'

export interface FeaturePermissionResult {
  hasPermission: boolean
  isLoading: boolean
}

export interface ModuleFeaturePermissions {
  [featureKey: string]: boolean
}

const DEFAULT_PERMISSION: FeaturePermissionResult = {
  hasPermission: false,
  isLoading: true,
}

const FULL_PERMISSION: FeaturePermissionResult = {
  hasPermission: true,
  isLoading: false,
}

export function useFeaturePermission(
  moduleCode: ModuleCode,
  featureKey: FeaturePermission
): FeaturePermissionResult {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [result, setResult] = useState<FeaturePermissionResult>(DEFAULT_PERMISSION)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    if (isCompanyAdmin) {
      setResult(FULL_PERMISSION)
      return
    }

    const checkPermission = async () => {
      if (!activeBusiness?.business_account_id) {
        setResult({ hasPermission: false, isLoading: false })
        return
      }

      setResult((prev) => ({ ...prev, isLoading: true }))

      try {
        const hasPermission = await checkFeaturePermissionAction(
          activeBusiness.business_account_id,
          moduleCode,
          featureKey
        )

        setResult({
          hasPermission,
          isLoading: false,
        })
      } catch (error) {
        console.error(
          `Error checking feature permission ${moduleCode}.${featureKey}:`,
          error
        )
        setResult({ hasPermission: false, isLoading: false })
      }
    }

    checkPermission()
  }, [activeBusiness?.business_account_id, moduleCode, featureKey, isCompanyAdmin])

  if (isCompanyAdmin) {
    return FULL_PERMISSION
  }

  return result
}

export function useModuleFeaturePermissions(
  moduleCode: ModuleCode
): {
  permissions: ModuleFeaturePermissions
  isLoading: boolean
  hasPermission: (featureKey: string) => boolean
} {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [permissions, setPermissions] = useState<ModuleFeaturePermissions>({})
  const [isLoading, setIsLoading] = useState(true)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    if (isCompanyAdmin) {
      setPermissions({})
      setIsLoading(false)
      return
    }

    const fetchPermissions = async () => {
      if (!activeBusiness?.business_account_id) {
        setPermissions({})
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const fetchedPermissions = await getAllFeaturePermissionsAction(
          activeBusiness.business_account_id,
          moduleCode
        )

        setPermissions(fetchedPermissions)
      } catch (error) {
        console.error(
          `Error fetching feature permissions for ${moduleCode}:`,
          error
        )
        setPermissions({})
      } finally {
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [activeBusiness?.business_account_id, moduleCode, isCompanyAdmin])

  const hasPermission = useCallback(
    (featureKey: string): boolean => {
      if (isCompanyAdmin) return true
      return permissions[featureKey] === true
    },
    [permissions, isCompanyAdmin]
  )

  return {
    permissions,
    isLoading,
    hasPermission,
  }
}

export function useMultipleFeaturePermissions(
  checks: Array<{ module: ModuleCode; feature: FeaturePermission }>
): {
  permissions: Record<string, boolean>
  isLoading: boolean
  hasAllPermissions: boolean
} {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    if (isCompanyAdmin) {
      const allPermissions = checks.reduce(
        (acc, check) => ({
          ...acc,
          [`${check.module}.${check.feature}`]: true,
        }),
        {}
      )
      setPermissions(allPermissions)
      setIsLoading(false)
      return
    }

    const fetchAllPermissions = async () => {
      if (!activeBusiness?.business_account_id) {
        const emptyPermissions = checks.reduce(
          (acc, check) => ({
            ...acc,
            [`${check.module}.${check.feature}`]: false,
          }),
          {}
        )
        setPermissions(emptyPermissions)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const results = await Promise.all(
          checks.map(async (check) => {
            const hasPermission = await checkFeaturePermissionAction(
              activeBusiness.business_account_id,
              check.module,
              check.feature
            )
            return {
              key: `${check.module}.${check.feature}`,
              hasPermission,
            }
          })
        )

        const permissionsMap = results.reduce(
          (acc, result) => ({
            ...acc,
            [result.key]: result.hasPermission,
          }),
          {}
        )

        setPermissions(permissionsMap)
      } catch (error) {
        console.error('Error fetching multiple feature permissions:', error)
        const emptyPermissions = checks.reduce(
          (acc, check) => ({
            ...acc,
            [`${check.module}.${check.feature}`]: false,
          }),
          {}
        )
        setPermissions(emptyPermissions)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllPermissions()
  }, [
    activeBusiness?.business_account_id,
    JSON.stringify(checks),
    isCompanyAdmin,
  ])

  const hasAllPermissions = useMemo(() => {
    if (isCompanyAdmin) return true
    return Object.values(permissions).every((p) => p === true)
  }, [permissions, isCompanyAdmin])

  return {
    permissions,
    isLoading,
    hasAllPermissions,
  }
}
