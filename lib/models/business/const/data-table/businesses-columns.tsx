import { Business } from '@/lib/models/business/business'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Mapeo de tipos de negocio a español
const businessTypeLabels: Record<string, string> = {
  SALON: 'Salón',
  INDEPENDENT: 'Independiente',
  BEAUTY_STUDIO: 'Estudio de Belleza',
}

export const BUSINESSES_COLUMNS: ColumnDef<Business>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      return <div className="font-medium">{name}</div>
    },
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      return <Badge variant="outline">{businessTypeLabels[type] || type}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
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
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string | null
      return <div className="text-muted-foreground">{email || '-'}</div>
    },
  },
  {
    accessorKey: 'address',
    header: 'Dirección',
    cell: ({ row }) => {
      const address = row.getValue('address') as string | null
      const city = row.original.city
      const state = row.original.state

      if (!address) return <div className="text-muted-foreground">-</div>

      const fullAddress = [address, city, state].filter(Boolean).join(', ')
      return (
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {fullAddress}
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
    // para tener acceso a los callbacks y permisos
  },
]
