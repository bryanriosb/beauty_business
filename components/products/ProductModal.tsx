'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ImageUpload } from '@/components/ui/image-upload'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreatableCombobox } from '@/components/ui/creatable-combobox'
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  ProductCategory,
  UnitOfMeasure,
} from '@/lib/models/product'
import type { Business } from '@/lib/models/business/business'
import { Loader2, Package, Syringe } from 'lucide-react'
import { BusinessStorageService } from '@/lib/services/business/business-storage-service'
import { toast } from 'sonner'
import {
  createProductCategoryAction,
  createUnitOfMeasureAction,
} from '@/lib/actions/product-category'

const formSchema = z.object({
  business_id: z.string().min(1, 'Selecciona una sucursal'),
  category_id: z.string().nullable().optional(),
  unit_of_measure_id: z.string().nullable().optional(),
  name: z.string().min(1, 'El nombre del producto es requerido'),
  description: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().or(z.literal('')),
  type: z.enum(['SUPPLY', 'RETAIL']),
  cost_price: z.number().min(0, 'El costo debe ser mayor o igual a 0'),
  sale_price: z
    .number()
    .min(0, 'El precio de venta debe ser mayor o igual a 0'),
  current_stock: z.number().min(0, 'El stock debe ser mayor o igual a 0'),
  min_stock: z.number().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  max_stock: z.number().nullable().optional(),
  is_active: z.boolean(),
  image_url: z.string().optional().or(z.literal('')),
})

type ProductFormValues = z.infer<typeof formSchema>

