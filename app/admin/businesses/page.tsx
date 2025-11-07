'use client'

import { DataTable, DataTableRef, SearchConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import BusinessService from '@/lib/services/business/business-service'
import { BUSINESSES_COLUMNS } from '@/lib/models/business/const/data-table/businesses-columns'
import { useRef, useMemo } from 'react'
import { Plus } from 'lucide-react'

export default function BusinessesPage() {
  const businessService = useMemo(() => new BusinessService(), [])
  const dataTableRef = useRef<DataTableRef>(null)

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'name',
      placeholder: 'Buscar por nombre...',
      serverField: 'name',
    }),
    []
  )

  return (
    <div className="grid gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sucursales</h1>
          <p className="text-muted-foreground">
            Gestiona los negocios registrados en la plataforma
          </p>
        </div>
        <Button>
          <Plus size={20} />
          Crear Sucursal
        </Button>
      </div>

      <DataTable
        ref={dataTableRef}
        columns={BUSINESSES_COLUMNS}
        service={businessService}
        searchConfig={searchConfig}
      />
    </div>
  )
}
