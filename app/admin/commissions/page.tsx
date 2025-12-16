'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { DateRange } from 'react-day-picker'
import {
  Percent,
  DollarSign,
  Clock,
  CheckCircle,
  Settings2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import CommissionService from '@/lib/services/commission/commission-service'
import { CommissionSummaryCards } from '@/components/commissions/CommissionSummaryCards'
import { CommissionTable } from '@/components/commissions/CommissionTable'
import {
  ReportDateFilter,
  getDateRangeFromPreset,
  type DatePreset,
} from '@/components/reports/ReportDateFilter'
import { toast } from 'sonner'
import type {
  CommissionSummary,
  CommissionStatus,
} from '@/lib/models/commission'
import Link from 'next/link'

export default function CommissionsPage() {
  const {
    role,
    specialistId: currentSpecialistId,
    isLoading: userLoading,
  } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const commissionService = useMemo(() => new CommissionService(), [])

  const [activePreset, setActivePreset] = useState<DatePreset>('month')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getDateRangeFromPreset('month')
  )
  const [summary, setSummary] = useState<CommissionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('summary')
  const [tableKey, setTableKey] = useState(0)

  const activeBusinessId = activeBusiness?.id
  const isProfessional = role === USER_ROLES.PROFESSIONAL
  const isAdmin =
    role === USER_ROLES.COMPANY_ADMIN || role === USER_ROLES.BUSINESS_ADMIN

  const dateParams = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      const defaultRange = getDateRangeFromPreset('month')
      return {
        start_date: defaultRange.from!.toISOString(),
        end_date: defaultRange.to!.toISOString(),
      }
    }
    return {
      start_date: dateRange.from.toISOString(),
      end_date: dateRange.to.toISOString(),
    }
  }, [dateRange])

  const loadSummary = useCallback(async () => {
    if (!activeBusinessId) return

    setIsLoading(true)
    try {
      const params: any = {
        business_id: activeBusinessId,
        ...dateParams,
      }

      if (isProfessional && currentSpecialistId) {
        params.specialist_id = currentSpecialistId
      }

      const summaryResult = await commissionService.getSummary(params)

      const filteredSummary =
        isProfessional && currentSpecialistId
          ? summaryResult.filter((s) => s.specialist_id === currentSpecialistId)
          : summaryResult

      setSummary(filteredSummary)
    } catch (error) {
      console.error('Error loading commissions:', error)
      toast.error('Error al cargar comisiones')
    } finally {
      setIsLoading(false)
    }
  }, [
    commissionService,
    activeBusinessId,
    dateParams,
    isProfessional,
    currentSpecialistId,
  ])

  useEffect(() => {
    if (activeBusinessId) {
      loadSummary()
      setTableKey((prev) => prev + 1)
    }
  }, [loadSummary, activeBusinessId])

  const handleStatusChange = useCallback(
    async (id: string, status: CommissionStatus) => {
      try {
        const result = await commissionService.updateCommission(id, { status })
        if (!result.success) throw new Error(result.error)
        toast.success('Estado actualizado')
        loadSummary()
      } catch (error: any) {
        toast.error(error.message || 'Error al actualizar')
      }
    },
    [commissionService, loadSummary]
  )

  const handleBulkStatusChange = useCallback(
    async (ids: string[], status: CommissionStatus) => {
      try {
        const result = await commissionService.bulkUpdateStatus(ids, status)
        if (!result.success) throw new Error(result.error)
        toast.success(`${result.updatedCount} comisiones actualizadas`)
        loadSummary()
      } catch (error: any) {
        toast.error(error.message || 'Error al actualizar')
      }
    },
    [commissionService, loadSummary]
  )

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, s) => ({
        total: acc.total + s.total_commissions_cents,
        pending: acc.pending + s.pending_cents,
        approved: acc.approved + s.approved_cents,
        paid: acc.paid + s.paid_cents,
      }),
      { total: 0, pending: 0, approved: 0, paid: 0 }
    )
  }, [summary])

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Percent className="h-7 w-7" />
            {isProfessional ? 'Mis Comisiones' : 'Comisiones'}
          </h1>
          <p className="text-muted-foreground">
            Selecciona una sucursal para ver las comisiones
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Percent className="h-7 w-7" />
            {isProfessional ? 'Mis Comisiones' : 'Comisiones'}
          </h1>
          <p className="text-muted-foreground">
            {isProfessional
              ? 'Visualiza tus comisiones en tiempo real'
              : 'Panorama global de comisiones del equipo'}
          </p>
        </div>
        <ReportDateFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          activePreset={activePreset}
          onPresetChange={setActivePreset}
        />
      </div>

      <div className="flex justify-end">
        <Link href="/admin/settings/commissions" className="btn-link">
          Configurar
          <Settings2 size={20} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Generado"
          value={totals.total}
          icon={DollarSign}
          variant="default"
        />
        <SummaryCard
          title="Pendiente"
          value={totals.pending}
          icon={Clock}
          variant="warning"
        />
        <SummaryCard
          title="Aprobado"
          value={totals.approved}
          icon={CheckCircle}
          variant="info"
        />
        <SummaryCard
          title="Pagado"
          value={totals.paid}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="summary">
            {isProfessional ? 'Mi Resumen' : 'Por Especialista'}
          </TabsTrigger>
          <TabsTrigger value="detail">Detalle</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <CommissionSummaryCards
            summary={summary}
            isLoading={isLoading || userLoading}
          />
        </TabsContent>

        <TabsContent value="detail">
          <CommissionTable
            key={tableKey}
            businessId={activeBusinessId}
            specialistId={
              isProfessional ? currentSpecialistId ?? undefined : undefined
            }
            startDate={dateParams.start_date}
            endDate={dateParams.end_date}
            onStatusChange={isAdmin ? handleStatusChange : undefined}
            onBulkStatusChange={isAdmin ? handleBulkStatusChange : undefined}
            showSpecialist={!isProfessional}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  variant: 'default' | 'warning' | 'info' | 'success'
}

function SummaryCard({ title, value, icon: Icon, variant }: SummaryCardProps) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-yellow-50 dark:bg-yellow-950/20',
    info: 'bg-blue-50 dark:bg-blue-950/20',
    success: 'bg-green-50 dark:bg-green-950/20',
  }

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    success: 'text-green-600',
  }

  return (
    <div className={`rounded-lg border p-4 ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <p className="text-2xl font-bold mt-2">
        ${(value / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
      </p>
    </div>
  )
}
