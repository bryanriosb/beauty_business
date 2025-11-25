'use client'

import { DataTable, DataTableRef, SearchConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react'
import ServiceService from '@/lib/services/service/service-service'
import BusinessService from '@/lib/services/business/business-service'
import { SERVICES_COLUMNS } from '@/lib/models/service/const/data-table/services-columns'
import { ServiceModal } from '@/components/services/ServiceModal'
import { useRef, useMemo, useState, useEffect } from 'react'
import type {
  Service,
  ServiceInsert,
  ServiceUpdate,
  ServiceCategory,
} from '@/lib/models/service/service'
import type { Business } from '@/lib/models/business/business'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { hasPermission, USER_ROLES } from '@/const/roles'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

export default function ServicesPage() {
  const serviceService = useMemo(() => new ServiceService(), [])
  const businessService = useMemo(() => new BusinessService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const { role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const [servicesToDelete, setServicesToDelete] = useState<string[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    const loadData = async () => {
      try {
        const [businessesRes, categoriesRes] = await Promise.all([
          isCompanyAdmin
            ? businessService.fetchItems({ page_size: 100 })
            : Promise.resolve({ data: [] }),
          serviceService.fetchCategories(),
        ])
        setBusinesses(businessesRes.data)
        setCategories(categoriesRes)
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [businessService, serviceService, isCompanyAdmin])

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'name',
      placeholder: 'Buscar por nombre...',
      serverField: 'name',
    }),
    []
  )

  const handleCreateService = () => {
    setSelectedService(null)
    setModalOpen(true)
  }

  const handleEditService = (service: Service) => {
    setSelectedService(service)
    setModalOpen(true)
  }

  const handleDeleteService = (serviceId: string) => {
    setServiceToDelete(serviceId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!serviceToDelete) return

    try {
      await serviceService.destroyItem(serviceToDelete)
      toast.success('Servicio eliminado correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar el servicio')
    } finally {
      setDeleteDialogOpen(false)
      setServiceToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setServicesToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!servicesToDelete.length) return

    try {
      const result = await serviceService.destroyMany(servicesToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} servicio(s) eliminado(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar los servicios')
    } finally {
      setBatchDeleteDialogOpen(false)
      setServicesToDelete([])
    }
  }

  const handleSaveService = async (data: ServiceInsert | ServiceUpdate) => {
    try {
      if (selectedService) {
        const result = await serviceService.updateItem({
          id: selectedService.id,
          ...data,
        })
        if (result.success) {
          toast.success('Servicio actualizado correctamente')
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await serviceService.createItem(data as ServiceInsert)
        if (result.success) {
          toast.success('Servicio creado correctamente')
        } else {
          throw new Error(result.error)
        }
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar el servicio')
      throw error
    }
  }

  const columnsWithActions = useMemo(() => {
    return SERVICES_COLUMNS.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: any) => {
            const service = row.original
            const canEdit = role && hasPermission(role, 'canEditService')
            const canDelete = role && hasPermission(role, 'canDeleteService')

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
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => handleEditService(service)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteService(service.id)}
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
    })
  }, [role])

  const canCreateService = role && hasPermission(role, 'canCreateService')
  const canDeleteService = role && hasPermission(role, 'canDeleteService')

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Servicios
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los servicios ofrecidos
          </p>
        </div>
        {canCreateService && (
          <Button onClick={handleCreateService} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Crear Servicio
          </Button>
        )}
      </div>

      <DataTable
        key={isCompanyAdmin ? 'all' : activeBusiness?.id || 'no-business'}
        ref={dataTableRef}
        columns={columnsWithActions}
        service={serviceService}
        defaultQueryParams={
          !isCompanyAdmin && activeBusiness?.id
            ? { business_id: activeBusiness.id }
            : undefined
        }
        searchConfig={searchConfig}
        enableRowSelection={!!canDeleteService}
        onDeleteSelected={handleBatchDelete}
      />

      <ServiceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        service={selectedService}
        businesses={businesses}
        categories={categories}
        onSave={handleSaveService}
        isCompanyAdmin={isCompanyAdmin}
        currentBusinessId={activeBusiness?.id || null}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="servicio"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="servicio"
        count={servicesToDelete.length}
        variant="outline"
      />
    </div>
  )
}
