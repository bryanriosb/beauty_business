'use client'

import { DataTable, DataTableRef, SearchConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import BusinessService from '@/lib/services/business/business-service'
import { BUSINESSES_COLUMNS } from '@/lib/models/business/const/data-table/businesses-columns'
import { BusinessModal } from '@/components/businesses/BusinessModal'
import { BusinessDetailModal } from '@/components/businesses/BusinessDetailModal'
import { useRef, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import type { BusinessWithAccount, BusinessInsert, BusinessUpdate } from '@/lib/models/business/business'

export default function BusinessesPage() {
  const { user, role, isLoading } = useCurrentUser()
  const businessService = useMemo(() => new BusinessService(), [])
  const dataTableRef = useRef<DataTableRef>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithAccount | null>(null)
  const [selectedBusinessForDetail, setSelectedBusinessForDetail] = useState<BusinessWithAccount | null>(null)
  const [businessToDelete, setBusinessToDelete] = useState<string | null>(null)
  const [businessesToDelete, setBusinessesToDelete] = useState<string[]>([])

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'name',
      placeholder: 'Buscar...',
      serverField: 'name',
    }),
    []
  )

  // Determinar si debe filtrar por cuenta
  // Solo business_admin y business_monitor (employee) ven negocios de su cuenta
  const shouldFilterByAccount =
    role === 'business_admin' || role === 'business_monitor'

  // Parámetros adicionales para el servicio
  const serviceParams = useMemo(() => {
    // Si debe filtrar por cuenta pero el usuario aún no está cargado, no retornar nada
    if (shouldFilterByAccount && !user?.business_account_id) {
      return null
    }

    // Si debe filtrar, incluir el business_account_id
    if (shouldFilterByAccount && user?.business_account_id) {
      return { business_account_id: user.business_account_id }
    }

    // Si es company_admin, no filtrar
    return {}
  }, [shouldFilterByAccount, user?.business_account_id])

  // Evitar renderizar DataTable hasta que el usuario esté cargado y los params estén listos
  const isReady = !isLoading && serviceParams !== null

  const isCompanyAdmin = role === 'company_admin'
  const isBusinessAdmin = role === 'business_admin'
  const canCreate = isCompanyAdmin // Solo company_admin puede crear
  const canEdit = isCompanyAdmin || isBusinessAdmin
  const canDelete = isCompanyAdmin

  const handleCreateBusiness = () => {
    setSelectedBusiness(null)
    setModalOpen(true)
  }

  const handleEditBusiness = (business: BusinessWithAccount) => {
    setSelectedBusiness(business)
    setModalOpen(true)
  }

  const handleViewDetail = (business: BusinessWithAccount) => {
    setSelectedBusinessForDetail(business)
    setDetailModalOpen(true)
  }

  const handleDeleteBusiness = (businessId: string) => {
    setBusinessToDelete(businessId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!businessToDelete) return

    try {
      await businessService.destroyItem(businessToDelete)
      toast.success('Sucursal eliminada correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la sucursal')
    } finally {
      setDeleteDialogOpen(false)
      setBusinessToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setBusinessesToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!businessesToDelete.length) return

    try {
      const result = await businessService.destroyMany(businessesToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} sucursal(es) eliminada(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar las sucursales')
    } finally {
      setBatchDeleteDialogOpen(false)
      setBusinessesToDelete([])
    }
  }

  const handleSaveBusiness = async (data: BusinessInsert | BusinessUpdate) => {
    try {
      if (selectedBusiness) {
        await businessService.updateItem({
          id: selectedBusiness.id,
          ...(data as BusinessUpdate)
        })
        toast.success('Sucursal actualizada correctamente')
      } else {
        // Solo company_admin puede crear sucursales
        await businessService.createItem(data as BusinessInsert)
        toast.success('Sucursal creada correctamente')
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar la sucursal')
      throw error
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Sucursales
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los negocios registrados en la plataforma
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto" onClick={handleCreateBusiness}>
            <Plus size={20} />
            Crear Sucursal
          </Button>
        )}
      </div>

      <DataTable
        key={isReady ? (shouldFilterByAccount ? user?.business_account_id : 'company-admin') : 'loading'}
        ref={dataTableRef}
        columns={BUSINESSES_COLUMNS.map((col) => {
          if (col.id === 'actions') {
            return {
              ...col,
              cell: ({ row }: any) => {
                const business = row.original

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
                      <DropdownMenuItem
                        onClick={() => handleViewDetail(business)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalle
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => handleEditBusiness(business)}
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
                            onClick={() => handleDeleteBusiness(business.id)}
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
        service={businessService}
        searchConfig={searchConfig}
        defaultQueryParams={serviceParams || {}}
        enableRowSelection={canDelete}
        onDeleteSelected={handleBatchDelete}
      />

      <BusinessModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        business={selectedBusiness}
        onSave={handleSaveBusiness}
      />

      <BusinessDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        business={selectedBusinessForDetail}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="sucursal"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="sucursal"
        count={businessesToDelete.length}
        variant="outline"
      />
    </div>
  )
}
