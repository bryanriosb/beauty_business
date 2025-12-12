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
import { NumericInput } from '@/components/ui/numeric-input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import { fetchServicesAction } from '@/lib/actions/service'
import { validateAppointmentAction } from '@/lib/actions/availability'
import type {
  Appointment,
  AppointmentWithDetails,
} from '@/lib/models/appointment/appointment'
import type { Service } from '@/lib/models/service/service'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useServiceStockCheck } from '@/hooks/use-service-stock-check'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import CustomerSelector from './CustomerSelector'
import {
  MultiServiceSelector,
  type SelectedService,
} from './MultiServiceSelector'
import ServiceSpecialistAssignmentComponent, {
  type ServiceSpecialistAssignment,
} from './ServiceSpecialistAssignment'
import {
  AppointmentSuppliesSection,
  calculateSuppliesTotal,
  hasInsufficientStock,
} from './AppointmentSuppliesSection'
import type {
  AppointmentServiceInput,
  AppointmentSupplyInput,
} from '@/lib/actions/appointment'
import type { SelectedSupply } from '@/lib/models/product'
import { validateStockForSuppliesAction } from '@/lib/actions/inventory'
import { FeatureGate } from '@/components/plan/feature-gate'
import { useFeaturePermission } from '@/hooks/use-feature-permission'

