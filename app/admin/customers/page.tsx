'use client'

import { DataTable, DataTableRef, SearchConfig, FilterConfig, ExportConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  UserCheck,
  UserX,
  Crown,
  Ban,
  Store,
  Users,
  Share2,
  Globe,
  HelpCircle,
} from 'lucide-react'
import BusinessCustomerService from '@/lib/services/customer/business-customer-service'
import { CUSTOMERS_COLUMNS } from '@/lib/models/customer/const/data-table/customers-columns'
import { CustomerModal } from '@/components/customers/CustomerModal'
import { useRef, useMemo, useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toast } from 'sonner'
import type {
  BusinessCustomer,
  BusinessCustomerUpdate,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'
import { GenericImportExportButtons } from '@/components/GenericImportExportButtons'
import { importCustomersWithProgress } from '@/lib/actions/customer-import-export'

export default function CustomersPage() {
  const { role, isLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const customerService = useMemo(() => new BusinessCustomerService(), [])
  const dataTableRef = useRef<DataTableRef>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<BusinessCustomer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [customersToDelete, setCustomersToDelete] = useState<string[]>([])

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'first_name',
      placeholder: 'Buscar cliente...',
      serverField: 'search',
    }),
    []
  )

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        column: 'status',
        title: 'Estado',
        options: [
          { label: 'Activo', value: 'active', icon: UserCheck },
          { label: 'Inactivo', value: 'inactive', icon: UserX },
          { label: 'VIP', value: 'vip', icon: Crown },
          { label: 'Bloqueado', value: 'blocked', icon: Ban },
        ],
      },
      {
        column: 'source',
        title: 'Origen',
        options: [
          { label: 'Presencial', value: 'walk_in', icon: Store },
          { label: 'Referido', value: 'referral', icon: Users },
          { label: 'Redes sociales', value: 'social_media', icon: Share2 },
          { label: 'Sitio web', value: 'website', icon: Globe },
          { label: 'Otro', value: 'other', icon: HelpCircle },
        ],
      },
    ],
    []
  )

  const activeBusinessId = activeBusiness?.id

  const serviceParams = useMemo(() => {
    if (!activeBusinessId) return null
    return { business_id: activeBusinessId }
  }, [activeBusinessId])

  const isReady = !isLoading && serviceParams !== null

  const exportConfig: ExportConfig | null = useMemo(() => {
    if (!activeBusinessId) return null

    return {
      enabled: true,
      tableName: 'clientes',
      businessId: activeBusinessId,
      excludedColumns: ['actions'],
      columnFormatters: {
        first_name: (value: string, row?: any) => {
          if (row) {
            return `${row.first_name || ''} ${row.last_name || ''}`.trim()
          }
          return value || ''
        },
        status: (value: string) => {
          const statusLabels: Record<string, string> = {
            active: 'Activo',
            inactive: 'Inactivo',
            vip: 'VIP',
            blocked: 'Bloqueado',
          }
          return statusLabels[value] || value
        },
        source: (value: string) => {
          const sourceLabels: Record<string, string> = {
            walk_in: 'Presencial',
            referral: 'Referido',
            social_media: 'Redes sociales',
            website: 'Sitio web',
            ai_agent: 'Asistente IA',
            other: 'Otro',
          }
          return sourceLabels[value] || value || '-'
        },
        total_spent_cents: (value: number) => {
          if (!value) return '$0'
          return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(value / 100)
        },
        last_visit_at: (value: string) => {
          if (!value) return '-'
          return new Date(value).toLocaleDateString('es-CO')
        },
        email: (value: string) => value || '-',
        phone: (value: string) => value || '-',
      },
    }
  }, [activeBusinessId])

  const isCompanyAdmin = role === 'company_admin'
  const isBusinessAdmin = role === 'business_admin'
  const canCreate = isCompanyAdmin || isBusinessAdmin
  const canEdit = isCompanyAdmin || isBusinessAdmin
  const canDelete = isCompanyAdmin || isBusinessAdmin

  const handleCreateCustomer = () => {
    setSelectedCustomer(null)
    setModalOpen(true)
  }

  const handleEditCustomer = (customer: BusinessCustomer) => {
    setSelectedCustomer(customer)
    setModalOpen(true)
  }

  const handleDeleteCustomer = (customerId: string) => {
    setCustomerToDelete(customerId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!customerToDelete) return

    try {
      await customerService.destroyItem(customerToDelete)
      toast.success('Cliente eliminado correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar el cliente')
    } finally {
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setCustomersToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!customersToDelete.length) return

    try {
      const result = await customerService.destroyMany(customersToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} cliente(s) eliminado(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar los clientes')
    } finally {
      setBatchDeleteDialogOpen(false)
      setCustomersToDelete([])
    }
  }

  const handleSaveCustomer = async (
    data: CreateCustomerInput | BusinessCustomerUpdate,
    customerId?: string
  ) => {
    try {
      if (customerId) {
        const result = await customerService.updateItem(customerId, data as BusinessCustomerUpdate)
        if (!result.success) throw new Error(result.error)
        toast.success('Cliente actualizado correctamente')
      } else {
        const result = await customerService.createFullCustomer(data as CreateCustomerInput)
        if (!result.success) throw new Error(result.error)
        if (result.isNew) {
          toast.success('Cliente creado correctamente')
        } else {
          toast.info('Cliente existente encontrado')
        }
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar el cliente')
      throw error
    }
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver los clientes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los clientes de tu negocio
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {canCreate && (
            <Button className="w-full sm:w-auto" onClick={handleCreateCustomer}>
              <Plus size={20} />
              Nuevo Cliente
            </Button>
          )}
          {activeBusiness?.id && (
            <GenericImportExportButtons
              config={{
                entityType: 'customers',
                displayName: 'Clientes',
                templateDownloadUrl: '/api/customers/download-template',
                importAction: importCustomersWithProgress,
              }}
              additionalFormData={{ businessId: activeBusiness.id }}
              onImportComplete={() => dataTableRef.current?.refreshData()}
            />
          )}
        </div>
      </div>

      {isReady && (
        <DataTable
          key={activeBusinessId}
          ref={dataTableRef}
          columns={CUSTOMERS_COLUMNS.map((col) => {
            if (col.id === 'actions') {
              return {
                ...col,
                cell: ({ row }: any) => {
                  const customer = row.original

                  if (!canEdit && !canDelete) return null

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                },
              }
            }
            return col
          })}
          service={customerService}
          searchConfig={searchConfig}
          filters={filterConfigs}
          exportConfig={exportConfig || undefined}
          defaultQueryParams={serviceParams || {}}
          enableRowSelection={canDelete}
          onDeleteSelected={handleBatchDelete}
        />
      )}

      <CustomerModal
        businessId={activeBusinessId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="cliente"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="cliente"
        count={customersToDelete.length}
        variant="outline"
      />
    </div>
  )
}