interface ProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  businesses: Business[]
  categories: ProductCategory[]
  unitOfMeasures: UnitOfMeasure[]
  onSave: (data: ProductInsert | ProductUpdate) => Promise<void>
  isCompanyAdmin?: boolean
  currentBusinessId?: string | null
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  businesses,
  categories,
  unitOfMeasures,
  onSave,
  isCompanyAdmin = false,
  currentBusinessId,
}: ProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storageService] = useState(() => new BusinessStorageService())
  const [localCategories, setLocalCategories] =
    useState<ProductCategory[]>(categories)
  const [localUnits, setLocalUnits] = useState<UnitOfMeasure[]>(unitOfMeasures)
  const isEdit = !!product

  // Sync local state with props
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  useEffect(() => {
    setLocalUnits(unitOfMeasures)
  }, [unitOfMeasures])

  const categoryOptions = useMemo(
    () =>
      localCategories.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })),
    [localCategories]
  )

  const unitOptions = useMemo(
    () =>
      localUnits.map((unit) => ({
        value: unit.id,
        label: unit.name,
        description: unit.abbreviation,
      })),
    [localUnits]
  )

  const handleCreateCategory = async (name: string) => {
    const result = await createProductCategoryAction(name)
    if (result.success && result.data) {
      setLocalCategories((prev) => [...prev, result.data!])
      toast.success(`Categoría "${name}" creada`)
      return { value: result.data.id, label: result.data.name }
    } else {
      toast.error(result.error || 'Error al crear categoría')
      return null
    }
  }

  const handleCreateUnit = async (name: string) => {
    // Generate abbreviation from first 3 chars
    const abbreviation = name.substring(0, 3).toLowerCase()
    const result = await createUnitOfMeasureAction(name, abbreviation)
    if (result.success && result.data) {
      setLocalUnits((prev) => [...prev, result.data!])
      toast.success(`Unidad "${name}" creada`)
      return { value: result.data.id, label: result.data.name }
    } else {
      toast.error(result.error || 'Error al crear unidad')
      return null
    }
  }

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_id: '',
      category_id: null,
      unit_of_measure_id: null,
      name: '',
      description: '',
      sku: '',
      barcode: '',
      type: 'RETAIL',
      cost_price: 0,
      sale_price: 0,
      current_stock: 0,
      min_stock: 0,
      max_stock: null,
      is_active: true,
      image_url: '',
    },
  })

  const productType = form.watch('type')

  useEffect(() => {
    if (product) {
      form.reset({
        business_id: product.business_id,
        category_id: product.category_id,
        unit_of_measure_id: product.unit_of_measure_id,
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        type: product.type,
        cost_price: product.cost_price_cents / 100,
        sale_price: product.sale_price_cents / 100,
        current_stock: product.current_stock,
        min_stock: product.min_stock,
        max_stock: product.max_stock,
        is_active: product.is_active,
        image_url: product.image_url || '',
      })
    } else {
      const defaultBusinessId = isCompanyAdmin
        ? businesses.length === 1
          ? businesses[0].id
          : ''
        : currentBusinessId || ''
      form.reset({
        business_id: defaultBusinessId,
        category_id: null,
        unit_of_measure_id: null,
        name: '',
        description: '',
        sku: '',
        barcode: '',
        type: 'RETAIL',
        cost_price: 0,
        sale_price: 0,
        current_stock: 0,
        min_stock: 0,
        max_stock: null,
        is_active: true,
        image_url: '',
      })
    }
  }, [product, form, businesses, isCompanyAdmin, currentBusinessId])

  const businessId = form.watch('business_id')

  const handleImageUpload = useCallback(
    async (file: File) => {
      const targetBusinessId = businessId || currentBusinessId
      if (!targetBusinessId) {
        toast.error('Selecciona una sucursal antes de subir la imagen')
        return { success: false, error: 'No hay sucursal seleccionada' }
      }
      const result = await storageService.uploadProductImage(
        file,
        targetBusinessId
      )
      if (!result.success) {
        toast.error(result.error || 'Error al subir la imagen')
      }
      return result
    },
    [businessId, currentBusinessId, storageService]
  )

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true)
    try {
      const payload: ProductInsert | ProductUpdate = {
        business_id: data.business_id,
        category_id: data.category_id || null,
        unit_of_measure_id: data.unit_of_measure_id || null,
        name: data.name,
        description: data.description || null,
        sku: data.sku || null,
        barcode: data.barcode || null,
        type: data.type,
        cost_price_cents: Math.round(data.cost_price * 100),
        sale_price_cents: Math.round(data.sale_price * 100),
        current_stock: data.current_stock,
        min_stock: data.min_stock,
        max_stock: data.max_stock,
        is_active: data.is_active,
        image_url: data.image_url || null,
      }
      await onSave(payload)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Producto' : 'Crear Producto'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información del producto'
              : 'Ingresa los datos del nuevo producto'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col min-h-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Producto</FormLabel>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            field.value === 'RETAIL' ? 'default' : 'outline'
                          }
                          className="flex-1"
                          onClick={() => field.onChange('RETAIL')}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Venta
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === 'SUPPLY' ? 'default' : 'outline'
                          }
                          className="flex-1"
                          onClick={() => field.onChange('SUPPLY')}
                        >
                          <Syringe className="mr-2 h-4 w-4" />
                          Insumo
                        </Button>
                      </div>
                      <FormDescription>
                        {field.value === 'SUPPLY'
                          ? 'Los insumos se usan en servicios y se cobran por cantidad'
                          : 'Los productos de venta se venden directamente al cliente'}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {isCompanyAdmin && (
                  <FormField
                    control={form.control}
                    name="business_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Sucursal <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona una sucursal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businesses.map((business) => (
                              <SelectItem key={business.id} value={business.id}>
                                {business.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="precios">Precios</TabsTrigger>
                    <TabsTrigger value="inventario">Inventario</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Nombre <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nombre del producto"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descripción del producto..."
                              rows={2}
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <FormControl>
                              <CreatableCombobox
                                options={categoryOptions}
                                value={field.value || null}
                                onChange={field.onChange}
                                onCreateNew={handleCreateCategory}
                                placeholder="Sin categoría"
                                searchPlaceholder="Crear o buscar categoría..."
                                emptyText="No hay categorías"
                                createText="Crear categoría"
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unit_of_measure_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidad de Medida</FormLabel>
                            <FormControl>
                              <CreatableCombobox
                                options={unitOptions}
                                value={field.value || null}
                                onChange={field.onChange}
                                onCreateNew={handleCreateUnit}
                                placeholder="Sin unidad"
                                searchPlaceholder="Crear o Buscar unidad..."
                                emptyText="No hay unidades"
                                createText="Crear unidad"
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Código único"
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código de Barras</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Código de barras"
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Imagen del producto</FormLabel>
                          <FormControl>
                            <ImageUpload
                              value={field.value || null}
                              onChange={(url) => field.onChange(url || '')}
                              onUpload={handleImageUpload}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="precios" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="cost_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {productType === 'SUPPLY'
                              ? 'Precio por Unidad (COP)'
                              : 'Precio de Costo (COP)'}
                            <span className="text-destructive"> *</span>
                          </FormLabel>
                          <FormControl>
                            <NumericInput
                              min={0}
                              placeholder="0"
                              disabled={isSubmitting}
                              value={field.value}
                              onChange={(val) => field.onChange(val ?? 0)}
                              allowDecimals={false}
                            />
                          </FormControl>
                          {productType === 'SUPPLY' && (
                            <FormDescription>
                              Este precio se usará para calcular el costo de los
                              servicios que usen este insumo
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {productType === 'RETAIL' && (
                      <FormField
                        control={form.control}
                        name="sale_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Precio de Venta (COP)
                              <span className="text-destructive"> *</span>
                            </FormLabel>
                            <FormControl>
                              <NumericInput
                                min={0}
                                placeholder="0"
                                disabled={isSubmitting}
                                value={field.value}
                                onChange={(val) => field.onChange(val ?? 0)}
                                allowDecimals={false}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="inventario" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="current_stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Actual</FormLabel>
                          <FormControl>
                            <NumericInput
                              min={0}
                              placeholder="0"
                              disabled={isSubmitting || isEdit}
                              value={field.value}
                              onChange={(val) => field.onChange(val ?? 0)}
                              allowDecimals={true}
                              decimalPlaces={2}
                            />
                          </FormControl>
                          {isEdit && (
                            <FormDescription>
                              El stock se modifica desde movimientos de
                              inventario
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="min_stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Mínimo</FormLabel>
                            <FormControl>
                              <NumericInput
                                min={0}
                                placeholder="0"
                                disabled={isSubmitting}
                                value={field.value}
                                onChange={(val) => field.onChange(val ?? 0)}
                                allowDecimals={true}
                                decimalPlaces={2}
                              />
                            </FormControl>
                            <FormDescription>
                              Alerta cuando el stock esté bajo
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Máximo</FormLabel>
                            <FormControl>
                              <NumericInput
                                min={0}
                                placeholder="Sin límite"
                                disabled={isSubmitting}
                                value={field.value}
                                onChange={(val) => field.onChange(val)}
                                allowDecimals={true}
                                decimalPlaces={2}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Producto Activo</FormLabel>
                            <FormDescription className="text-xs">
                              Los productos inactivos no aparecen en las
                              búsquedas
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
