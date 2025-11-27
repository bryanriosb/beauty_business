'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, DataTableRef } from '@/components/DataTable'
import { Plus, Package, AlertTriangle, ArrowUpDown, TrendingDown } from 'lucide-react'
import { InventoryMovementModal } from '@/components/inventory/InventoryMovementModal'
import { inventoryMovementColumns } from '@/lib/models/product/const/data-table/inventory-columns'
import { inventoryService, InventoryService } from '@/lib/services/product/inventory-service'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import type { InventoryMovementType } from '@/lib/types/enums'
import type { InventoryMovementWithProduct } from '@/lib/models/product'

const movementTypeFilters: { value: InventoryMovementType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ENTRY', label: 'Entradas' },
  { value: 'CONSUMPTION', label: 'Consumos' },
  { value: 'SALE', label: 'Ventas' },
  { value: 'ADJUSTMENT', label: 'Ajustes' },
  { value: 'WASTE', label: 'Mermas' },
  { value: 'TRANSFER', label: 'Transferencias' },
]

// Create a service wrapper for DataTable compatibility
class InventoryMovementService {
  async fetchItems(params?: any) {
    return inventoryService.fetchMovements(params)
  }
}

export default function InventoryPage() {
  const dataTableRef = useRef<DataTableRef>(null)
  const movementService = useMemo(() => new InventoryMovementService(), [])
  const { role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<InventoryMovementType | 'ALL'>('ALL')
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'movements' | 'alerts'>('movements')
  const [stats, setStats] = useState({ activeProducts: 0, movementsThisMonth: 0 })

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const businessId = activeBusiness?.id || ''

  const loadData = useCallback(async () => {
    if (!businessId) return
    const [lowStockResult, statsResult] = await Promise.all([
      inventoryService.getLowStockProducts(businessId),
      inventoryService.getStats(businessId),
    ])
    setLowStockProducts(lowStockResult.data)
    setLowStockCount(lowStockResult.count)
    setStats(statsResult)
  }, [businessId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleNewMovement = () => {
    setModalOpen(true)
  }

  const handleMovementSuccess = () => {
    dataTableRef.current?.refreshData()
    loadData()
  }

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {}
    if (businessId) {
      params.business_id = businessId
    }
    if (typeFilter !== 'ALL') {
      params.movement_type = typeFilter
    }
    return Object.keys(params).length > 0 ? params : undefined
  }, [businessId, typeFilter])

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Inventario
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Controla el stock y movimientos de productos
          </p>
        </div>
        <Button onClick={handleNewMovement} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <p className="text-xs text-muted-foreground">Total activos</p>
          </CardContent>
        </Card>
        <Card
          className={lowStockCount > 0 ? 'border-amber-500' : ''}
          onClick={() => lowStockCount > 0 && setActiveTab('alerts')}
          style={{ cursor: lowStockCount > 0 ? 'pointer' : 'default' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${lowStockCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : ''}`}>
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">Productos bajo mínimo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.movementsThisMonth}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'movements' | 'alerts')}>
        <TabsList>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alertas
            {lowStockCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {lowStockCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'movements' && (
        <>
          <div className="flex items-center gap-4">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as InventoryMovementType | 'ALL')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                {movementTypeFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            key={`${businessId}-${typeFilter}`}
            ref={dataTableRef}
            columns={inventoryMovementColumns}
            service={movementService}
            defaultQueryParams={queryParams}
          />
        </>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {lowStockProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Sin alertas</p>
                <p className="text-sm text-muted-foreground">
                  Todos los productos tienen stock suficiente
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {lowStockProducts.map((product) => (
                <Card key={product.id} className="border-amber-200 bg-amber-50/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">
                        {product.current_stock}{' '}
                        <span className="text-sm font-normal">
                          {product.unit_of_measure?.abbreviation || 'und'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {product.min_stock}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setModalOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Entrada
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <InventoryMovementModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        businessId={businessId}
        onSuccess={handleMovementSuccess}
      />
    </div>
  )
}
