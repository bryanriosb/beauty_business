import { Business } from '@/lib/models/business/business'
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
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Mapeo de tipos de negocio a español
const businessTypeLabels: Record<string, string> = {
  salon: 'Salón',
  spa: 'Spa',
  barbershop: 'Barbería',
  nail_salon: 'Salón de Uñas',
  beauty_center: 'Centro de Belleza',
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
      return (
        <Badge variant="outline">
          {businessTypeLabels[type] || type}
        </Badge>
      )
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
      return <div className="text-sm text-muted-foreground max-w-xs truncate">{fullAddress}</div>
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
    cell: ({ row }) => {
      const business = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                console.log('Ver detalles:', business.id)
                // TODO: Implementar navegación a detalles
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log('Editar:', business.id)
                // TODO: Implementar modal de edición
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                console.log('Eliminar:', business.id)
                // TODO: Implementar confirmación y eliminación
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
