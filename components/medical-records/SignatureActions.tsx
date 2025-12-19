'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import { Send, QrCode, MoreHorizontal, MessageCircle, Mail, FileText, Smartphone } from 'lucide-react'
import { SignatureLinkShare } from './SignatureLinkShare'
import SendSignatureModal from './SendSignatureModal'

interface SignatureActionsProps {
  medicalRecordId: string
  businessAccountId: string
  businessId: string
  businessName: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  recordDate: string
  onActionComplete?: () => void
}

export function SignatureActions({
  medicalRecordId,
  businessAccountId,
  businessId,
  businessName,
  customerName,
  customerPhone,
  customerEmail,
  recordDate,
  onActionComplete
}: SignatureActionsProps) {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleSendSignature = () => {
    setIsSendModalOpen(true)
  }

  const handleActionComplete = () => {
    onActionComplete?.()
    setIsSendModalOpen(false)
  }

  // Si tiene teléfono y email, mostrar botón principal de enviar y dropdown con más opciones
  const hasMultipleChannels = customerPhone && customerEmail

  if (hasMultipleChannels) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Firmar
              <MoreHorizontal className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Opciones de envío */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Send className="mr-4 !h-4 !w-4 text-muted-foreground" />
                Enviar para firma
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => handleSendSignature}
                    disabled={!customerPhone}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                    {!customerPhone && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (sin tel.)
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSendSignature}
                    disabled={!customerEmail}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                    {!customerEmail && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (sin email)
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSendSignature}
                    disabled={!customerPhone}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    SMS
                    {!customerPhone && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (sin tel.)
                      </span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            
            <DropdownMenuSeparator />
            
            {/* Opción de generar enlace */}
            <DropdownMenuItem asChild>
              <SignatureLinkShare 
                medicalRecordId={medicalRecordId}
                onLinkGenerated={handleActionComplete}
              >
                <div className="flex items-center w-full">
                  <QrCode className="w-4 h-4 mr-2" />
                  Generar enlace
                </div>
              </SignatureLinkShare>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <SendSignatureModal
          open={isSendModalOpen}
          onOpenChange={setIsSendModalOpen}
          medicalRecordId={medicalRecordId}
          businessAccountId={businessAccountId}
          businessId={businessId}
          businessName={businessName}
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          recordDate={recordDate}
          onSuccess={handleActionComplete}
        />
      </>
    )
  }

  // Si solo tiene un canal o ninguno, mostrar botones individuales
  return (
    <div className="flex items-center gap-2">
      {customerPhone && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSendSignature}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
      )}
      
      {customerEmail && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSendSignature}
        >
          <Mail className="w-4 h-4 mr-2" />
          Email
        </Button>
      )}
      
      <SignatureLinkShare 
        medicalRecordId={medicalRecordId}
        onLinkGenerated={handleActionComplete}
      />

      <SendSignatureModal
        open={isSendModalOpen}
        onOpenChange={setIsSendModalOpen}
        medicalRecordId={medicalRecordId}
        businessAccountId={businessAccountId}
        businessId={businessId}
        businessName={businessName}
        customerName={customerName}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        recordDate={recordDate}
        onSuccess={handleActionComplete}
      />
    </div>
  )
}