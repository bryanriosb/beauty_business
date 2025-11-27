'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { CalendarIcon, Percent } from 'lucide-react'
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
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import { fetchServicesAction } from '@/lib/actions/service'
import { validateAppointmentAction } from '@/lib/actions/availability'
import type { Appointment, AppointmentWithDetails } from '@/lib/models/appointment/appointment'
import type { Service } from '@/lib/models/service/service'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import CustomerSelector from './CustomerSelector'
import TimeSlotPicker from './TimeSlotPicker'
import SpecialistPicker from './SpecialistPicker'
import { MultiServiceSelector, type SelectedService } from './MultiServiceSelector'
import type { AvailableSpecialist } from '@/lib/actions/availability'
import type { AppointmentServiceInput } from '@/lib/actions/appointment'

const appointmentFormSchema = z.object({
  business_id: z.string().min(1, 'El negocio es requerido'),
  service_id: z.string(),
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
  appointment?: AppointmentWithDetails | Appointment | null
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
  const [availableSpecialistIds, setAvailableSpecialistIds] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const isInitializingRef = useRef(false)

  const { role, businesses } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const appointmentService = new AppointmentService()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const effectiveBusinessId = activeBusiness?.id || ''

  const availableBusinesses = useMemo(() => {
    if (!isCompanyAdmin) return []
    return businesses || []
  }, [isCompanyAdmin, businesses])

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  }, [selectedServices])

  const totalServicesPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price_cents, 0)
  }, [selectedServices])

  const priceCalculations = useMemo(() => {
    const subtotal = Math.round(totalServicesPrice / 1.19)
    const tax = totalServicesPrice - subtotal
    const discount = Math.round(subtotal * (discountPercent / 100))
    const total = subtotal + tax - discount
    return { subtotal, tax, discount, total }
  }, [totalServicesPrice, discountPercent])

  const firstServiceId = selectedServices.length > 0 ? selectedServices[0].id : ''

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
    if (appointment && open) {
      isInitializingRef.current = true

      const appointmentDate = new Date(appointment.start_time)
      const startTimeStr = format(appointmentDate, 'HH:mm')

      // Load services from appointment_services first
      const appointmentWithDetails = appointment as AppointmentWithDetails
      if (appointmentWithDetails.appointment_services?.length) {
        const servicesFromAppointment: SelectedService[] = appointmentWithDetails.appointment_services.map((as) => ({
          id: as.service_id,
          name: as.service.name,
          duration_minutes: as.duration_minutes,
          price_cents: as.price_at_booking_cents,
        }))
        setSelectedServices(servicesFromAppointment)
      }

      form.reset({
        business_id: appointment.business_id,
        service_id: appointmentWithDetails.appointment_services?.[0]?.service_id || '',
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

      // Initialize available specialist IDs with the current specialist
      if (appointment.specialist_id) {
        setAvailableSpecialistIds([appointment.specialist_id])
      }

      // Calculate discount percent from existing values
      if (appointment.subtotal_cents > 0 && appointment.discount_cents > 0) {
        const percent = Math.round((appointment.discount_cents / appointment.subtotal_cents) * 100)
        setDiscountPercent(percent)
      } else {
        setDiscountPercent(0)
      }

      // Reset the flag after a tick to allow the form values to settle
      setTimeout(() => {
        isInitializingRef.current = false
      }, 100)
    }
  }, [appointment, open, form])

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
      setSelectedServices([])
      setAvailableSpecialistIds([])
      setDiscountPercent(0)
    }
  }, [open, effectiveBusinessId, form])

  // Clear dependent fields when services change (skip during edit initialization)
  useEffect(() => {
    if (isInitializingRef.current) return
    form.setValue('start_time', '')
    form.setValue('end_time', '')
    form.setValue('specialist_id', '')
    form.setValue('service_id', firstServiceId)
    setAvailableSpecialistIds([])
  }, [selectedServices.length, firstServiceId, form])

  // Clear specialist when date changes (skip during edit initialization)
  useEffect(() => {
    if (isInitializingRef.current) return
    form.setValue('start_time', '')
    form.setValue('end_time', '')
    form.setValue('specialist_id', '')
    setAvailableSpecialistIds([])
  }, [currentDate, form])

  // Clear specialist when time changes (skip during edit initialization)
  useEffect(() => {
    if (isInitializingRef.current) return
    form.setValue('specialist_id', '')
  }, [currentStartTime, form])

  const handleCustomerSelect = (customerId: string) => {
    form.setValue('customer_id', customerId)
  }

  const handleTimeSlotSelect = (time: string, specialistIds: string[]) => {
    form.setValue('start_time', time)
    setAvailableSpecialistIds(specialistIds)

    if (totalDuration > 0) {
      const [hours, minutes] = time.split(':').map(Number)
      const endTotalMinutes = hours * 60 + minutes + totalDuration
      const endHours = Math.floor(endTotalMinutes / 60)
      const endMinutes = endTotalMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
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

  async function onSubmit(values: AppointmentFormData) {
    try {
      setIsSubmitting(true)

      if (selectedServices.length === 0) {
        toast.error('Debes seleccionar al menos un servicio')
        setIsSubmitting(false)
        return
      }

      if (!appointment && firstServiceId) {
        const validation = await validateAppointmentAction({
          businessId: values.business_id,
          serviceId: firstServiceId,
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
        subtotal_cents: priceCalculations.subtotal,
        tax_cents: priceCalculations.tax,
        discount_cents: priceCalculations.discount,
        total_price_cents: priceCalculations.total,
      }

      const servicesData: AppointmentServiceInput[] = selectedServices.map((s) => ({
        service_id: s.id,
        price_at_booking_cents: s.price_cents,
        duration_minutes: s.duration_minutes,
      }))

      let result
      if (appointment?.id) {
        result = await appointmentService.updateItem({
          ...appointmentData,
          id: appointment.id,
        })
      } else {
        result = await appointmentService.createItem(appointmentData, servicesData)
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

            {/* Step 2: Services */}
            <FormItem className="flex flex-col">
              <FormLabel>2. Servicios</FormLabel>
              <MultiServiceSelector
                services={services}
                selectedServices={selectedServices}
                onChange={setSelectedServices}
                disabled={isSubmitting}
                isLoading={isLoadingServices}
              />
              {selectedServices.length === 0 && (
                <p className="text-sm text-destructive">
                  Selecciona al menos un servicio
                </p>
              )}
            </FormItem>

            {/* Price Summary */}
            {selectedServices.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resumen de Precios</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal (sin IVA)</span>
                    <span>${(priceCalculations.subtotal / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (19%)</span>
                    <span>${(priceCalculations.tax / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Descuento</span>
                      <div className="relative w-20">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discountPercent}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                            setDiscountPercent(val)
                          }}
                          className="h-7 pr-7 text-right text-sm"
                          disabled={isSubmitting}
                        />
                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    {priceCalculations.discount > 0 && (
                      <span className="text-green-600">
                        -${(priceCalculations.discount / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>${(priceCalculations.total / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            )}

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
                        disabled={isSubmitting || selectedServices.length === 0}
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
            {selectedServices.length > 0 && currentDate && (
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>4. Horario</FormLabel>
                    <TimeSlotPicker
                      businessId={currentBusinessId || effectiveBusinessId}
                      serviceId={firstServiceId}
                      date={currentDate}
                      value={field.value}
                      onChange={handleTimeSlotSelect}
                      disabled={isSubmitting}
                      excludeAppointmentId={appointment?.id}
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
                      serviceId={firstServiceId}
                      date={currentDate}
                      time={currentStartTime}
                      availableSpecialistIds={availableSpecialistIds}
                      value={field.value}
                      onChange={handleSpecialistSelect}
                      disabled={isSubmitting}
                      excludeAppointmentId={appointment?.id}
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
