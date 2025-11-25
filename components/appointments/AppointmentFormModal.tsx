'use client'

import { useEffect, useState, useMemo } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import { fetchServicesAction } from '@/lib/actions/service'
import { validateAppointmentAction } from '@/lib/actions/availability'
import type { Appointment } from '@/lib/models/appointment/appointment'
import type { Service } from '@/lib/models/service/service'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import CustomerSelector from './CustomerSelector'
import TimeSlotPicker from './TimeSlotPicker'
import SpecialistPicker from './SpecialistPicker'
import type { AvailableSpecialist } from '@/lib/actions/availability'

const appointmentFormSchema = z.object({
  business_id: z.string().min(1, 'El negocio es requerido'),
  service_id: z.string().min(1, 'El servicio es requerido'),
  specialist_id: z.string().min(1, 'El especialista es requerido'),
  customer_id: z.string().min(1, 'El cliente es requerido'),
  date: z.string().min(1, 'La fecha es requerida'),
  start_time: z.string().min(1, 'El horario es requerido'),
  end_time: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  customer_note: z.string().optional(),
  payment_method: z.enum(['AT_VENUE', 'CREDIT_CARD', 'PAYPAL', 'NEQUI']),
  payment_status: z.enum(['UNPAID', 'PAID', 'REFUNDED']),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface AppointmentFormModalProps {
  appointment?: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultDate?: Date
}

export default function AppointmentFormModal({
  appointment,
  open,
  onOpenChange,
  onSuccess,
  defaultDate,
}: AppointmentFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [availableSpecialistIds, setAvailableSpecialistIds] = useState<
    string[]
  >([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [serviceComboboxOpen, setServiceComboboxOpen] = useState(false)
  const [serviceSearch, setServiceSearch] = useState('')

  const { role, businesses } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const appointmentService = new AppointmentService()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const effectiveBusinessId = activeBusiness?.id || ''

  const availableBusinesses = useMemo(() => {
    if (!isCompanyAdmin) return []
    return businesses || []
  }, [isCompanyAdmin, businesses])

  const filteredServices = useMemo(() => {
    if (!serviceSearch) return services
    const search = serviceSearch.toLowerCase()
    return services.filter((service) =>
      service.name.toLowerCase().includes(search)
    )
  }, [services, serviceSearch])

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      business_id: effectiveBusinessId,
      service_id: '',
      specialist_id: '',
      customer_id: '',
      date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : '',
      start_time: '',
      end_time: '',
      status: 'CONFIRMED',
      customer_note: '',
      payment_method: 'AT_VENUE',
      payment_status: 'UNPAID',
    },
  })

  const currentBusinessId = form.watch('business_id')
  const currentServiceId = form.watch('service_id')
  const currentDate = form.watch('date')
  const currentStartTime = form.watch('start_time')

  // Set business_id when effectiveBusinessId changes
  useEffect(() => {
    if (effectiveBusinessId && !form.getValues('business_id')) {
      form.setValue('business_id', effectiveBusinessId)
    }
  }, [effectiveBusinessId, form])

  // Load appointment data for editing
  useEffect(() => {
    if (appointment) {
      const appointmentDate = new Date(appointment.start_time)
      const startTimeStr = format(appointmentDate, 'HH:mm')

      form.reset({
        business_id: appointment.business_id,
        service_id: '', // Will need to be set if we have appointment_services
        specialist_id: appointment.specialist_id,
        customer_id: appointment.users_profile_id,
        date: format(appointmentDate, 'yyyy-MM-dd'),
        start_time: startTimeStr,
        end_time: format(new Date(appointment.end_time), 'HH:mm'),
        status: appointment.status,
        customer_note: appointment.customer_note || '',
        payment_method: appointment.payment_method,
        payment_status: appointment.payment_status,
      })
    }
  }, [appointment, form])

  // Load services when business changes
  useEffect(() => {
    async function loadServices() {
      const businessIdToUse = currentBusinessId || effectiveBusinessId
      if (!businessIdToUse) return

      setIsLoadingServices(true)
      try {
        const response = await fetchServicesAction({
          business_id: businessIdToUse,
        })
        setServices(response.data)
      } catch (error) {
        console.error('Error loading services:', error)
        toast.error('Error al cargar servicios')
      } finally {
        setIsLoadingServices(false)
      }
    }

    if (open) {
      loadServices()
    }
  }, [open, currentBusinessId, effectiveBusinessId])

  // Update selected service when service_id changes
  useEffect(() => {
    if (currentServiceId) {
      const service = services.find((s) => s.id === currentServiceId)
      setSelectedService(service || null)
    } else {
      setSelectedService(null)
    }
  }, [currentServiceId, services])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset({
        business_id: effectiveBusinessId,
        service_id: '',
        specialist_id: '',
        customer_id: '',
        date: '',
        start_time: '',
        end_time: '',
        status: 'CONFIRMED',
        customer_note: '',
        payment_method: 'AT_VENUE',
        payment_status: 'UNPAID',
      })
      setServices([])
      setSelectedService(null)
      setAvailableSpecialistIds([])
    }
  }, [open, effectiveBusinessId, form])

  // Clear dependent fields when service changes
  useEffect(() => {
    form.setValue('start_time', '')
    form.setValue('end_time', '')
    form.setValue('specialist_id', '')
    setAvailableSpecialistIds([])
  }, [currentServiceId, form])

  // Clear specialist when date changes
  useEffect(() => {
    form.setValue('start_time', '')
    form.setValue('end_time', '')
    form.setValue('specialist_id', '')
    setAvailableSpecialistIds([])
  }, [currentDate, form])

  // Clear specialist when time changes
  useEffect(() => {
    form.setValue('specialist_id', '')
  }, [currentStartTime, form])

  const handleCustomerSelect = (customerId: string) => {
    form.setValue('customer_id', customerId)
  }

  const handleTimeSlotSelect = (time: string, specialistIds: string[]) => {
    form.setValue('start_time', time)
    setAvailableSpecialistIds(specialistIds)

    // Calculate end time based on service duration
    if (selectedService) {
      const [hours, minutes] = time.split(':').map(Number)
      const totalMinutes =
        hours * 60 + minutes + selectedService.duration_minutes
      const endHours = Math.floor(totalMinutes / 60)
      const endMinutes = totalMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes
        .toString()
        .padStart(2, '0')}`
      form.setValue('end_time', endTime)
    }
  }

  const handleSpecialistSelect = (
    specialistId: string,
    _specialist?: AvailableSpecialist
  ) => {
    form.setValue('specialist_id', specialistId)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      form.setValue('date', format(date, 'yyyy-MM-dd'))
      setCalendarOpen(false)
    }
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  async function onSubmit(values: AppointmentFormData) {
    try {
      setIsSubmitting(true)

      // Validate appointment before creating
      if (!appointment) {
        const validation = await validateAppointmentAction({
          businessId: values.business_id,
          serviceId: values.service_id,
          specialistId: values.specialist_id,
          date: values.date,
          startTime: values.start_time,
        })

        if (!validation.valid) {
          toast.error(validation.error || 'El horario ya no está disponible')
          setIsSubmitting(false)
          return
        }
      }

      const startDateTime = new Date(`${values.date}T${values.start_time}:00`)
      const endDateTime = new Date(`${values.date}T${values.end_time}:00`)

      const appointmentData = {
        business_id: values.business_id,
        specialist_id: values.specialist_id,
        users_profile_id: values.customer_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: values.status,
        customer_note: values.customer_note || null,
        payment_method: values.payment_method,
        payment_status: values.payment_status,
        subtotal_cents: selectedService?.price_cents || 0,
        tax_cents: 0,
        discount_cents: 0,
        total_price_cents: selectedService?.price_cents || 0,
      }

      let result
      if (appointment?.id) {
        result = await appointmentService.updateItem({
          ...appointmentData,
          id: appointment.id,
        })
      } else {
        result = await appointmentService.createItem(appointmentData)
      }

      if (result.success) {
        toast.success(
          appointment
            ? 'Cita actualizada exitosamente'
            : 'Cita creada exitosamente'
        )
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Error al guardar la cita')
      }
    } catch (error) {
      console.error('Error saving appointment:', error)
      toast.error('Ocurrió un error al guardar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedDateObj = currentDate
    ? new Date(currentDate + 'T00:00:00')
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Business selector (only for company admin) */}
            {isCompanyAdmin && availableBusinesses.length > 0 && (
              <FormField
                control={form.control}
                name="business_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negocio</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un negocio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableBusinesses.map((business) => (
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

            {/* Step 1: Customer */}
            <FormField
              control={form.control}
              name="customer_id"
              render={() => (
                <FormItem>
                  <FormLabel>1. Cliente</FormLabel>
                  <CustomerSelector
                    businessId={currentBusinessId || effectiveBusinessId}
                    value={form.watch('customer_id')}
                    onSelect={handleCustomerSelect}
                    disabled={
                      isSubmitting ||
                      (!currentBusinessId && !effectiveBusinessId)
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Step 2: Service */}
            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>2. Servicio</FormLabel>
                  <Popover
                    open={serviceComboboxOpen}
                    onOpenChange={setServiceComboboxOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={serviceComboboxOpen}
                        className={cn(
                          'w-full justify-between font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={isSubmitting || isLoadingServices}
                      >
                        {isLoadingServices
                          ? 'Cargando servicios...'
                          : field.value
                          ? services.find((s) => s.id === field.value)?.name
                          : 'Buscar servicio...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar servicio..."
                          value={serviceSearch}
                          onValueChange={setServiceSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            No se encontraron servicios
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredServices.map((service) => (
                              <CommandItem
                                key={service.id}
                                value={service.id}
                                onSelect={() => {
                                  field.onChange(service.id)
                                  setServiceComboboxOpen(false)
                                  setServiceSearch('')
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === service.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col flex-1">
                                  <span>{service.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {service.duration_minutes} min •{' '}
                                    {formatPrice(service.price_cents)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedService && (
                    <p className="text-sm text-muted-foreground">
                      Duración: {selectedService.duration_minutes} minutos •
                      Precio: {formatPrice(selectedService.price_cents)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Step 3: Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>3. Fecha</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={isSubmitting || !currentServiceId}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(
                            new Date(field.value + 'T00:00:00'),
                            "EEEE, d 'de' MMMM 'de' yyyy",
                            { locale: es }
                          )
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDateObj}
                        onSelect={handleDateSelect}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Step 4: Time Slot */}
            {currentServiceId && currentDate && (
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>4. Horario</FormLabel>
                    <TimeSlotPicker
                      businessId={currentBusinessId || effectiveBusinessId}
                      serviceId={currentServiceId}
                      date={currentDate}
                      value={field.value}
                      onChange={handleTimeSlotSelect}
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Step 5: Specialist */}
            {currentStartTime && (
              <FormField
                control={form.control}
                name="specialist_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>5. Especialista</FormLabel>
                    <SpecialistPicker
                      businessId={currentBusinessId || effectiveBusinessId}
                      serviceId={currentServiceId}
                      date={currentDate}
                      time={currentStartTime}
                      availableSpecialistIds={availableSpecialistIds}
                      value={field.value}
                      onChange={handleSpecialistSelect}
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Separator />

            {/* Additional Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Estado
              </h4>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pendiente</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                        <SelectItem value="COMPLETED">Completada</SelectItem>
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                        <SelectItem value="NO_SHOW">No Asistió</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona método de pago" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AT_VENUE">En el local</SelectItem>
                          <SelectItem value="CREDIT_CARD">
                            Tarjeta de Crédito
                          </SelectItem>
                          <SelectItem value="PAYPAL">PayPal</SelectItem>
                          <SelectItem value="NEQUI">Nequi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de Pago</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona estado de pago" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UNPAID">Sin Pagar</SelectItem>
                          <SelectItem value="PAID">Pagado</SelectItem>
                          <SelectItem value="REFUNDED">Reembolsado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customer_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota del Cliente (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe alguna nota o solicitud especial..."
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {isSubmitting
                  ? 'Guardando...'
                  : appointment
                  ? 'Actualizar Cita'
                  : 'Crear Cita'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
