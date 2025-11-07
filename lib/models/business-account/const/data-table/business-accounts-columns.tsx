import { BusinessAccount } from '@/lib/models/business-account/business-account'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const subscriptionPlanLabels: Record<string, string> = {
  free: 'Gratis',
  basic: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
  trial: 'Prueba',
}

const statusLabels: Record<string, string> = {
  active: 'Activa',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
  trial: 'Prueba',
}

const statusVariants: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  trial: 'secondary',
  suspended: 'outline',
  cancelled: 'destructive',
}

export const BUSINESS_ACCOUNTS_COLUMNS: ColumnDef<BusinessAccount>[] = [
  {
    accessorKey: 'company_name',
    header: 'Empresa',
    cell: ({ row }) => {
      const name = row.getValue('company_name') as string
      const taxId = row.original.tax_id
      return (
        <div>
          <div className="font-medium">{name}</div>
          {taxId && (
            <div className="text-xs text-muted-foreground">NIT: {taxId}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'contact_name',
    header: 'Contacto',
    cell: ({ row }) => {
      const name = row.getValue('contact_name') as string
      const email = row.original.contact_email
      return (
        <div>
          <div className="font-medium text-sm">{name}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
        </div>
      )
    },
  },
  {
    accessorKey: 'subscription_plan',
    header: 'Plan',
    cell: ({ row }) => {
      const plan = row.getValue('subscription_plan') as string
      return (
        <Badge variant="outline">{subscriptionPlanLabels[plan] || plan}</Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          className="bg-primary"
          variant={statusVariants[status] || 'default'}
        >
          {statusLabels[status] || status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'billing_city',
    header: 'Ciudad',
    cell: ({ row }) => {
      const city = row.getValue('billing_city') as string | null
      const state = row.original.billing_state

      if (!city) return <div className="text-muted-foreground">-</div>

      return (
        <div className="text-sm">
          {city}
          {state && (
            <div className="text-xs text-muted-foreground">{state}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha de Creación',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      return (
        <div className="text-sm text-muted-foreground">
          {format(new Date(date), 'dd MMM yyyy', { locale: es })}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    // La celda de acciones se define dinámicamente en la página
    // para evitar problemas de serialización con callbacks
  },
]
