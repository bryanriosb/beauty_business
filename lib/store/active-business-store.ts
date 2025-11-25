import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'

export interface Business {
  id: string
  name: string
  business_account_id: string
}

interface ActiveBusinessState {
  activeBusiness: Business | null
  businesses: Business[]
  setActiveBusiness: (business: Business) => void
  setBusinesses: (businesses: Business[]) => void
  initializeFromSession: (businesses: Business[]) => void
  reset: () => void
}

export const useActiveBusinessStore = create<ActiveBusinessState>()(
  persist(
    (set, get) => ({
      activeBusiness: null,
      businesses: [],

      setActiveBusiness: (business) => set({ activeBusiness: business }),

      setBusinesses: (businesses) => set({ businesses }),

      initializeFromSession: (businesses) => {
        const current = get().activeBusiness
        const validBusiness = current ? businesses.find((b) => b.id === current.id) : null

        set({
          businesses,
          activeBusiness: validBusiness || businesses[0] || null,
        })
      },

      reset: () => set({ activeBusiness: null, businesses: [] }),
    }),
    {
      name: 'active-business-storage',
      partialize: (state) => ({ activeBusiness: state.activeBusiness }),
    }
  )
)

export function useActiveBusinessHydrated() {
  const [hydrated, setHydrated] = useState(false)
  const store = useActiveBusinessStore()

  useEffect(() => {
    setHydrated(true)
  }, [])

  return { ...store, hydrated }
}
