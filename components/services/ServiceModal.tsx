'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  CreatableCombobox,
  type ComboboxOption,
} from '@/components/ui/creatable-combobox'
import type {
  Service,
  ServiceInsert,
  ServiceUpdate,
  ServiceCategory,
} from '@/lib/models/service/service'
import type { Business } from '@/lib/models/business/business'
import type { ServiceType } from '@/lib/types/enums'
import { Loader2 } from 'lucide-react'
import {
  ServiceSuppliesSection,
  mapServiceSuppliesToItems,
  type SupplyItem,
} from '@/components/services/ServiceSuppliesSection'
import {
  fetchServiceSuppliesAction,
  updateServiceSuppliesAction,
} from '@/lib/actions/service-supply'
import { createServiceCategoryAction } from '@/lib/actions/service'
import { BusinessStorageService } from '@/lib/services/business/business-storage-service'
import { toast } from 'sonner'
import { NumericInput } from '../ui/numeric-input'
import Loading from '../ui/loading'

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'REGULAR', label: 'Servicio Regular' },
  { value: 'ASSESSMENT', label: 'Valoración' },
]

const formSchema = z.object({
  business_id: z.string().min(1, 'Selecciona una sucursal'),
  category_id: z.string().nullable().optional(),
  name: z.string().min(1, 'El nombre del servicio es requerido'),
  description: z.string().optional().or(z.literal('')),
  service_type: z.enum(['REGULAR', 'ASSESSMENT']),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  duration_minutes: z.number().min(1, 'La duración debe ser al menos 1 minuto'),
  is_featured: z.boolean(),
  image_url: z.string().optional().or(z.literal('')),
  has_tax: z.boolean(),
})

type ServiceFormValues = z.infer<typeof formSchema>

interface ServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: Service | null
  businesses: Business[]
  categories: ServiceCategory[]
  onSave: (data: ServiceInsert | ServiceUpdate) => Promise<void>
  onCategoryCreated?: (category: ServiceCategory) => void
  isCompanyAdmin?: boolean
  currentBusinessId?: string | null
}

