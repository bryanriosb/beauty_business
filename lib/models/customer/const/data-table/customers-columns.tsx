import type {
  BusinessCustomer,
  CustomerStatus,
  CustomerSource,
} from '@/lib/models/customer/business-customer'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils/currency'

const statusLabels: Record<CustomerStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  vip: 'VIP',
  blocked: 'Bloqueado',
}

const statusVariants: Record<
  CustomerStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  inactive: 'secondary',
  vip: 'default',
  blocked: 'destructive',
}

const sourceLabels: Record<CustomerSource, string> = {
  walk_in: 'Presencial',
  referral: 'Referido',
  social_media: 'Redes sociales',
  website: 'Sitio web',
  ai_agent: 'Asistente IA',
  other: 'Otro',
}

export const CUSTOMERS_COLUMNS: ColumnDef<BusinessCustomer>[] = [
  {
    accessorKey: 'first_name',
    header: 'Cliente',
    cell: ({ row }) => {
      const firstName = row.original.first_name
      const lastName = row.original.last_name
      const fullName = `${firstName} ${lastName || ''}`.trim()
      return <div className="font-medium">{fullName}</div>
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string | null
      return <div className="text-muted-foreground">{email || '-'}</div>
    },
  },
  {
    accessorKey: 'phone',
    header: 'Teléfono',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string | null
      return <div className="text-muted-foreground">{phone || '-'}</div>
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as CustomerStatus
      return (
        <Badge
          variant={statusVariants[status]}
          className={`block w-full text-center ${
            status === 'vip' ? 'bg-amber-500 hover:bg-amber-600' : ''
          }`}
        >
          {statusLabels[status]}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'total_visits',
    header: 'Visitas',
    cell: ({ row }) => {
      const visits = row.getValue('total_visits') as number
      return <div className="text-center">{visits}</div>
    },
  },
  {
    accessorKey: 'total_spent_cents',
    header: 'Total gastado',
    cell: ({ row }) => {
      const totalCents = row.getValue('total_spent_cents') as number
      return (
        <div className="text-right font-medium">
          {formatCurrency(totalCents / 100)}
        </div>
      )
    },
  },
  {
    accessorKey: 'source',
    header: 'Origen',
    cell: ({ row }) => {
      const source = row.getValue('source') as CustomerSource | null
      if (!source) return <div className="text-muted-foreground">-</div>
      return <Badge variant="outline">{sourceLabels[source]}</Badge>
    },
  },
  {
    accessorKey: 'last_visit_at',
    header: 'Última visita',
    cell: ({ row }) => {
      const date = row.getValue('last_visit_at') as string | null
      if (!date) return <div className="text-muted-foreground">-</div>
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
  },
]
