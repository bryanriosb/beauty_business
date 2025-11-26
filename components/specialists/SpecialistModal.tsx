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
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Loader2, Clock, Briefcase, ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { BusinessStorageService } from '@/lib/services/business/business-storage-service'
import { toast } from 'sonner'
import type {
  Specialist,
  SpecialistInsert,
  SpecialistUpdate,
  SpecialistAvailability,
} from '@/lib/models/specialist/specialist'
import type { BusinessHours } from '@/lib/models/business/business-hours'
import type { ServiceCategory } from '@/lib/models/service/service'
import type { DayOfWeek } from '@/lib/types/enums'
import { ServiceCategorySelector } from './ServiceCategorySelector'

const formSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().optional().or(z.literal('')),
  specialty: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
  profile_picture_url: z.string().optional().or(z.literal('')),
  is_featured: z.boolean(),
})

type SpecialistFormValues = z.infer<typeof formSchema>

interface DaySchedule {
  enabled: boolean
  start_time: string
  end_time: string
}

type WeekSchedule = Record<DayOfWeek, DaySchedule>

const DAYS_CONFIG: { key: DayOfWeek; label: string; shortLabel: string }[] = [
  { key: '1', label: 'Lunes', shortLabel: 'Lun' },
  { key: '2', label: 'Martes', shortLabel: 'Mar' },
  { key: '3', label: 'Miércoles', shortLabel: 'Mié' },
  { key: '4', label: 'Jueves', shortLabel: 'Jue' },
  { key: '5', label: 'Viernes', shortLabel: 'Vie' },
  { key: '6', label: 'Sábado', shortLabel: 'Sáb' },
  { key: '0', label: 'Domingo', shortLabel: 'Dom' },
]

const DEFAULT_SCHEDULE: WeekSchedule = {
  '0': { enabled: false, start_time: '09:00', end_time: '18:00' },
  '1': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '2': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '3': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '4': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '5': { enabled: true, start_time: '09:00', end_time: '18:00' },
  '6': { enabled: true, start_time: '09:00', end_time: '13:00' },
}

interface SpecialistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specialist?: Specialist | null
  businessId: string | null
  onSave: (
    data: SpecialistInsert | SpecialistUpdate,
    availability: Omit<SpecialistAvailability, 'id' | 'specialist_id'>[],
    categoryIds: string[]
  ) => Promise<void>
  initialAvailability?: SpecialistAvailability[]
  initialCategoryIds?: string[]
  serviceCategories?: ServiceCategory[]
  businessHours?: BusinessHours[]
}

