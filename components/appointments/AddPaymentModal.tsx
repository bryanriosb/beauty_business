'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NumericInput } from '@/components/ui/numeric-input'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import { createPaymentAction } from '@/lib/actions/appointment-payment'
import type { PaymentMethod } from '@/lib/types/enums'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'AT_VENUE', label: 'Efectivo' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'PAYPAL', label: 'PayPal' },
]

interface AddPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
  businessId: string
  balanceDueCents: number
  onPaymentAdded: () => void
  createdBy?: string
}

export default function AddPaymentModal({
  open,
  onOpenChange,
  appointmentId,
  businessId,
  balanceDueCents,
  onPaymentAdded,
  createdBy,
}: AddPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('AT_VENUE')
  const [notes, setNotes] = useState('')

  const balanceDue = balanceDueCents / 100

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    const amountCents = Math.round(amount * 100)

    if (amountCents > balanceDueCents) {
      toast.error(
        `El abono no puede exceder el saldo pendiente de $${balanceDue.toLocaleString(
          'es-CO'
        )}`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createPaymentAction({
        appointment_id: appointmentId,
        business_id: businessId,
        amount_cents: amountCents,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
        created_by: createdBy,
      })

      if (result.success) {
        toast.success('Abono registrado correctamente')
        resetForm()
        onOpenChange(false)
        onPaymentAdded()
      } else {
        toast.error(result.error || 'Error al registrar el abono')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setAmount(null)
    setPaymentMethod('AT_VENUE')
    setNotes('')
  }

  const handlePayFullBalance = () => {
    setAmount(balanceDue)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Abono</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">
              Saldo Pendiente
            </span>
            <span className="text-lg font-semibold">
              ${balanceDue.toLocaleString('es-CO')}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto del Abono *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <NumericInput
                  id="amount"
                  value={amount}
                  onChange={setAmount}
                  allowDecimals={true}
                  decimalPlaces={2}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePayFullBalance}
                className="whitespace-nowrap"
              >
                Pagar todo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago</Label>
            <Select
              value={paymentMethod}
              onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
            >
              <SelectTrigger id="paymentMethod" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre el pago..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !amount}>
            {isSubmitting ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Registrando...
              </>
            ) : (
              'Registrar Abono'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
