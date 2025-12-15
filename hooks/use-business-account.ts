'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from './use-current-user'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import type { BusinessAccountMember } from '@/lib/models/business-account/business-account-member'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'

export function useBusinessAccount() {
  const { user, businessAccountId } = useCurrentUser()
  const [account, setAccount] = useState<BusinessAccount | null>(null)
  const [membership, setMembership] = useState<BusinessAccountMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null)

  useEffect(() => {
    if (!businessAccountId || !user) {
      setAccount(null)
      setMembership(null)
      setIsLoading(false)
      setLastFetchedId(null) // Resetear
      return
    }

    // Evitar múltiples fetches para el mismo ID
    if (lastFetchedId === businessAccountId) {
      return
    }

    const fetchAccountData = async () => {
      try {
        setIsLoading(true)
        const service = new BusinessAccountService()

        const accountData = await service.getAccountById(businessAccountId)
        console.log('📊 BusinessAccount data:', { 
          id: accountData?.id, 
          tutorial_started: accountData?.tutorial_started,
          subscription_plan: accountData?.subscription_plan,
          status: accountData?.status
        })
        setAccount(accountData)
        setLastFetchedId(businessAccountId) // Marcar como fetched DESPUÉS del fetch

        if (user.user_profile_id) {
          const members = await service.getAccountMembers(businessAccountId)
          const userMembership = members.find(
            (m) => m.user_profile_id === user.user_profile_id
          )
          setMembership(userMembership || null)
        }

        setError(null)
      } catch (err: any) {
        console.error('Error fetching business account:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccountData()
  }, [businessAccountId, user?.id]) // Dependencias más simples

  const isOwner = membership?.role === 'owner'
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isActive = membership?.status === 'active'

  const tutorialStartedValue = Boolean(account?.tutorial_started) // Convertir undefined/null a false
  console.log('🎓 useBusinessAccount return:', { 
    tutorialStarted: tutorialStartedValue,
    rawValue: account?.tutorial_started,
    accountId: account?.id
  })

  return {
    account,
    membership,
    isLoading,
    error,
    isOwner,
    isAdmin,
    isActive,
    tutorialStarted: tutorialStartedValue,
    canManageMembers: isAdmin && isActive,
    canManageSettings: isOwner && isActive,
  }
}
