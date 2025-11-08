'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import ServiceService from '@/lib/services/service/service-service'
import type { Appointment } from '@/lib/models/appointment/appointment'
import type { Specialist } from '@/lib/models/specialist/specialist'
import type { Service } from '@/lib/models/service/service'
import { useCurrentUser } from '@/hooks/use-current-user'

const appointmentFormSchema = z.object({
  business_id: z.string().min(1, 'El negocio es requerido'),
  specialist_id: z.string().min(1, 'El especialista es requerido'),
  users_profile_id: z.string().min(1, 'El cliente es requerido'),
  start_time: z.string().min(1, 'La fecha y hora de inicio es requerida'),
  end_time: z.string().min(1, 'La fecha y hora de fin es requerida'),
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
  defaultStartTime?: Date
  defaultEndTime?: Date
}

export default function AppointmentFormModal({
  appointment,
  open,
  onOpenChange,
  onSuccess,
  defaultStartTime,
  defaultEndTime,
}: AppointmentFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [services, setServices] = useState<Service[]>([])
  const { user, businessAccountId } = useCurrentUser()
  const appointmentService = new AppointmentService()
  const serviceService = new ServiceService()

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      business_id: '',
      specialist_id: '',
      users_profile_id: user?.user_profile_id || '',
      start_time: defaultStartTime
        ? new Date(defaultStartTime.getTime() - defaultStartTime.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : '',
      end_time: defaultEndTime
        ? new Date(defaultEndTime.getTime() - defaultEndTime.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : '',
      status: 'CONFIRMED',
      customer_note: '',
      payment_method: 'AT_VENUE',
      payment_status: 'UNPAID',
    },
  })

  useEffect(() => {
    if (appointment) {
      form.reset({
        business_id: appointment.business_id,
        specialist_id: appointment.specialist_id,
        users_profile_id: appointment.users_profile_id,
        start_time: new Date(appointment.start_time).toISOString().slice(0, 16),
        end_time: new Date(appointment.end_time).toISOString().slice(0, 16),
        status: appointment.status,
        customer_note: appointment.customer_note || '',
        payment_method: appointment.payment_method,
        payment_status: appointment.payment_status,
      })
    }
  }, [appointment, form])

  useEffect(() => {
    if (open && businessAccountId) {
      // TODO: Cargar especialistas del negocio
      // TODO: Cargar servicios del negocio
    }
  }, [open, businessAccountId])

  async function onSubmit(values: AppointmentFormData) {
    try {
      setIsSubmitting(true)

      const appointmentData = {
        ...values,
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        subtotal_cents: 0,
        tax_cents: 0,
        discount_cents: 0,
        total_price_cents: 0,
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
          appointment ? 'Cita actualizada exitosamente' : 'Cita creada exitosamente'
        )
        onOpenChange(false)
        form.reset()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="business_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Negocio</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un negocio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="temp">Negocio temporal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialist_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialista</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un especialista" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {specialists.length === 0 ? (
                        <SelectItem value="temp">No hay especialistas disponibles</SelectItem>
                      ) : (
                        specialists.map((specialist) => (
                          <SelectItem key={specialist.id} value={specialist.id}>
                            {specialist.first_name} {specialist.last_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora de Inicio</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
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
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora de Fin</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
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
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona método de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AT_VENUE">En el local</SelectItem>
                        <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
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
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
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