export function ServiceModal({
  open,
  onOpenChange,
  service,
  businesses,
  categories,
  onSave,
  onCategoryCreated,
  isCompanyAdmin = false,
  currentBusinessId,
}: ServiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storageService] = useState(() => new BusinessStorageService())
  const [supplies, setSupplies] = useState<SupplyItem[]>([])
  const [loadingSupplies, setLoadingSupplies] = useState(false)
  const isEdit = !!service

  const categoryOptions: ComboboxOption[] = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }))

  const handleCreateCategory = async (
    name: string
  ): Promise<{ value: string; label: string } | null> => {
    const result = await createServiceCategoryAction(name)
    if (result.success && result.data) {
      toast.success(`Categoría "${result.data.name}" creada`)
      onCategoryCreated?.(result.data)
      return { value: result.data.id, label: result.data.name }
    }
    toast.error(result.error || 'Error al crear la categoría')
    return null
  }

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_id: '',
      category_id: null,
      name: '',
      description: '',
      service_type: 'REGULAR',
      price: 0,
      duration_minutes: 30,
      is_featured: false,
      image_url: '',
      has_tax: true,
    },
  })

  useEffect(() => {
    if (service) {
      form.reset({
        business_id: service.business_id,
        category_id: service.category_id,
        name: service.name,
        description: service.description || '',
        service_type: service.service_type || 'REGULAR',
        price: service.price_cents / 100,
        duration_minutes: service.duration_minutes,
        is_featured: service.is_featured,
        image_url: service.image_url || '',
        has_tax: service.tax_rate !== null && service.tax_rate > 0,
      })
      // Cargar insumos del servicio
      const loadSupplies = async () => {
        setLoadingSupplies(true)
        try {
          const serviceSupplies = await fetchServiceSuppliesAction(service.id)
          setSupplies(mapServiceSuppliesToItems(serviceSupplies))
        } catch (error) {
          console.error('Error loading supplies:', error)
        } finally {
          setLoadingSupplies(false)
        }
      }
      loadSupplies()
    } else {
      const defaultBusinessId = isCompanyAdmin
        ? businesses.length === 1
          ? businesses[0].id
          : ''
        : currentBusinessId || ''
      form.reset({
        business_id: defaultBusinessId,
        category_id: null,
        name: '',
        description: '',
        service_type: 'REGULAR',
        price: 0,
        duration_minutes: 30,
        is_featured: false,
        image_url: '',
        has_tax: true,
      })
      setSupplies([])
    }
  }, [service, form, businesses, isCompanyAdmin, currentBusinessId])

  const businessId = form.watch('business_id')

  const handleImageUpload = useCallback(
    async (file: File) => {
      const targetBusinessId = businessId || currentBusinessId
      if (!targetBusinessId) {
        toast.error('Selecciona una sucursal antes de subir la imagen')
        return { success: false, error: 'No hay sucursal seleccionada' }
      }
      const result = await storageService.uploadServiceImage(
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

  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true)
    try {
      const payload: ServiceInsert | ServiceUpdate = {
        business_id: data.business_id,
        category_id: data.category_id || null,
        name: data.name,
        description: data.description || null,
        service_type: data.service_type,
        price_cents: Math.round(data.price * 100),
        duration_minutes: data.duration_minutes,
        is_featured: data.is_featured,
        image_url: data.image_url || null,
        tax_rate: data.has_tax ? 19 : null,
      }
      await onSave(payload)

      // Guardar supplies si es edición
      if (service) {
        const suppliesData = supplies.map((s) => ({
          product_id: s.product_id,
          default_quantity: s.default_quantity,
          is_required: s.is_required,
        }))
        await updateServiceSuppliesAction(service.id, suppliesData)
      }

      onOpenChange(false)
      form.reset()
      setSupplies([])
    } catch (error) {
      console.error('Error saving service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Servicio' : 'Crear Servicio'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información del servicio'
              : 'Ingresa los datos del nuevo servicio'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col min-h-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
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
                          placeholder="Corte de cabello"
                          disabled={isSubmitting}
                          data-tutorial="service-name-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tipo de servicio{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="w-full"
                            data-tutorial="service-type-input"
                          >
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          placeholder="Descripción del servicio..."
                          rows={2}
                          disabled={isSubmitting}
                          data-tutorial="service-description-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          placeholder="Seleccionar categoría..."
                          searchPlaceholder="Buscar o crear categoría..."
                          emptyText="No hay categorías"
                          createText="Crear categoría"
                          disabled={isSubmitting}
                          allowClear
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Precio (COP){' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <NumericInput
                            className="w-full"
                            placeholder="50000"
                            disabled={isSubmitting}
                            data-tutorial="service-price-input"
                            value={field.value}
                            onChange={(value) => field.onChange(value || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Duración (min){' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <NumericInput
                            type="number"
                            min={10}
                            placeholder="30"
                            disabled={isSubmitting}
                            data-tutorial="service-duration-input"
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
                  name="has_tax"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>
                          Aplica IVA <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {field.value
                            ? 'Este servicio tiene IVA del 19%'
                            : 'Este servicio está exento de IVA'}
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

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen del servicio</FormLabel>
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

                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Destacado</FormLabel>
                        <FormDescription className="text-xs">
                          Los servicios destacados aparecen primero
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

                {isEdit && (
                  <div className="pt-2 border-t">
                    <ServiceSuppliesSection
                      businessId={businessId || currentBusinessId || ''}
                      supplies={supplies}
                      onChange={setSupplies}
                      disabled={isSubmitting || loadingSupplies}
                    />
                    {supplies.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        El precio base del servicio puede ser 0 si se cobra por
                        insumos
                      </p>
                    )}
                  </div>
                )}
                {!isEdit && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Guarda el servicio primero para poder agregar insumos
                    asociados
                  </p>
                )}
              </div>

              <DialogFooter className="shrink-0 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-tutorial="save-service-button"
                >
                  {isSubmitting && <Loading />}
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