export function SpecialistModal({
  open,
  onOpenChange,
  specialist,
  businessId,
  onSave,
  initialAvailability,
  initialCategoryIds,
  serviceCategories = [],
  businessHours,
}: SpecialistModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storageService] = useState(() => new BusinessStorageService())
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [servicesOpen, setServicesOpen] = useState(true)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const form = useForm<SpecialistFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      specialty: '',
      bio: '',
      profile_picture_url: '',
      is_featured: false,
    },
  })

  useEffect(() => {
    if (specialist) {
      form.reset({
        first_name: specialist.first_name,
        last_name: specialist.last_name || '',
        specialty: specialist.specialty || '',
        bio: specialist.bio || '',
        profile_picture_url: specialist.profile_picture_url || '',
        is_featured: specialist.is_featured,
      })

      setSelectedCategoryIds(initialCategoryIds || [])

      if (initialAvailability && initialAvailability.length > 0) {
        const newSchedule = { ...DEFAULT_SCHEDULE }
        Object.keys(newSchedule).forEach((day) => {
          newSchedule[day as DayOfWeek] = {
            enabled: false,
            start_time: '09:00',
            end_time: '18:00',
          }
        })
        initialAvailability.forEach((avail) => {
          newSchedule[avail.day_of_week] = {
            enabled: avail.is_available,
            start_time: avail.start_time.slice(0, 5),
            end_time: avail.end_time.slice(0, 5),
          }
        })
        setSchedule(newSchedule)
      } else {
        setSchedule(DEFAULT_SCHEDULE)
      }
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        specialty: '',
        bio: '',
        profile_picture_url: '',
        is_featured: false,
      })
      setSchedule(DEFAULT_SCHEDULE)
      setSelectedCategoryIds([])
    }
  }, [specialist, form, open, initialAvailability, initialCategoryIds])

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!businessId) {
        toast.error('No hay sucursal seleccionada para subir la imagen')
        return { success: false, error: 'No hay sucursal seleccionada' }
      }
      const result = await storageService.uploadSpecialistImage(file, businessId)
      if (!result.success) {
        toast.error(result.error || 'Error al subir la imagen')
      }
      return result
    },
    [businessId, storageService]
  )

  const updateDaySchedule = (day: DayOfWeek, updates: Partial<DaySchedule>) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }))
  }

  // Helper to get business hours for a specific day
  const getBusinessHoursForDay = (day: DayOfWeek) => {
    return businessHours?.find((bh) => bh.day === day)
  }

  // Check if business is open on a specific day
  const isBusinessOpenOnDay = (day: DayOfWeek) => {
    const bh = getBusinessHoursForDay(day)
    return bh ? !bh.is_closed : true // Default to open if no business hours defined
  }

  const onSubmit = async (data: SpecialistFormValues) => {
    setIsSubmitting(true)
    try {
      const specialtyFromCategories = selectedCategoryIds.length > 0
        ? serviceCategories
            .filter((c) => selectedCategoryIds.includes(c.id))
            .map((c) => c.name)
            .join(', ')
        : data.specialty || null

      const saveData: SpecialistInsert | SpecialistUpdate = {
        ...data,
        last_name: data.last_name || null,
        specialty: specialtyFromCategories,
        bio: data.bio || null,
        profile_picture_url: data.profile_picture_url || null,
        business_id: businessId,
      }

      const availabilityData: Omit<SpecialistAvailability, 'id' | 'specialist_id'>[] =
        Object.entries(schedule).map(([day, config]) => ({
          day_of_week: day as DayOfWeek,
          start_time: config.start_time,
          end_time: config.end_time,
          is_available: config.enabled,
        }))

      await onSave(saveData, availabilityData, selectedCategoryIds)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving specialist:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {specialist ? 'Editar Especialista' : 'Agregar Especialista'}
          </DialogTitle>
          <DialogDescription>
            {specialist
              ? 'Modifica la información del especialista'
              : 'Completa la información del nuevo especialista'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nombre <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="María" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="García" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Service Categories - Collapsible */}
            <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Servicios que realiza</span>
                    {selectedCategoryIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({selectedCategoryIds.length} seleccionados)
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      servicesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ServiceCategorySelector
                  categories={serviceCategories}
                  selectedCategoryIds={selectedCategoryIds}
                  onChange={setSelectedCategoryIds}
                  disabled={isSubmitting}
                />
              </CollapsibleContent>
            </Collapsible>

            <FormField
              control={form.control}
              name="profile_picture_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto de perfil</FormLabel>
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
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe una breve descripción..."
                      rows={2}
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
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Destacado</FormLabel>
                    <FormDescription className="text-xs">
                      Los especialistas destacados aparecen primero
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

            <Separator />

            {/* Schedule Section - Collapsible */}
            <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Horario de trabajo</span>
                    <span className="text-xs text-muted-foreground">
                      ({Object.values(schedule).filter((d) => d.enabled).length} días activos)
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      scheduleOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                {DAYS_CONFIG.map(({ key, label }) => {
                  const businessDay = getBusinessHoursForDay(key)
                  const businessIsOpen = isBusinessOpenOnDay(key)
                  const businessOpenTime = businessDay?.open_time?.slice(0, 5) || '09:00'
                  const businessCloseTime = businessDay?.close_time?.slice(0, 5) || '18:00'

                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 rounded-lg border p-2 ${
                        !businessIsOpen ? 'opacity-50 bg-muted/50' : ''
                      }`}
                    >
                      <Switch
                        checked={schedule[key].enabled && businessIsOpen}
                        onCheckedChange={(checked) =>
                          updateDaySchedule(key, { enabled: checked })
                        }
                        disabled={isSubmitting || !businessIsOpen}
                      />
                      <span className="w-24 text-sm font-medium">{label}</span>
                      {!businessIsOpen ? (
                        <span className="text-xs text-muted-foreground">
                          Negocio cerrado
                        </span>
                      ) : schedule[key].enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={schedule[key].start_time}
                            min={businessOpenTime}
                            max={businessCloseTime}
                            onChange={(e) =>
                              updateDaySchedule(key, { start_time: e.target.value })
                            }
                            disabled={isSubmitting}
                            className="h-8 text-xs w-28"
                          />
                          <span className="text-muted-foreground text-xs">a</span>
                          <Input
                            type="time"
                            value={schedule[key].end_time}
                            min={businessOpenTime}
                            max={businessCloseTime}
                            onChange={(e) =>
                              updateDaySchedule(key, { end_time: e.target.value })
                            }
                            disabled={isSubmitting}
                            className="h-8 text-xs w-28"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No trabaja</span>
                      )}
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>

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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {specialist ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
