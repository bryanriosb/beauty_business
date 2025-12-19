'use client'

import { useState } from 'react'
import { PenTool } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Loading from '@/components/ui/loading'
import SignaturePad from '@/components/signature/SignaturePad'
import { toast } from 'sonner'
import MedicalRecordService from '@/lib/services/medical-record/medical-record-service'

interface SpecialistSignatureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medicalRecordId: string
  onSuccess?: () => void
}

export default function SpecialistSignatureModal({
  open,
  onOpenChange,
  medicalRecordId,
  onSuccess,
}: SpecialistSignatureModalProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSignatureChange = (data: string | null) => {
    setSignatureData(data)
  }

  const handleSave = async () => {
    if (!signatureData) {
      toast.error('Por favor, firme antes de guardar')
      return
    }

    setIsSaving(true)
    try {
      const service = new MedicalRecordService()
      const result = await service.signAsSpecialist(medicalRecordId, signatureData)

      if (result.success) {
        toast.success('Firma registrada exitosamente')
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al guardar la firma')
      }
    } catch (error) {
      console.error('Error saving specialist signature:', error)
      toast.error('Error al guardar la firma')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setSignatureData(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Firma del Especialista
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Por favor, firme su nombre en el espacio de abajo para validar este
            registro médico.
          </p>

          <SignaturePad
            onSignatureChange={handleSignatureChange}
            width={600}
            height={300}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!signatureData || isSaving}
          >
            {isSaving ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : (
              'Guardar Firma'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}