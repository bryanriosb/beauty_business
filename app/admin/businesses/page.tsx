'use client'

import { DataTable, DataTableRef, SearchConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import BusinessService from '@/lib/services/business/business-service'
import { BUSINESSES_COLUMNS } from '@/lib/models/business/const/data-table/businesses-columns'
import { useRef, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function BusinessesPage() {
  const { user, role } = useCurrentUser()
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

  // Determinar si debe filtrar por cuenta
  // Solo business_admin y business_monitor (employee) ven negocios de su cuenta
  const shouldFilterByAccount = role === 'business_admin' || role === 'business_monitor'
  const businessAccountId = shouldFilterByAccount ? user?.business_account_id : undefined

  // Parámetros adicionales para el servicio
  const serviceParams = useMemo(() => {
    return businessAccountId ? { business_account_id: businessAccountId } : {}
  }, [businessAccountId])

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
        defaultQueryParams={serviceParams}
      />
    </div>
  )
}
