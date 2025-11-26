'use client'

import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { TodayStats } from '@/components/dashboard/TodayStats'
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments'
import { PendingActions } from '@/components/dashboard/PendingActions'
import { SpecialistsToday } from '@/components/dashboard/SpecialistsToday'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const { isLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const activeBusinessId = activeBusiness?.id
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver el dashboard
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Cargando...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full h-full min-h-[calc(100vh-120px)]">
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
          Tablero - Diario
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      <div className="shrink-0">
        <TodayStats businessId={activeBusinessId} />
      </div>

      <div className="flex-1 grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 auto-rows-min lg:auto-rows-fr">
        <div className="lg:col-span-2 min-h-[300px] lg:min-h-0">
          <UpcomingAppointments businessId={activeBusinessId} />
        </div>
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex-1 min-h-[150px]">
            <PendingActions businessId={activeBusinessId} />
          </div>
          <div className="flex-1 min-h-[200px]">
            <SpecialistsToday businessId={activeBusinessId} />
          </div>
        </div>
      </div>
    </div>
  )
}
