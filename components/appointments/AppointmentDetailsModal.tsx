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
import type { Invoice } from '@/lib/models/invoice/invoice'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import InvoiceService from '@/lib/services/invoice/invoice-service'
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  Package,
  Mail,
  Phone,
  FileText,
} from 'lucide-react'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import StatusSelector from './StatusSelector'
import type { AppointmentStatus } from '@/lib/types/enums'

interface AppointmentDetailsModalProps {
  appointmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (appointment: AppointmentWithDetails) => void
  onCancel?: (appointmentId: string) => void
  onStatusChange?: () => void
  businessData?: {
    name: string
    address?: string
    phone?: string
    nit?: string
  }
  onViewInvoice?: (invoice: Invoice) => void
}

export default function AppointmentDetailsModal({
  appointmentId,
  open,
  onOpenChange,
  onEdit,
  onCancel,
  onStatusChange,
  businessData,
  onViewInvoice,
}: AppointmentDetailsModalProps) {
  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(
    null
  )
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const appointmentService = new AppointmentService()
  const invoiceService = new InvoiceService()

  useEffect(() => {
    if (!appointmentId || !open) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [appointmentData, invoiceData] = await Promise.all([
          appointmentService.getById(appointmentId),
          invoiceService.getByAppointment(appointmentId),
        ])
        setAppointment(appointmentData as AppointmentWithDetails)
        setInvoice(invoiceData)
      } catch (error) {
        console.error('Error fetching appointment details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [appointmentId, open])

  const handleGenerateInvoice = async () => {
    if (!appointment || !businessData) return

    setIsGeneratingInvoice(true)
    try {
      const result = await invoiceService.createFromAppointment(appointment.id, {
        business_name: businessData.name,
        business_address: businessData.address,
        business_phone: businessData.phone,
        business_nit: businessData.nit,
      })

      if (result.success && result.data) {
        setInvoice(result.data)
        toast.success('Factura generada correctamente')
      } else {
        toast.error(result.error || 'Error al generar la factura')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al generar la factura')
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!appointment) return

    setIsUpdatingStatus(true)
    try {
      const result = await appointmentService.updateItem({
        id: appointment.id,
        status: newStatus,
      })

      if (result.success) {
        const updatedAppointment = await appointmentService.getById(appointment.id)
        setAppointment(updatedAppointment as AppointmentWithDetails)
        toast.success('Estado actualizado correctamente')
        onStatusChange?.()
      } else {
        toast.error(result.error || 'Error al actualizar el estado')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

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

  const paymentStatusTranslations: Record<string, string> = {
    PAID: 'Pagado',
    PENDING: 'Pendiente',
    UNPAID: 'Sin Pagar',
    FAILED: 'Fallido',
    REFUNDED: 'Reembolsado',
  }

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
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Estado de la cita:</span>
            <StatusSelector
              value={appointment.status}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus}
            />
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

          {appointment.payment_status === 'PAID' && businessData && (
            <div className="border-t pt-4">
              {invoice ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onViewInvoice?.(invoice)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Factura {invoice.invoice_number}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateInvoice}
                  disabled={isGeneratingInvoice}
                >
                  {isGeneratingInvoice ? (
                    <Loading className="mr-2 h-4 w-4" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {isGeneratingInvoice ? 'Generando...' : 'Generar Factura'}
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (appointment && onEdit) {
                  onOpenChange(false)
                  onEdit(appointment)
                }
              }}
            >
              Editar
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => {
                if (appointment && onCancel) {
                  onCancel(appointment.id)
                }
              }}
              disabled={appointment?.status === 'CANCELLED'}
            >
              {appointment?.status === 'CANCELLED' ? 'Cancelada' : 'Cancelar Cita'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
