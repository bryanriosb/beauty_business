'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Banknote, CreditCard, Trash2 } from 'lucide-react'
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
import type { AppointmentPaymentWithCreator } from '@/lib/models/appointment-payment/appointment-payment'
import type { PaymentMethod } from '@/lib/types/enums'

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

interface PaymentHistorySectionProps {
  payments: AppointmentPaymentWithCreator[]
  onDeletePayment?: (paymentId: string) => void
  isDeleting?: boolean
  showDelete?: boolean
}

export default function PaymentHistorySection({
  payments,
  onDeletePayment,
  isDeleting = false,
  showDelete = true,
}: PaymentHistorySectionProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No hay abonos registrados
      </div>
    )
  }

  return (
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
      ))}
    </div>
  )
}
