'use client'

import {
  DataTable,
  DataTableRef,
  SearchConfig,
  FilterConfig,
} from '@/components/DataTable'
import type { LucideIcon } from 'lucide-react'
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
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import ProductService from '@/lib/services/product/product-service'
import BusinessService from '@/lib/services/business/business-service'
import { PRODUCTS_COLUMNS } from '@/lib/models/product/const/data-table/products-columns'
import { ProductModal } from '@/components/products/ProductModal'
import { useRef, useMemo, useState, useEffect } from 'react'
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  ProductCategory,
  UnitOfMeasure,
} from '@/lib/models/product'
import type { Business } from '@/lib/models/business/business'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { hasPermission, USER_ROLES } from '@/const/roles'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ProductsPage() {
  const productService = useMemo(() => new ProductService(), [])
  const businessService = useMemo(() => new BusinessService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const { role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [productsToDelete, setProductsToDelete] = useState<string[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [unitOfMeasures, setUnitOfMeasures] = useState<UnitOfMeasure[]>([])
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUPPLY' | 'RETAIL'>('ALL')

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    const loadData = async () => {
      try {
        const [businessesRes, categoriesRes, unitsRes] = await Promise.all([
          isCompanyAdmin
            ? businessService.fetchItems({ page_size: 100 })
            : Promise.resolve({ data: [] }),
          productService.fetchCategories(),
          productService.fetchUnitOfMeasures(),
        ])
        setBusinesses(businessesRes.data)
        setCategories(categoriesRes)
        setUnitOfMeasures(unitsRes)
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [businessService, productService, isCompanyAdmin])

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'name',
      placeholder: 'Buscar por nombre o SKU...',
      serverField: 'name',
    }),
    []
  )

  const filterConfigs: FilterConfig[] = useMemo(() => {
    const configs: FilterConfig[] = [
      {
        column: 'is_active',
        title: 'Estado',
        options: [
          {
            label: 'Activo',
            value: 'true',
            icon: CheckCircle,
          },
          {
            label: 'Inactivo',
            value: 'false',
            icon: XCircle,
          },
        ],
      },
    ]

    if (categories.length > 0) {
      configs.push({
        column: 'category_id',
        title: 'Categoría',
        options: categories.map((cat) => ({
          label: cat.name,
          value: cat.id,
        })),
      })
    }

    return configs
  }, [categories])

  const handleCreateProduct = () => {
    setSelectedProduct(null)
    setModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setModalOpen(true)
  }

  const handleDeleteProduct = (productId: string) => {
    setProductToDelete(productId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      await productService.destroyItem(productToDelete)
      toast.success('Producto eliminado correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar el producto')
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setProductsToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!productsToDelete.length) return

    try {
      const result = await productService.destroyMany(productsToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} producto(s) eliminado(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar los productos')
    } finally {
      setBatchDeleteDialogOpen(false)
      setProductsToDelete([])
    }
  }

  const handleSaveProduct = async (data: ProductInsert | ProductUpdate) => {
    try {
      if (selectedProduct) {
        const result = await productService.updateItem({
          id: selectedProduct.id,
          ...data,
        })
        if (result.success) {
          toast.success('Producto actualizado correctamente')
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await productService.createItem(data as ProductInsert)
        if (result.success) {
          toast.success('Producto creado correctamente')
        } else {
          throw new Error(result.error)
        }
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar el producto')
      throw error
    }
  }

  const columnsWithActions = useMemo(() => {
    return PRODUCTS_COLUMNS.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: any) => {
            const product = row.original
            const canEdit = role && hasPermission(role, 'canEditProduct')
            const canDelete = role && hasPermission(role, 'canDeleteProduct')

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
                      onClick={() => handleEditProduct(product)}
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
                        onClick={() => handleDeleteProduct(product.id)}
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

  const canCreateProduct = role && hasPermission(role, 'canCreateProduct')
  const canDeleteProduct = role && hasPermission(role, 'canDeleteProduct')

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {}
    if (!isCompanyAdmin && activeBusiness?.id) {
      params.business_id = activeBusiness.id
    }
    if (activeTab !== 'ALL') {
      params.type = activeTab
    }
    return Object.keys(params).length > 0 ? params : undefined
  }, [isCompanyAdmin, activeBusiness?.id, activeTab])

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Productos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los productos e insumos
          </p>
        </div>
        {canCreateProduct && (
          <Button onClick={handleCreateProduct} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Crear Producto
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'ALL' | 'SUPPLY' | 'RETAIL')}
      >
        <TabsList>
          <TabsTrigger value="ALL">Todos</TabsTrigger>
          <TabsTrigger value="SUPPLY">Insumos</TabsTrigger>
          <TabsTrigger value="RETAIL">Venta</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        key={`${
          isCompanyAdmin ? 'all' : activeBusiness?.id || 'no-business'
        }-${activeTab}`}
        ref={dataTableRef}
        columns={columnsWithActions}
        service={productService}
        defaultQueryParams={queryParams}
        searchConfig={searchConfig}
        filters={filterConfigs}
        enableRowSelection={!!canDeleteProduct}
        onDeleteSelected={handleBatchDelete}
      />

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={selectedProduct}
        businesses={businesses}
        categories={categories}
        unitOfMeasures={unitOfMeasures}
        onSave={handleSaveProduct}
        isCompanyAdmin={isCompanyAdmin}
        currentBusinessId={activeBusiness?.id || null}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="producto"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="producto"
        count={productsToDelete.length}
        variant="outline"
      />
    </div>
  )
}
