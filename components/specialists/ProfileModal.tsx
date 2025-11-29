'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Camera, Clock, Briefcase, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type {
  Specialist,
  SpecialistAvailability,
} from '@/lib/models/specialist/specialist'
import type { BusinessHours } from '@/lib/models/business/business-hours'
import type { ServiceCategory } from '@/lib/models/service/service'
import type { DayOfWeek } from '@/lib/types/enums'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import {
  updateSpecialistServiceCategoriesAction,
  syncSpecialistProfilePictureAction,
} from '@/lib/actions/specialist'
import { ServiceCategorySelector } from './ServiceCategorySelector'

const profileSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().optional(),
  bio: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface DaySchedule {
  enabled: boolean
  start_time: string
  end_time: string
}

type WeekSchedule = Record<DayOfWeek, DaySchedule>

const DAYS_CONFIG: { key: DayOfWeek; label: string }[] = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
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

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specialist: Specialist
  onUpdate: (specialist: Specialist) => void
  businessHours?: BusinessHours[]
  serviceCategories?: ServiceCategory[]
  initialAvailability?: SpecialistAvailability[]
  initialCategoryIds?: string[]
}

export function ProfileModal({
  open,
  onOpenChange,
  specialist,
  onUpdate,
  businessHours = [],
  serviceCategories = [],
  initialAvailability = [],
  initialCategoryIds = [],
}: ProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: specialist.first_name,
      last_name: specialist.last_name || '',
      bio: specialist.bio || '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: specialist.first_name,
        last_name: specialist.last_name || '',
        bio: specialist.bio || '',
      })
      setAvatarPreview(null)
      setAvatarFile(null)
      setSelectedCategoryIds(initialCategoryIds)

      if (initialAvailability.length > 0) {
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
    }
  }, [open, specialist, form, initialAvailability, initialCategoryIds])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const updateDaySchedule = (day: DayOfWeek, updates: Partial<DaySchedule>) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }))
  }

  const getBusinessHoursForDay = useCallback(
    (day: DayOfWeek) => businessHours.find((bh) => bh.day === day),
    [businessHours]
  )

  const isBusinessOpenOnDay = useCallback(
    (day: DayOfWeek) => {
      const bh = getBusinessHoursForDay(day)
      return bh ? !bh.is_closed : true
    },
    [getBusinessHoursForDay]
  )

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      const service = new SpecialistService()

      let avatarUrl = specialist.profile_picture_url

      if (avatarFile) {
        const uploadResult = await service.uploadAvatar(specialist.id, avatarFile)
        if (uploadResult.success && uploadResult.data) {
          avatarUrl = uploadResult.data
        }
      }

      const updateData: Partial<Specialist> = {
        id: specialist.id,
        first_name: data.first_name,
        last_name: data.last_name || null,
        bio: data.bio || null,
        profile_picture_url: avatarUrl,
      }

      const result = await service.updateItem(updateData)
      if (!result.success) {
        throw new Error(result.error)
      }

      if (avatarUrl !== specialist.profile_picture_url) {
        await syncSpecialistProfilePictureAction(specialist.id, avatarUrl)
      }

      const availabilityData: Omit<SpecialistAvailability, 'id' | 'specialist_id'>[] =
        Object.entries(schedule).map(([day, config]) => ({
          day_of_week: day as DayOfWeek,
          start_time: config.start_time,
          end_time: config.end_time,
          is_available: config.enabled,
        }))

      const [availResult, catResult] = await Promise.all([
        service.updateAvailability(specialist.id, availabilityData),
        updateSpecialistServiceCategoriesAction(specialist.id, selectedCategoryIds),
      ])

      if (!availResult.success) {
        console.error('Error saving availability:', availResult.error)
      }
      if (!catResult.success) {
        console.error('Error saving categories:', catResult.error)
      }

      const specialtyFromCategories =
        selectedCategoryIds.length > 0
          ? serviceCategories
              .filter((c) => selectedCategoryIds.includes(c.id))
              .map((c) => c.name)
              .join(', ')
          : specialist.specialty

      toast.success('Perfil actualizado correctamente')

      onUpdate({
        ...specialist,
        ...updateData,
        specialty: specialtyFromCategories,
      })

      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const displayName = `${specialist.first_name} ${specialist.last_name || ''}`.trim()
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {(avatarPreview || specialist.profile_picture_url) && (
                    <AvatarImage
                      src={avatarPreview || specialist.profile_picture_url || ''}
                      alt={displayName}
                    />
                  )}
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Correo electrónico
              </label>
              <Input value={specialist.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Para cambiar tu correo, contacta al administrador
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
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
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Cuéntanos sobre ti y tu experiencia..."
                      rows={2}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Servicios que realizo</span>
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
                  disabled={isLoading}
                />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Mi horario de trabajo</span>
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
                        disabled={isLoading || !businessIsOpen}
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
                            disabled={isLoading}
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
                            disabled={isLoading}
                            className="h-8 text-xs w-28"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No trabajo</span>
                      )}
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
