'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AppointmentWithDetails } from '@/lib/models/appointment/appointment'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  Package,
  Mail,
  Phone,
} from 'lucide-react'
import Loading from '@/components/ui/loading'

interface AppointmentDetailsModalProps {
  appointmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AppointmentDetailsModal({
  appointmentId,
  open,
  onOpenChange,
}: AppointmentDetailsModalProps) {
  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const appointmentService = new AppointmentService()

  useEffect(() => {
    if (!appointmentId || !open) return

    const fetchAppointmentDetails = async () => {
      try {
        setIsLoading(true)
        const data = await appointmentService.getById(appointmentId)
        setAppointment(data as AppointmentWithDetails)
      } catch (error) {
        console.error('Error fetching appointment details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointmentDetails()
  }, [appointmentId, open])

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la Cita</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loading className="w-8 h-8" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!appointment) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusTranslations: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No Asistió',
  }

  const paymentStatusTranslations: Record<string, string> = {
    PAID: 'Pagado',
    PENDING: 'Pendiente',
    FAILED: 'Fallido',
    REFUNDED: 'Reembolsado',
  }

  const getStatusStyles = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      CANCELLED: { bg: 'bg-[#e2e8f0]', text: 'text-[#475569]' },
      CONFIRMED: { bg: 'bg-[#a3b4f7]', text: 'text-[#1e293b]' },
      COMPLETED: { bg: 'bg-[#86efac]', text: 'text-[#1e293b]' },
      PENDING: { bg: 'bg-[#fde68a]', text: 'text-[#1e293b]' },
      NO_SHOW: { bg: 'bg-[#c4b5fd]', text: 'text-[#1e293b]' },
    }
    return styles[status] || { bg: 'bg-[#a3b4f7]', text: 'text-[#1e293b]' }
  }

  const statusStyle = getStatusStyles(appointment.status)
  const statusText =
    statusTranslations[appointment.status] || appointment.status
  const paymentStatusText =
    paymentStatusTranslations[appointment.payment_status] ||
    appointment.payment_status

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Detalles de la Cita</span>
            <Badge
              variant={
                appointment.payment_status === 'PAID' ? 'default' : 'secondary'
              }
            >
              {paymentStatusText}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <span
              className={`px-3 py-1.5 rounded-md font-medium text-sm ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusText}
            </span>
          </div>

          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Fecha</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(appointment.start_time)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Horario</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(appointment.start_time)} -{' '}
                  {formatTime(appointment.end_time)}
                </p>
              </div>
            </div>

            {appointment.user_profile && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Cliente</p>
                  {appointment.user_profile.user && (
                    <div className="space-y-1 mt-1">
                      {appointment.user_profile.user.name && (
                        <p className="text-sm text-muted-foreground">
                          {appointment.user_profile.user.name}
                        </p>
                      )}
                      {appointment.user_profile.user.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{appointment.user_profile.user.email}</span>
                        </div>
                      )}
                      {appointment.user_profile.user.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{appointment.user_profile.user.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {appointment.specialist && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {appointment.specialist.profile_picture_url ? (
                      <img
                        src={appointment.specialist.profile_picture_url}
                        alt={appointment.specialist.first_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {appointment.specialist.first_name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {appointment.specialist.first_name}{' '}
                      {appointment.specialist.last_name}
                    </p>
                    {appointment.specialist.specialty && (
                      <p className="text-xs text-muted-foreground">
                        {appointment.specialist.specialty}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {appointment.appointment_services &&
              appointment.appointment_services.length > 0 && (
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-2">Servicios</p>
                    <div className="space-y-2">
                      {appointment.appointment_services.map(
                        (appointmentService) => (
                          <div
                            key={appointmentService.id}
                            className="flex justify-between text-sm border-b pb-2"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {appointmentService.service.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {appointmentService.service
                                  .service_category && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-1.5 py-0"
                                  >
                                    {
                                      appointmentService.service
                                        .service_category.name
                                    }
                                  </Badge>
                                )}
                                <span>
                                  {appointmentService.duration_minutes} min
                                </span>
                              </div>
                              {appointmentService.service.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {appointmentService.service.description}
                                </p>
                              )}
                            </div>
                            <p className="font-medium ml-2">
                              $
                              {(
                                appointmentService.price_at_booking_cents / 100
                              ).toFixed(2)}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium mb-2">Resumen de Pago</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      ${(appointment.subtotal_cents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impuesto</span>
                    <span>${(appointment.tax_cents / 100).toFixed(2)}</span>
                  </div>
                  {appointment.discount_cents > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento</span>
                      <span>
                        -${(appointment.discount_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total</span>
                    <span>
                      ${(appointment.total_price_cents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Método de pago: {appointment.payment_method}
                </p>
              </div>
            </div>

            {appointment.customer_note && (
              <div className="border-t pt-4">
                <p className="font-medium mb-1">Nota del Cliente</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.customer_note}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1">
              Editar
            </Button>
            <Button variant="outline" className="flex-1">
              Cancelar Cita
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
