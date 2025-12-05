'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Banknote, CreditCard, Trash2, Download, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import type { AppointmentPaymentWithCreator } from '@/lib/models/appointment-payment/appointment-payment'
import type { PaymentMethod } from '@/lib/types/enums'
import { downloadPaymentReceiptPDF, type PaymentReceiptData } from '@/lib/utils/payment-receipt'
import WhatsAppService from '@/lib/services/whatsapp/whatsapp-service'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  AT_VENUE: 'Efectivo',
  CREDIT_CARD: 'Tarjeta',
  NEQUI: 'Nequi',
  PAYPAL: 'PayPal',
}

const PaymentMethodIcon = ({ method }: { method: PaymentMethod }) => {
  if (method === 'AT_VENUE') {
    return <Banknote className="h-4 w-4 text-green-600" />
  }
  return <CreditCard className="h-4 w-4 text-blue-600" />
}

export interface PaymentContext {
  businessName: string
  businessAddress?: string
  businessPhone?: string
  businessNit?: string
  businessAccountId?: string
  customerName: string
  customerPhone?: string
  appointmentDate: string
  services: Array<{ name: string; price_cents: number }>
  totalPriceCents: number
  totalPaidCents: number
  balanceDueCents: number
}

interface PaymentHistorySectionProps {
  payments: AppointmentPaymentWithCreator[]
  onDeletePayment?: (paymentId: string) => void
  isDeleting?: boolean
  showDelete?: boolean
  context?: PaymentContext
}

export default function PaymentHistorySection({
  payments,
  onDeletePayment,
  isDeleting = false,
  showDelete = true,
  context,
}: PaymentHistorySectionProps) {
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null)

  const handleDownloadPDF = (payment: AppointmentPaymentWithCreator) => {
    if (!context) {
      toast.error('No hay información suficiente para generar el comprobante')
      return
    }

    try {
      const receiptData: PaymentReceiptData = {
        payment,
        businessName: context.businessName,
        businessAddress: context.businessAddress,
        businessPhone: context.businessPhone,
        businessNit: context.businessNit,
        customerName: context.customerName,
        appointmentDate: context.appointmentDate,
        services: context.services,
        totalPriceCents: context.totalPriceCents,
        totalPaidCents: context.totalPaidCents,
        balanceDueCents: context.balanceDueCents,
      }

      downloadPaymentReceiptPDF(receiptData)
      toast.success('Comprobante descargado')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error al generar el comprobante')
    }
  }

  const handleSendWhatsApp = async (payment: AppointmentPaymentWithCreator) => {
    if (!context) {
      toast.error('No hay información suficiente para enviar el comprobante')
      return
    }

    if (!context.customerPhone) {
      toast.error('El cliente no tiene número de WhatsApp registrado')
      return
    }

    if (!context.businessAccountId) {
      toast.error('El negocio no tiene configuración de WhatsApp')
      return
    }

    setSendingWhatsApp(payment.id)
    try {
      const whatsappService = new WhatsAppService()
      const result = await whatsappService.sendPaymentReceipt({
        business_account_id: context.businessAccountId,
        business_id: payment.business_id,
        customer_phone: context.customerPhone,
        customer_name: context.customerName,
        business_name: context.businessName,
        business_address: context.businessAddress,
        business_phone: context.businessPhone,
        business_nit: context.businessNit,
        payment_amount_cents: payment.amount_cents,
        payment_method: PAYMENT_METHOD_LABELS[payment.payment_method],
        payment_date: new Date(payment.payment_date),
        payment_notes: payment.notes || undefined,
        receipt_number: payment.id.slice(0, 8).toUpperCase(),
        appointment_date: new Date(context.appointmentDate),
        services: context.services,
        total_price_cents: context.totalPriceCents,
        total_paid_cents: context.totalPaidCents,
        balance_due_cents: context.balanceDueCents,
      })

      if (result.success) {
        toast.success('Comprobante enviado por WhatsApp')
      } else {
        toast.error(result.error || 'Error al enviar el comprobante')
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error)
      toast.error(error.message || 'Error al enviar el comprobante')
    } finally {
      setSendingWhatsApp(null)
    }
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No hay abonos registrados
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <PaymentMethodIcon method={payment.payment_method} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    ${(payment.amount_cents / 100).toLocaleString('es-CO')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[payment.payment_method]}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(payment.payment_date), "d MMM yyyy, HH:mm", {
                    locale: es,
                  })}
                  {payment.creator?.user?.name && (
                    <span> • {payment.creator.user.name}</span>
                  )}
                </div>
                {payment.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {payment.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {context && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleDownloadPDF(payment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Descargar PDF</TooltipContent>
                  </Tooltip>

                  {context.customerPhone && context.businessAccountId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-green-600"
                          onClick={() => handleSendWhatsApp(payment)}
                          disabled={sendingWhatsApp === payment.id}
                        >
                          {sendingWhatsApp === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MessageCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Enviar por WhatsApp</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}

              {showDelete && onDeletePayment && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar abono?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará el abono de $
                        {(payment.amount_cents / 100).toLocaleString('es-CO')} y
                        actualizará el saldo pendiente de la cita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeletePayment(payment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}