const appointmentFormSchema = z.object({
  business_id: z.string().min(1, 'El negocio es requerido'),
  service_id: z.string(),
  specialist_id: z.string().optional(),
  customer_id: z.string().min(1, 'El cliente es requerido'),
  date: z.string().min(1, 'La fecha es requerida'),
  start_time: z.string().min(1, 'El horario es requerido'),
  end_time: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  customer_note: z.string().optional(),
  payment_method: z.enum(['AT_VENUE', 'CREDIT_CARD', 'PAYPAL', 'NEQUI']),
  payment_status: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED']),
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
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    []
  )
  const [supplies, setSupplies] = useState<SelectedSupply[]>([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [serviceSpecialistAssignments, setServiceSpecialistAssignments] =
    useState<ServiceSpecialistAssignment[]>([])
  const isInitializingRef = useRef(false)

  const { role, businesses } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const { checkService, stockStatusMap, clearCache } = useServiceStockCheck()
  const appointmentService = new AppointmentService()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // Verificar si el plan permite supply_management
  const { hasPermission: hasSupplyManagement, isLoading: isLoadingPermission } =
    useFeaturePermission('services', 'supply_management')
  const effectiveBusinessId = activeBusiness?.id || ''

  const availableBusinesses = useMemo(() => {
    if (!isCompanyAdmin) return []
    return businesses || []
  }, [isCompanyAdmin, businesses])

  const totalSuppliesPrice = useMemo(() => {
    return calculateSuppliesTotal(supplies)
  }, [supplies])

  const priceCalculations = useMemo(() => {
    let servicesTax = 0
    let servicesSubtotal = 0

    selectedServices.forEach((service) => {
      if (service.tax_rate !== null && service.tax_rate > 0) {
        const subtotalItem = Math.round(
          service.price_cents / (1 + service.tax_rate / 100)
        )
        const taxItem = service.price_cents - subtotalItem
        servicesSubtotal += subtotalItem
        servicesTax += taxItem
      } else {
        servicesSubtotal += service.price_cents
      }
    })

    const subtotal = servicesSubtotal + totalSuppliesPrice
    const tax = servicesTax
    const discount = Math.round(servicesSubtotal * (discountPercent / 100))
    const total = subtotal + tax - discount
    return { subtotal, tax, discount, total, suppliesCost: totalSuppliesPrice }
  }, [selectedServices, totalSuppliesPrice, discountPercent])

  const firstServiceId =
    selectedServices.length > 0 ? selectedServices[0].id : ''

  const allServicesHaveSpecialistAndTime = useMemo(() => {
    if (serviceSpecialistAssignments.length === 0) return false
    return serviceSpecialistAssignments.every(
      (a) => a.specialistId !== null && a.startTime !== null
    )
  }, [serviceSpecialistAssignments])

  const primarySpecialistId = useMemo(() => {
    const firstAssignment = serviceSpecialistAssignments.find(
      (a) => a.specialistId
    )
    return firstAssignment?.specialistId || ''
  }, [serviceSpecialistAssignments])

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

      const appointmentWithDetails = appointment as AppointmentWithDetails
      if (appointmentWithDetails.appointment_services?.length) {
        const servicesFromAppointment: SelectedService[] =
          appointmentWithDetails.appointment_services.map((as) => ({
            id: as.service_id,
            name: as.service.name,
            duration_minutes: as.duration_minutes,
            price_cents: as.price_at_booking_cents,
            original_price_cents: as.price_at_booking_cents,
            tax_rate: as.service.tax_rate,
            has_custom_price: false,
            category_id: as.service.category_id,
            category_name: as.service.service_category?.name || null,
          }))
        setSelectedServices(servicesFromAppointment)

        // Initialize prevServiceIdsRef to prevent reset on first render
        prevServiceIdsRef.current = servicesFromAppointment
          .map((s) => s.id)
          .sort()
          .join(',')

        // Load specialist assignments from appointment_services
        const assignmentsFromAppointment: ServiceSpecialistAssignment[] =
          appointmentWithDetails.appointment_services.map((as) => {
            const serviceStartTime = as.start_time
              ? format(new Date(as.start_time), 'HH:mm')
              : null
            const serviceEndTime = as.end_time
              ? format(new Date(as.end_time), 'HH:mm')
              : null
            const specialistName = as.specialist
              ? `${as.specialist.first_name} ${
                  as.specialist.last_name || ''
                }`.trim()
              : null

            return {
              serviceId: as.service_id,
              serviceName: as.service.name,
              categoryId: as.service.category_id,
              categoryName: as.service.service_category?.name || null,
              specialistId: as.specialist_id,
              specialistName,
              durationMinutes: as.duration_minutes,
              startTime: serviceStartTime,
              endTime: serviceEndTime,
            }
          })
        setServiceSpecialistAssignments(assignmentsFromAppointment)
      }

      form.reset({
        business_id: appointment.business_id,
        service_id:
          appointmentWithDetails.appointment_services?.[0]?.service_id || '',
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

      // Calculate discount percent from existing values
      if (appointment.subtotal_cents > 0 && appointment.discount_cents > 0) {
        const percent = Math.round(
          (appointment.discount_cents / appointment.subtotal_cents) * 100
        )
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

      // Esperar a que se cargue el permiso antes de cargar servicios
      if (isLoadingPermission) return

      setIsLoadingServices(true)
      try {
        const response = await fetchServicesAction({
          business_id: businessIdToUse,
          // Si NO tiene permiso de supply_management, excluir servicios con insumos
          exclude_with_supplies: !hasSupplyManagement,
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
  }, [open, currentBusinessId, effectiveBusinessId, hasSupplyManagement, isLoadingPermission])

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
      setSupplies([])
      setDiscountPercent(0)
      setServiceSpecialistAssignments([])
      clearCache()
    }
  }, [open, effectiveBusinessId, form, clearCache])

  // Reset assignments when services change (skip during edit initialization)
  // Use a ref to track service IDs and only reset when they actually change
  const prevServiceIdsRef = useRef<string>('')
  useEffect(() => {
    if (isInitializingRef.current) return

    const currentServiceIds = selectedServices
      .map((s) => s.id)
      .sort()
      .join(',')
    if (currentServiceIds === prevServiceIdsRef.current) {
      // Service IDs haven't changed, don't reset
      return
    }
    prevServiceIdsRef.current = currentServiceIds

    form.setValue('start_time', '')
    form.setValue('end_time', '')
    form.setValue('specialist_id', '')
    form.setValue('service_id', firstServiceId)
    // Recreate assignments structure without specialist/time
    const newAssignments: ServiceSpecialistAssignment[] = selectedServices.map(
      (s) => ({
        serviceId: s.id,
        serviceName: s.name,
        categoryId: s.category_id || null,
        categoryName: s.category_name || null,
        specialistId: null,
        specialistName: null,
        durationMinutes: s.duration_minutes,
        startTime: null,
        endTime: null,
      })
    )
    setServiceSpecialistAssignments(newAssignments)
  }, [selectedServices, firstServiceId, form])

  // Clear specialist/time when date changes (skip during edit initialization)
  useEffect(() => {
    if (isInitializingRef.current) return
    form.setValue('start_time', '')
    form.setValue('end_time', '')
    form.setValue('specialist_id', '')
    // Reset assignments to clear specialist/time but keep structure
    setServiceSpecialistAssignments((prev) =>
      prev.map((a) => ({
        ...a,
        specialistId: null,
        specialistName: null,
        startTime: null,
        endTime: null,
      }))
    )
  }, [currentDate, form])

  const handleCustomerSelect = (customerId: string) => {
    form.setValue('customer_id', customerId)
  }

  const handleTimesCalculated = (startTime: string, endTime: string) => {
    form.setValue('start_time', startTime)
    form.setValue('end_time', endTime)
  }

  const handleServiceSpecialistAssignmentsChange = (
    assignments: ServiceSpecialistAssignment[]
  ) => {
    setServiceSpecialistAssignments(assignments)
    const firstSpecialistId = assignments.find(
      (a) => a.specialistId
    )?.specialistId
    if (firstSpecialistId) {
      form.setValue('specialist_id', firstSpecialistId)
    }
  }

  const handlePrimarySpecialistChange = (specialistId: string) => {
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

      if (!allServicesHaveSpecialistAndTime) {
        toast.error(
          'Debes asignar especialista y horario a todos los servicios'
        )
        setIsSubmitting(false)
        return
      }

      if (!appointment && firstServiceId && primarySpecialistId) {
        const validation = await validateAppointmentAction({
          businessId: values.business_id,
          serviceId: firstServiceId,
          specialistId: primarySpecialistId,
          date: values.date,
          startTime: values.start_time,
        })

        if (!validation.valid) {
          toast.error(validation.error || 'El horario ya no está disponible')
          setIsSubmitting(false)
          return
        }
      }

      if (!appointment && supplies.length > 0) {
        const stockValidation = await validateStockForSuppliesAction(
          supplies.map((s) => ({
            product_id: s.product_id,
            quantity_required: s.quantity,
          }))
        )

        if (!stockValidation.valid) {
          const insufficientItems = stockValidation.insufficientStock
            .map(
              (item) =>
                `${item.product_name} (faltan ${item.shortage.toFixed(2)})`
            )
            .join(', ')
          toast.error(`Stock insuficiente: ${insufficientItems}`)
          setIsSubmitting(false)
          return
        }
      }

      const startDateTime = new Date(`${values.date}T${values.start_time}:00`)
      const endDateTime = new Date(`${values.date}T${values.end_time}:00`)

      const appointmentData = {
        business_id: values.business_id,
        specialist_id: primarySpecialistId || values.specialist_id || '',
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

      const servicesData: AppointmentServiceInput[] = selectedServices.map(
        (s) => {
          const assignment = serviceSpecialistAssignments.find(
            (a) => a.serviceId === s.id
          )
          // Build full datetime strings for start_time and end_time
          const serviceStartTime = assignment?.startTime
            ? new Date(
                `${values.date}T${assignment.startTime}:00`
              ).toISOString()
            : null
          const serviceEndTime = assignment?.endTime
            ? new Date(`${values.date}T${assignment.endTime}:00`).toISOString()
            : null

          return {
            service_id: s.id,
            specialist_id:
              assignment?.specialistId || primarySpecialistId || null,
            price_at_booking_cents: s.price_cents,
            duration_minutes: s.duration_minutes,
            start_time: serviceStartTime,
            end_time: serviceEndTime,
          }
        }
      )

      const suppliesData: AppointmentSupplyInput[] = supplies.map((s) => ({
        product_id: s.product_id,
        quantity_used: s.quantity,
        unit_price_cents: s.unit_price_cents,
      }))

      let result
      if (appointment?.id) {
        result = await appointmentService.updateItem(
          {
            ...appointmentData,
            id: appointment.id,
          },
          {
            services: servicesData,
            supplies: suppliesData,
          }
        )
      } else {
        result = await appointmentService.createItem(
          appointmentData,
          servicesData,
          suppliesData
        )
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
      <DialogContent
        className="sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] !grid !grid-rows-[auto_1fr]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {appointment ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col min-h-0 overflow-hidden">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
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
                    stockStatusMap={stockStatusMap}
                    onServiceSelect={checkService}
                  />
                  {selectedServices.length === 0 && (
                    <p className="text-sm text-destructive">
                      Selecciona al menos un servicio
                    </p>
                  )}
                </FormItem>

                {/* Supplies Section */}
                <AppointmentSuppliesSection
                  serviceIds={selectedServices.map((s) => s.id)}
                  supplies={supplies}
                  onChange={setSupplies}
                  disabled={isSubmitting}
                />

                {/* Price Summary */}
                {selectedServices.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Resumen de Precios
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Servicios (sin IVA)
                        </span>
                        <span>
                          $
                          {(
                            (priceCalculations.subtotal -
                              priceCalculations.suppliesCost) /
                            100
                          ).toLocaleString('es-CO', {
                            minimumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      {priceCalculations.suppliesCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Insumos</span>
                          <span>
                            $
                            {(
                              priceCalculations.suppliesCost / 100
                            ).toLocaleString('es-CO', {
                              minimumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IVA (19%)</span>
                        <span>
                          $
                          {(priceCalculations.tax / 100).toLocaleString(
                            'es-CO',
                            { minimumFractionDigits: 0 }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Descuento
                          </span>
                          <div className="relative w-20">
                            <NumericInput
                              min={0}
                              value={discountPercent}
                              onChange={(val) => {
                                const value = Math.min(
                                  100,
                                  Math.max(0, val ?? 0)
                                )
                                setDiscountPercent(value)
                              }}
                              className="h-7 pr-7 text-right text-sm"
                              disabled={isSubmitting}
                              allowDecimals={false}
                            />
                            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                        {priceCalculations.discount > 0 && (
                          <span className="text-green-600">
                            -$
                            {(priceCalculations.discount / 100).toLocaleString(
                              'es-CO',
                              { minimumFractionDigits: 0 }
                            )}
                          </span>
                        )}
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-base">
                        <span>Total</span>
                        <span>
                          $
                          {(priceCalculations.total / 100).toLocaleString(
                            'es-CO',
                            { minimumFractionDigits: 0 }
                          )}
                        </span>
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
                      <Popover
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            disabled={
                              isSubmitting || selectedServices.length === 0
                            }
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

                {/* Step 4: Specialist & Time Assignment */}
                {selectedServices.length > 0 && currentDate && (
                  <FormItem>
                    <FormLabel>4. Especialista y Horario</FormLabel>
                    <ServiceSpecialistAssignmentComponent
                      businessId={currentBusinessId || effectiveBusinessId}
                      services={selectedServices}
                      date={currentDate}
                      value={serviceSpecialistAssignments}
                      onChange={handleServiceSpecialistAssignmentsChange}
                      onPrimarySpecialistChange={handlePrimarySpecialistChange}
                      onTimesCalculated={handleTimesCalculated}
                      disabled={isSubmitting}
                      excludeAppointmentId={appointment?.id}
                    />
                  </FormItem>
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
                            <SelectItem value="CONFIRMED">
                              Confirmada
                            </SelectItem>
                            <SelectItem value="COMPLETED">
                              Completada
                            </SelectItem>
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
                              <SelectItem value="AT_VENUE">
                                En el local
                              </SelectItem>
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
                              <SelectItem value="REFUNDED">
                                Reembolsado
                              </SelectItem>
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
                  disabled={
                    isSubmitting ||
                    (!appointment && hasInsufficientStock(supplies)) ||
                    (!appointment && !allServicesHaveSpecialistAndTime)
                  }
                >
                  {isSubmitting
                    ? 'Guardando...'
                    : appointment
                    ? 'Actualizar Cita'
                    : 'Crear Cita'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
