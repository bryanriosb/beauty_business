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
import type {
  Service,
  ServiceInsert,
  ServiceUpdate,
  ServiceCategory,
} from '@/lib/models/service/service'
import type { Business } from '@/lib/models/business/business'
import { Loader2 } from 'lucide-react'
import { BusinessStorageService } from '@/lib/services/business/business-storage-service'
import { toast } from 'sonner'

const categoryLabels: Record<string, string> = {
  nails: 'Uñas',
  haircut: 'Corte de cabello',
  coloring: 'Coloración',
  facial: 'Tratamiento facial',
  makeup: 'Maquillaje',
  waxing: 'Depilación',
  massage: 'Masajes',
  spa: 'Spa',
}

const formSchema = z.object({
  business_id: z.string().min(1, 'Selecciona una sucursal'),
  category_id: z.string().nullable().optional(),
  name: z.string().min(1, 'El nombre del servicio es requerido'),
  description: z.string().optional().or(z.literal('')),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  duration_minutes: z.number().min(1, 'La duración debe ser al menos 1 minuto'),
  is_featured: z.boolean(),
  image_url: z.string().optional().or(z.literal('')),
})

type ServiceFormValues = z.infer<typeof formSchema>

interface ServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: Service | null
  businesses: Business[]
  categories: ServiceCategory[]
  onSave: (data: ServiceInsert | ServiceUpdate) => Promise<void>
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
  isCompanyAdmin = false,
  currentBusinessId,
}: ServiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storageService] = useState(() => new BusinessStorageService())
  const isEdit = !!service

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_id: '',
      category_id: null,
      name: '',
      description: '',
      price: 0,
      duration_minutes: 30,
      is_featured: false,
      image_url: '',
    },
  })

  useEffect(() => {
    if (service) {
      form.reset({
        business_id: service.business_id,
        category_id: service.category_id,
        name: service.name,
        description: service.description || '',
        price: service.price_cents / 100,
        duration_minutes: service.duration_minutes,
        is_featured: service.is_featured,
        image_url: service.image_url || '',
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
        name: '',
        description: '',
        price: 0,
        duration_minutes: 30,
        is_featured: false,
        image_url: '',
      })
    }
  }, [service, form, businesses, isCompanyAdmin, currentBusinessId])

  const businessId = form.watch('business_id')

  const handleImageUpload = useCallback(async (file: File) => {
    const targetBusinessId = businessId || currentBusinessId
    if (!targetBusinessId) {
      toast.error('Selecciona una sucursal antes de subir la imagen')
      return { success: false, error: 'No hay sucursal seleccionada' }
    }
    const result = await storageService.uploadServiceImage(file, targetBusinessId)
    if (!result.success) {
      toast.error(result.error || 'Error al subir la imagen')
    }
    return result
  }, [businessId, currentBusinessId, storageService])

  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true)
    try {
      const payload: ServiceInsert | ServiceUpdate = {
        business_id: data.business_id,
        category_id: data.category_id || null,
        name: data.name,
        description: data.description || null,
        price_cents: Math.round(data.price * 100),
        duration_minutes: data.duration_minutes,
        is_featured: data.is_featured,
        image_url: data.image_url || null,
      }
      await onSave(payload)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Descripción del servicio..."
                      rows={2}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {categories.length > 0 && (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === 'none' ? null : value)
                      }
                      value={field.value || 'none'}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {categoryLabels[category.name] || category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Precio (COP) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        placeholder="50000"
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
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
                      Duración (min) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={10}
                        placeholder="30"
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
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
      </DialogContent>
    </Dialog>
  )
}
