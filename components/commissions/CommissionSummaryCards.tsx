'use client'

import { Percent, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import type { CommissionSummary } from '@/lib/models/commission'

interface CommissionSummaryCardsProps {
  summary: CommissionSummary[]
  isLoading: boolean
}

export function CommissionSummaryCards({ summary, isLoading }: CommissionSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[200px] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (summary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Percent className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No hay comisiones en este período</p>
        <p className="text-sm text-muted-foreground mt-1">
          Las comisiones se generan cuando se completan citas
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summary.map((s) => (
        <SpecialistSummaryCard key={s.specialist_id} summary={s} />
      ))}
    </div>
  )
}

interface SpecialistSummaryCardProps {
  summary: CommissionSummary
}

function SpecialistSummaryCard({ summary }: SpecialistSummaryCardProps) {
  const paidPercentage = summary.total_commissions_cents > 0
    ? Math.round((summary.paid_cents / summary.total_commissions_cents) * 100)
    : 0

  const formatCurrency = (cents: number) =>
    `$${(cents / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={summary.profile_picture_url || undefined} />
            <AvatarFallback>
              {summary.specialist_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{summary.specialist_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {summary.total_appointments} citas
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Comisiones</span>
            <span className="text-lg font-bold">
              {formatCurrency(summary.total_commissions_cents)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso de Pago</span>
              <span>{paidPercentage}%</span>
            </div>
            <Progress value={paidPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
            <div>
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="text-sm font-medium text-yellow-600">
                {formatCurrency(summary.pending_cents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aprobado</p>
              <p className="text-sm font-medium text-blue-600">
                {formatCurrency(summary.approved_cents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pagado</p>
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(summary.paid_cents)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Servicios: {formatCurrency(summary.total_services_cents)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
