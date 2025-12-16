'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import Loading from '@/components/ui/loading'
export default function AdminPage() {
  const { isLoading, role } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && role) {
      if (role === 'company_admin') {
        router.replace('/admin/company-dashboard')
      } else {
        router.replace('/admin/dashboard')
      }
    }
  }, [isLoading, role, router])

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-muted-foreground">
          <Loading />
        </div>
      </div>
    </div>
  )
}
