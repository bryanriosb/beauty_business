'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Send, MessageCircle, Mail, Smartphone, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import SignatureRequestService from '@/lib/services/signature-request/signature-request-service'
import type { SignatureRequestChannel } from '@/lib/models/signature-request/signature-request'

interface SendSignatureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medicalRecordId: string
  businessAccountId: string
  businessId: string
  businessName: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  recordDate: string
  onSuccess?: () => void
}

export default function SendSignatureModal({
  open,
  onOpenChange,
  medicalRecordId,
  businessAccountId,
  businessId,
  businessName,
  customerName,
  customerPhone,
  customerEmail,
  recordDate,
  onSuccess,
}: SendSignatureModalProps) {
  const [channel, setChannel] = useState<SignatureRequestChannel>('whatsapp')
  const [contact, setContact] = useState(customerPhone || customerEmail || '')
  const [isSending, setIsSending] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const service = new SignatureRequestService()

  const handleSend = async () => {
    if (!contact.trim()) {
      toast.error('Por favor ingrese el contacto del cliente')
      return
    }

    setIsSending(true)

    try {
      const result = await service.sendSignatureRequest({
        medicalRecordId,
        channel,
        businessAccountId,
        businessId,
        businessName,
        customerName,
        customerContact: contact.trim(),
        recordDate,
      })

      if (result.success) {
        setSignatureUrl(result.signature_url || null)
        toast.success('Solicitud de firma enviada exitosamente')
        onSuccess?.()
      } else {
        toast.error(result.error || 'Error al enviar la solicitud')
      }
    } catch {
      toast.error('Error al enviar la solicitud de firma')
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyLink = async () => {
    if (!signatureUrl) return

    try {
      await navigator.clipboard.writeText(signatureUrl)
      setCopied(true)
      toast.success('Enlace copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Error al copiar el enlace')
    }
  }

  const handleClose = () => {
    setSignatureUrl(null)
    setCopied(false)
    onOpenChange(false)
  }

  const channelLabel = {
    whatsapp: 'WhatsApp',
    email: 'Correo electrónico',
    sms: 'SMS',
  }

  const channelPlaceholder = {
    whatsapp: 'Número de WhatsApp (ej: 573001234567)',
    email: 'Correo electrónico',
    sms: 'Número de celular (ej: 573001234567)',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar para Firma
          </DialogTitle>
          <DialogDescription>
            Envía un enlace al paciente para que firme su historia clínica
            digitalmente.
          </DialogDescription>
        </DialogHeader>

        {signatureUrl ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ¡Enlace enviado exitosamente por {channelLabel[channel]}!
              </p>
            </div>

            <div className="space-y-2">
              <Label>Enlace de firma</Label>
              <div className="flex gap-2">
                <Input
                  value={signatureUrl}
                  readOnly
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                También puedes compartir este enlace manualmente.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Canal de envío</Label>
              <RadioGroup
                value={channel}
                onValueChange={(v) => {
                  setChannel(v as SignatureRequestChannel)
                  // Auto-fill contact based on channel
                  if (v === 'whatsapp' || v === 'sms') {
                    setContact(customerPhone || '')
                  } else if (v === 'email') {
                    setContact(customerEmail || '')
                  }
                }}
                className="grid grid-cols-3 gap-2"
              >
                <div>
                  <RadioGroupItem
                    value="whatsapp"
                    id="channel-whatsapp"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-whatsapp"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <MessageCircle className="h-5 w-5 mb-1" />
                    <span className="text-xs">WhatsApp</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="email"
                    id="channel-email"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-email"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Mail className="h-5 w-5 mb-1" />
                    <span className="text-xs">Email</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="sms"
                    id="channel-sms"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-sms"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Smartphone className="h-5 w-5 mb-1" />
                    <span className="text-xs">SMS</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">
                {channel === 'email' ? 'Correo electrónico' : 'Número de teléfono'}
              </Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={channelPlaceholder[channel]}
                disabled={isSending}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p>
                <strong>Paciente:</strong> {customerName}
              </p>
              <p>
                <strong>Fecha:</strong>{' '}
                {new Date(recordDate).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSending}
              >
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={isSending || !contact.trim()}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
