'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Loading from '@/components/ui/loading'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'
import type { FormTemplate } from '@/lib/models/form-template/form-template'
import MedicalRecordService from '@/lib/services/medical-record/medical-record-service'
import FormTemplateService from '@/lib/services/form-template/form-template-service'
import SendSignatureModal from './SendSignatureModal'
import { SignatureLinkShare } from './SignatureLinkShare'
import { MedicalRecordHeader } from './components/MedicalRecordHeader'
import { PatientInfoTab } from './components/PatientInfoTab'
import { ClinicalDataTab } from './components/ClinicalDataTab'
import { TemplateFormTab } from './components/TemplateFormTab'
import { SignaturesTab } from './components/SignaturesTab'
import { AttachmentsTab } from './components/AttachmentsTab'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useUnifiedPermissionsStore } from '@/lib/store/unified-permissions-store'
import { toast } from 'sonner'

interface MedicalRecordDetailModalProps {
  recordId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

export default function MedicalRecordDetailModal({
  recordId,
  open,
  onOpenChange,
  onRefresh,
}: MedicalRecordDetailModalProps) {
  const { activeBusiness } = useActiveBusinessStore()
  const { businessAccountId } = useUnifiedPermissionsStore()
  const [record, setRecord] = useState<MedicalRecordWithDetails | null>(null)
  const [template, setTemplate] = useState<FormTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)

  useEffect(() => {
    if (open && recordId) {
      loadRecord()
    }
  }, [open, recordId])

  const loadRecord = async () => {
    if (!recordId) return
    setLoading(true)
    try {
      const service = new MedicalRecordService()
      const data = await service.getById(recordId)
      setRecord(data)

      // Cargar template si existe
      if (data?.form_template_id) {
        const templateService = new FormTemplateService()
        const templateData = await templateService.getById(
          data.form_template_id
        )
        setTemplate(templateData)
      } else {
        setTemplate(null)
      }
    } catch (error) {
      console.error('Error loading record:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignatureSuccess = () => {
    loadRecord()
    onRefresh?.()
  }

  const handleLinkGenerated = () => {
    loadRecord()
    onRefresh?.()
    toast.success('Enlace de firma generado exitosamente')
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px]">
          <div className="flex items-center justify-center py-12">
            <Loading className="h-8 w-8" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!record) {
    return null
  }

  const isSigned = !!record.signature_data

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl max-h-screen sm:max-h-[90vh] overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              <MedicalRecordHeader record={record} />
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
            <Tabs defaultValue="clinical" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="clinical">Paciente</TabsTrigger>
                <TabsTrigger value="template">Formulario</TabsTrigger>
                <TabsTrigger value="details">Clínico</TabsTrigger>
                <TabsTrigger value="signatures">Firmas</TabsTrigger>
                <TabsTrigger value="attachments">Archivos</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 pt-4">
                {/* Tab Paciente */}
                <TabsContent value="clinical" className="space-y-6 mt-0">
                  <PatientInfoTab record={record} />
                </TabsContent>

                {/* Tab Formulario */}
                <TabsContent value="template" className="space-y-6 mt-0">
                  <TemplateFormTab record={record} template={template} />
                </TabsContent>

                {/* Tab Clínica */}
                <TabsContent value="details" className="space-y-6 mt-0">
                  <ClinicalDataTab record={record} />
                </TabsContent>

                {/* Tab Firmas */}
                <TabsContent value="signatures" className="space-y-6 mt-0">
                  <SignaturesTab record={record} />
                </TabsContent>

                {/* Tab Archivos */}
                <TabsContent value="attachments" className="space-y-6 mt-0">
                  <AttachmentsTab record={record} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer sticky */}
          <DialogFooter className="pt-4 border-t mt-4">
            <div className="flex flex-col sm:flex-row w-full gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              {!isSigned && activeBusiness && businessAccountId && (
                <div className="flex gap-2">
                  <SignatureLinkShare
                    medicalRecordId={record.id}
                    onLinkGenerated={handleLinkGenerated}
                  />
                  <Button onClick={() => setSignatureModalOpen(true)}>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para Firma
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de envío de firma */}
      {activeBusiness && businessAccountId && record && (
        <SendSignatureModal
          open={signatureModalOpen}
          onOpenChange={setSignatureModalOpen}
          medicalRecordId={record.id}
          businessAccountId={businessAccountId}
          businessId={activeBusiness.id}
          businessName={activeBusiness.name}
          customerName={`${record.customer?.first_name || ''} ${
            record.customer?.last_name || ''
          }`.trim()}
          customerPhone={record.customer?.phone || undefined}
          customerEmail={record.customer?.email || undefined}
          recordDate={record.record_date}
          onSuccess={handleSignatureSuccess}
        />
      )}
    </>
  )
}
