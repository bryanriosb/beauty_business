'use client'

import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MoreHorizontal, CheckCircle, Clock, XCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CommissionStatusBadge } from './CommissionStatusBadge'
import type {
  SpecialistCommissionWithDetails,
  CommissionStatus,
} from '@/lib/models/commission'

const formatCurrency = (cents: number) =>
  `$${(cents / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`

interface ColumnOptions {
  showSpecialist?: boolean
  onStatusChange?: (id: string, status: CommissionStatus) => void
}

export function getCommissionColumns(
  options: ColumnOptions = {}
): ColumnDef<SpecialistCommissionWithDetails>[] {
  const { showSpecialist = true, onStatusChange } = options

  const columns: ColumnDef<SpecialistCommissionWithDetails>[] = []

  if (showSpecialist) {
    columns.push({
      accessorKey: 'specialist_name',
      header: 'Especialista',
      accessorFn: (row) => {
        const specialist = row.specialist
        return specialist
          ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
          : 'Desconocido'
      },
      cell: ({ row }) => {
        const specialist = row.original.specialist
        const name = specialist
          ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
          : 'Desconocido'

        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={specialist?.profile_picture_url || undefined} />
              <AvatarFallback>
                {specialist?.first_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{name}</span>
          </div>
        )
      },
    })
  }

  columns.push(
    {
      accessorKey: 'created_at',
      header: 'Fecha',
      cell: ({ row }) => {
        const appointment = row.original.appointment
        return appointment?.start_time
          ? format(new Date(appointment.start_time), 'dd MMM yyyy', { locale: es })
          : '-'
      },
    },
    {
      accessorKey: 'appointment_total_cents',
      header: () => <div className="text-right">Total Cita</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.appointment_total_cents)}
        </div>
      ),
    },
    {
      accessorKey: 'service_total_cents',
      header: () => <div className="text-right">Servicios</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.service_total_cents)}
        </div>
      ),
    },
    {
      accessorKey: 'commission_cents',
      header: () => <div className="text-right">Comisión</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.commission_cents)}
          <span className="text-xs text-muted-foreground ml-1">
            ({row.original.commission_rate}%)
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Estado</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <CommissionStatusBadge status={row.original.status} />
        </div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    }
  )

  if (onStatusChange) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const commission = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onStatusChange(commission.id, 'pending')}
                disabled={commission.status === 'pending'}
              >
                <Clock className="h-4 w-4 mr-2" />
                Pendiente
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(commission.id, 'approved')}
                disabled={commission.status === 'approved'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(commission.id, 'paid')}
                disabled={commission.status === 'paid'}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Marcar Pagada
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onStatusChange(commission.id, 'cancelled')}
                disabled={commission.status === 'cancelled'}
                className="text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  return columns
}

export const COMMISSION_STATUS_OPTIONS = [
  { label: 'Pendiente', value: 'pending', icon: Clock },
  { label: 'Aprobada', value: 'approved', icon: CheckCircle },
  { label: 'Pagada', value: 'paid', icon: Wallet },
  { label: 'Cancelada', value: 'cancelled', icon: XCircle },
]
