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
import {
  Loader2,
  Clock,
  Briefcase,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react'
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
import PhoneInput from 'react-phone-number-input'

function generatePassword(length = 10): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

const baseSchema = {
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  specialty: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
  profile_picture_url: z.string().optional().or(z.literal('')),
  is_featured: z.boolean(),
}

const createSchema = z.object({
  ...baseSchema,
  email: z.string().email('Email inválido').min(1, 'El email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const editSchema = z.object({
  ...baseSchema,
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  newPassword: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .optional()
    .or(z.literal('')),
  newPhone: z.string().optional().or(z.literal('')),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>
type SpecialistFormValues = CreateFormValues | EditFormValues

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

export interface SpecialistCredentials {
  email: string
  password: string
  phone?: string
}

export interface SpecialistCredentialsUpdate {
  newEmail?: string
  newPassword?: string
  newPhone?: string
}

interface SpecialistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specialist?: Specialist | null
  businessId: string | null
  onSave: (
    data: SpecialistInsert | SpecialistUpdate,
    availability: Omit<SpecialistAvailability, 'id' | 'specialist_id'>[],
    categoryIds: string[],
    credentials?: SpecialistCredentials,
    credentialsUpdate?: SpecialistCredentialsUpdate
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
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(true)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const isEditing = !!specialist
  const formSchema = isEditing ? editSchema : createSchema

  const form = useForm<SpecialistFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      specialty: '',
      bio: '',
      profile_picture_url: '',
      is_featured: false,
    },
  })

  useEffect(() => {
    if (specialist) {
      // Normalizar teléfono para PhoneInput (debe tener prefijo +)
      let normalizedPhone = specialist.phone || ''
      if (normalizedPhone && !normalizedPhone.startsWith('+')) {
        normalizedPhone = '+' + normalizedPhone
      }

      form.reset({
        first_name: specialist.first_name,
        last_name: specialist.last_name || '',
        email: specialist.email || '',
        phone: normalizedPhone,
        specialty: specialist.specialty || '',
        bio: specialist.bio || '',
        profile_picture_url: specialist.profile_picture_url || '',
        is_featured: specialist.is_featured,
        newPassword: '',
        newPhone: '',
      } as EditFormValues)

      setSelectedCategoryIds(initialCategoryIds || [])
      setShowNewPassword(false)

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
      const suggestedPassword = generatePassword()
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        password: suggestedPassword,
        phone: '',
        specialty: '',
        bio: '',
        profile_picture_url: '',
        is_featured: false,
      } as CreateFormValues)
      setSchedule(DEFAULT_SCHEDULE)
      setSelectedCategoryIds([])
      setShowPassword(true)
    }
  }, [specialist, form, open, initialAvailability, initialCategoryIds])

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!businessId) {
        toast.error('No hay sucursal seleccionada para subir la imagen')
        return { success: false, error: 'No hay sucursal seleccionada' }
      }
      const result = await storageService.uploadSpecialistImage(
        file,
        businessId
      )
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
      const specialtyFromCategories =
        selectedCategoryIds.length > 0
          ? serviceCategories
              .filter((c) => selectedCategoryIds.includes(c.id))
              .map((c) => c.name)
              .join(', ')
          : data.specialty || null

      const saveData: SpecialistInsert | SpecialistUpdate = {
        first_name: data.first_name,
        last_name: data.last_name || null,
        email: data.email || null,
        specialty: specialtyFromCategories,
        bio: data.bio || null,
        profile_picture_url: data.profile_picture_url || null,
        business_id: businessId,
        is_featured: data.is_featured,
      }

      const availabilityData: Omit<
        SpecialistAvailability,
        'id' | 'specialist_id'
      >[] = Object.entries(schedule).map(([day, config]) => ({
        day_of_week: day as DayOfWeek,
        start_time: config.start_time,
        end_time: config.end_time,
        is_available: config.enabled,
      }))

      let credentials: SpecialistCredentials | undefined
      let credentialsUpdate: SpecialistCredentialsUpdate | undefined

      if (!isEditing && data.email && 'password' in data && data.password) {
        credentials = {
          email: data.email,
          password: data.password,
          phone: data.phone,
        }
      }

      if (isEditing && specialist?.user_profile_id) {
        const editData = data as EditFormValues
        const emailChanged =
          editData.email && editData.email !== specialist.email
        const hasNewPassword =
          editData.newPassword && editData.newPassword.length >= 6
        const hasNewPhone = editData.newPhone && editData.newPhone.length > 0

        if (emailChanged || hasNewPassword || hasNewPhone) {
          credentialsUpdate = {
            newEmail: emailChanged ? editData.email : undefined,
            newPassword: hasNewPassword ? editData.newPassword : undefined,
            newPhone: hasNewPhone ? editData.newPhone : undefined,
          }
        }
      }

      await onSave(
        saveData,
        availabilityData,
        selectedCategoryIds,
        credentials,
        credentialsUpdate
      )
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving specialist:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
                      <Input
                        placeholder="María"
                        disabled={isSubmitting}
                        data-tutorial="specialist-name-input"
                        {...field}
                      />
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
                      <Input
                        placeholder="García"
                        disabled={isSubmitting}
                        data-tutorial="specialist-last-name-input"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email{' '}
                    {!isEditing && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="maria@ejemplo.com"
                      disabled={isSubmitting}
                      data-tutorial="specialist-email-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <PhoneInput
                      defaultCountry="CO"
                      countries={['CO']}
                      international
                      countryCallingCodeEditable={false}
                      countrySelectProps={{ disabled: true }}
                      placeholder="300 123 4567"
                      limitMaxLength={true}
                      value={field.value}
                      onChange={field.onChange}
                      data-tutorial="specialist-phone-input"
                      className="phone-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing ? (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Contraseña <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            disabled={isSubmitting}
                            data-tutorial="specialist-password-input"
                            className="pr-20"
                            {...field}
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newPass = generatePassword()
                          form.setValue('password', newPass)
                        }}
                        disabled={isSubmitting}
                        title="Generar nueva contraseña"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription className="text-xs">
                      Contraseña sugerida. Puedes modificarla o regenerar una
                      nueva.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              specialist?.user_profile_id && (
                <>
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva Contraseña (opcional)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <div className="relative flex-1">
                              <Input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Dejar vacío para no cambiar"
                                disabled={isSubmitting}
                                className="pr-10"
                                {...field}
                              />
                              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    setShowNewPassword(!showNewPassword)
                                  }
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </FormControl>
                        </div>
                        <FormDescription className="text-xs">
                          Solo completa si deseas cambiar la contraseña actual.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )
            )}

            {/* Service Categories - Collapsible */}
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Servicios que realiza
                </span>
                {selectedCategoryIds.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedCategoryIds.length} seleccionados)
                  </span>
                )}
              </div>
              <ServiceCategorySelector
                categories={serviceCategories}
                selectedCategoryIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
                disabled={isSubmitting}
              />
            </div>

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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Especialista de con alta experiencia en..."
                      rows={2}
                      disabled={isSubmitting}
                      data-tutorial="specialist-bio"
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
                    <span className="text-sm font-medium">
                      Horario de trabajo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({Object.values(schedule).filter((d) => d.enabled).length}{' '}
                      días activos)
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
                  const businessOpenTime =
                    businessDay?.open_time?.slice(0, 5) || '09:00'
                  const businessCloseTime =
                    businessDay?.close_time?.slice(0, 5) || '18:00'

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
                              updateDaySchedule(key, {
                                start_time: e.target.value,
                              })
                            }
                            disabled={isSubmitting}
                            className="h-8 text-xs w-28"
                          />
                          <span className="text-muted-foreground text-xs">
                            a
                          </span>
                          <Input
                            type="time"
                            value={schedule[key].end_time}
                            min={businessOpenTime}
                            max={businessCloseTime}
                            onChange={(e) =>
                              updateDaySchedule(key, {
                                end_time: e.target.value,
                              })
                            }
                            disabled={isSubmitting}
                            className="h-8 text-xs w-28"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No trabaja
                        </span>
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
              <Button
                type="submit"
                disabled={isSubmitting}
                data-tutorial="save-specialist-button"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {specialist ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
