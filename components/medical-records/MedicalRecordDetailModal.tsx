'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  FileText,
  Heart,
  Pill,
  Stethoscope,
  User,
  Activity,
  Send,
  PenLine,
  CheckCircle2,
  Clock,
  FileSignature,
  Paperclip,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Loading from '@/components/ui/loading'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'
import type {
  FormTemplate,
  FormField,
  FormSection,
} from '@/lib/models/form-template/form-template'
import MedicalRecordService from '@/lib/services/medical-record/medical-record-service'
import FormTemplateService from '@/lib/services/form-template/form-template-service'
import SendSignatureModal from './SendSignatureModal'
import { SignatureLinkShare } from './SignatureLinkShare'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useUnifiedPermissionsStore } from '@/lib/store/unified-permissions-store'
import { toast } from 'sonner'

interface MedicalRecordDetailModalProps {
  recordId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

const recordTypeLabels: Record<string, string> = {
  initial_assessment: 'Evaluación inicial',
  follow_up: 'Seguimiento',
  procedure: 'Procedimiento',
  consultation: 'Consulta',
  pre_operative: 'Pre-operatorio',
  post_operative: 'Post-operatorio',
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
  const hasSpecialistSignature = !!record.specialist_signature_data
  const hasAllergies =
    (record.allergies?.medications?.length ?? 0) > 0 ||
    (record.allergies?.products?.length ?? 0) > 0 ||
    (record.allergies?.other?.length ?? 0) > 0

  const hasMedicalHistory =
    (record.medical_history?.chronic_conditions?.length ?? 0) > 0 ||
    (record.medical_history?.previous_surgeries?.length ?? 0) > 0 ||
    (record.medical_history?.current_medications?.length ?? 0) > 0 ||
    (record.medical_history?.family_history?.length ?? 0) > 0

  const hasVitalSigns =
    record.vital_signs?.blood_pressure ||
    record.vital_signs?.heart_rate ||
    record.vital_signs?.temperature ||
    record.vital_signs?.weight ||
    record.vital_signs?.height

  const hasTreatmentPlan =
    record.treatment_plan?.diagnosis ||
    record.treatment_plan?.treatment ||
    (record.treatment_plan?.recommendations &&
      record.treatment_plan.recommendations.length > 0)

  const hasExtendedData =
    record.extended_data && Object.keys(record.extended_data).length > 0
  const hasAttachments = record.attachments && record.attachments.length > 0

  // Función para renderizar valores de campos dinámicos
  const renderFieldValue = (field: FormField, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground">-</span>
    }

    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'email':
        return <span className="text-sm">{value}</span>

      case 'number':
        return <span className="text-sm font-medium">{value}</span>

      case 'date':
        return (
          <span className="text-sm">
            {format(new Date(value), 'dd/MM/yyyy', { locale: es })}
          </span>
        )

      case 'yes_no_observation':
        if (typeof value === 'object') {
          const freqLabels: Record<string, string> = {
            yes: 'Sí',
            no: 'No',
            occasional: 'Ocasional',
          }
          return (
            <div>
              <Badge variant="outline">{freqLabels[value.answer] || '-'}</Badge>
              {value.observation && (
                <p className="text-sm text-muted-foreground mt-1">
                  {value.observation}
                </p>
              )}
            </div>
          )
        }
        return String(value)

      case 'frequency':
        if (typeof value === 'object') {
          const freqLabels: Record<string, string> = {
            yes: 'Sí',
            no: 'No',
            occasional: 'Ocasional',
          }
          return (
            <div>
              <Badge variant="outline">{freqLabels[value.answer] || '-'}</Badge>
              {value.observation && (
                <p className="text-sm text-muted-foreground mt-1">
                  {value.observation}
                </p>
              )}
            </div>
          )
        }
        return String(value)

      case 'measurement':
        if (typeof value === 'object') {
          return (
            <div className="flex gap-4">
              {value.initial !== null && value.initial !== undefined && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Inicial:
                  </span>
                  <span className="ml-1 font-medium">{value.initial}</span>
                </div>
              )}
              {value.final !== null && value.final !== undefined && (
                <div>
                  <span className="text-xs text-muted-foreground">Final:</span>
                  <span className="ml-1 font-medium">{value.final}</span>
                </div>
              )}
            </div>
          )
        }
        return String(value)

      case 'checkbox':
        return value === true ? (
          <Badge variant="default">Sí</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        )

      case 'select':
      case 'radio':
        return <Badge variant="outline">{String(value)}</Badge>

      default:
        return <span className="text-sm">{String(value)}</span>
    }
  }

  // Componente auxiliar para mostrar secciones
  function Section({
    icon: Icon,
    title,
    children,
    variant = 'default',
  }: {
    icon: React.ElementType
    title: string
    children: React.ReactNode
    variant?: 'default' | 'warning'
  }) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon
              className={`h-4 w-4 ${
                variant === 'warning'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    )
  }

  // Componente auxiliar para signos vitales
  function VitalSignItem({ label, value }: { label: string; value: string }) {
    return (
      <div className="text-center p-3 bg-muted rounded-lg">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl max-h-screen sm:max-h-[90vh] overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historia Clínica
              {isSigned && (
                <Badge variant="default" className="ml-2 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Firmada
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header info */}
            <div className="pb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {record.customer?.first_name} {record.customer?.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(
                      new Date(record.record_date),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: es }
                    )}
                  </span>
                </div>
                <Badge variant="outline">
                  {recordTypeLabels[record.record_type]}
                </Badge>
                {hasAllergies && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Alergias
                  </Badge>
                )}
              </div>

              {record.specialist && (
                <div className="text-sm text-muted-foreground">
                  <span>Atendido por: </span>
                  <span className="font-medium text-foreground">
                    {record.specialist.first_name} {record.specialist.last_name}
                  </span>
                </div>
              )}
            </div>

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
                  {/* Información completa del paciente */}
                  <Section icon={User} title="Datos del Paciente">
                    <div className="grid gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Datos personales */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Información Personal
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-3">
                              <div>
                                <span className="text-sm font-medium">
                                  Nombre completo:
                                </span>
                                <p className="text-lg font-semibold">
                                  {record.customer?.first_name}{' '}
                                  {record.customer?.last_name}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">
                                  Email:
                                </span>
                                <p className="text-sm">
                                  {record.customer?.email || 'No registrado'}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">
                                  Teléfono:
                                </span>
                                <p className="text-sm">
                                  {record.customer?.phone || 'No registrado'}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">
                                  ID Perfil:
                                </span>
                                <p className="font-mono text-xs text-muted-foreground">
                                  {record.customer?.user_profile_id ||
                                    'No registrado'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Estadísticas del paciente */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Estadísticas
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">
                                  Estado:
                                </span>
                                <Badge
                                  variant={
                                    record.customer?.status === 'active'
                                      ? 'default'
                                      : record.customer?.status === 'vip'
                                      ? 'default'
                                      : record.customer?.status === 'inactive'
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                >
                                  {record.customer?.status === 'active'
                                    ? 'Activo'
                                    : record.customer?.status === 'vip'
                                    ? 'VIP'
                                    : record.customer?.status === 'inactive'
                                    ? 'Inactivo'
                                    : record.customer?.status === 'blocked'
                                    ? 'Bloqueado'
                                    : 'Desconocido'}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">
                                  Total visitas:
                                </span>
                                <span className="text-lg font-semibold">
                                  {record.customer?.total_visits || 0}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">
                                  Total gastado:
                                </span>
                                <span className="text-lg font-semibold">
                                  $
                                  {(record.customer?.total_spent_cents || 0) /
                                    100}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">
                                  Última visita:
                                </span>
                                <span className="text-sm">
                                  {record.customer?.last_visit_at
                                    ? format(
                                        new Date(record.customer.last_visit_at),
                                        'dd/MM/yyyy',
                                        { locale: es }
                                      )
                                    : 'Sin visitas'}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Metadatos adicionales */}
                      {record.customer?.metadata &&
                        Object.keys(record.customer.metadata).length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">
                                Información Adicional
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid gap-3">
                                {record.customer.metadata.allergies &&
                                  record.customer.metadata.allergies.length >
                                    0 && (
                                    <div>
                                      <span className="text-sm font-medium">
                                        Alergias conocidas:
                                      </span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {record.customer.metadata.allergies.map(
                                          (allergy, i) => (
                                            <Badge
                                              key={i}
                                              variant="destructive"
                                              className="text-xs"
                                            >
                                              {allergy}
                                            </Badge>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                {record.customer.metadata
                                  .preferred_specialist_id && (
                                  <div>
                                    <span className="text-sm font-medium">
                                      Especialista preferido:
                                    </span>
                                    <p className="text-sm mt-1">
                                      ID:{' '}
                                      {
                                        record.customer.metadata
                                          .preferred_specialist_id
                                      }
                                    </p>
                                  </div>
                                )}
                                {record.customer.tags &&
                                  record.customer.tags.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium">
                                        Etiquetas:
                                      </span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {record.customer.tags.map((tag, i) => (
                                          <Badge
                                            key={i}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                    </div>
                  </Section>
                </TabsContent>

                {/* Tab Clínica */}
                <TabsContent value="details" className="space-y-6 mt-0">
                  {/* Motivo de consulta */}
                  {record.chief_complaint && (
                    <Section icon={ClipboardList} title="Motivo de consulta">
                      <p className="text-sm">{record.chief_complaint}</p>
                    </Section>
                  )}

                  {/* Signos vitales */}
                  {hasVitalSigns && (
                    <Section icon={Activity} title="Signos vitales">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {record.vital_signs?.blood_pressure && (
                          <VitalSignItem
                            label="Presión arterial"
                            value={record.vital_signs.blood_pressure}
                          />
                        )}
                        {record.vital_signs?.heart_rate && (
                          <VitalSignItem
                            label="Frecuencia cardíaca"
                            value={`${record.vital_signs.heart_rate} bpm`}
                          />
                        )}
                        {record.vital_signs?.temperature && (
                          <VitalSignItem
                            label="Temperatura"
                            value={`${record.vital_signs.temperature} °C`}
                          />
                        )}
                        {record.vital_signs?.weight && (
                          <VitalSignItem
                            label="Peso"
                            value={`${record.vital_signs.weight} kg`}
                          />
                        )}
                        {record.vital_signs?.height && (
                          <VitalSignItem
                            label="Altura"
                            value={`${record.vital_signs.height} cm`}
                          />
                        )}
                        {record.vital_signs?.bmi && (
                          <VitalSignItem
                            label="IMC"
                            value={record.vital_signs.bmi.toFixed(1)}
                          />
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Alergias */}
                  {hasAllergies && (
                    <Section
                      icon={AlertTriangle}
                      title="Alergias"
                      variant="warning"
                    >
                      <div className="space-y-3">
                        {record.allergies?.medications &&
                          record.allergies.medications.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Medicamentos:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {record.allergies.medications.map((item, i) => (
                                  <Badge key={i} variant="destructive">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        {record.allergies?.products &&
                          record.allergies.products.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Productos:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {record.allergies.products.map((item, i) => (
                                  <Badge key={i} variant="destructive">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        {record.allergies?.other &&
                          record.allergies.other.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Otros:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {record.allergies.other.map((item, i) => (
                                  <Badge key={i} variant="destructive">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </Section>
                  )}

                  {/* Antecedentes médicos */}
                  {hasMedicalHistory && (
                    <Section icon={Heart} title="Antecedentes médicos">
                      <div className="space-y-4">
                        {record.medical_history?.chronic_conditions &&
                          record.medical_history.chronic_conditions.length >
                            0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Condiciones crónicas:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.chronic_conditions.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.medical_history?.previous_surgeries &&
                          record.medical_history.previous_surgeries.length >
                            0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Cirugías previas:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.previous_surgeries.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.medical_history?.current_medications &&
                          record.medical_history.current_medications.length >
                            0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Medicamentos actuales:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.current_medications.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.medical_history?.family_history &&
                          record.medical_history.family_history.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Antecedentes familiares:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.family_history.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </Section>
                  )}

                  {/* Notas clínicas */}
                  {record.clinical_notes && (
                    <Section icon={Stethoscope} title="Notas clínicas">
                      <p className="text-sm whitespace-pre-wrap">
                        {record.clinical_notes}
                      </p>
                    </Section>
                  )}

                  {/* Plan de tratamiento */}
                  {hasTreatmentPlan && (
                    <Section icon={Pill} title="Plan de tratamiento">
                      <div className="space-y-4">
                        {record.treatment_plan?.diagnosis && (
                          <div>
                            <span className="text-sm font-medium">
                              Diagnóstico:
                            </span>
                            <p className="text-sm mt-1">
                              {record.treatment_plan.diagnosis}
                            </p>
                          </div>
                        )}
                        {record.treatment_plan?.treatment && (
                          <div>
                            <span className="text-sm font-medium">
                              Tratamiento:
                            </span>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {record.treatment_plan.treatment}
                            </p>
                          </div>
                        )}
                        {record.treatment_plan?.recommendations &&
                          record.treatment_plan.recommendations.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Recomendaciones:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.treatment_plan.recommendations.map(
                                  (rec, i) => (
                                    <li key={i}>{rec}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.treatment_plan?.follow_up_notes && (
                          <div>
                            <span className="text-sm font-medium">
                              Notas de seguimiento:
                            </span>
                            <p className="text-sm mt-1">
                              {record.treatment_plan.follow_up_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </Section>
                  )}
                </TabsContent>

                {/* Tab Formulario */}
                <TabsContent value="template" className="space-y-6 mt-0">
                  {hasExtendedData && template ? (
                    <Section
                      icon={FileText}
                      title={`Plantilla: ${template.name}`}
                    >
                      <div className="space-y-6">
                        {template.toon_schema.sections.map(
                          (section: FormSection) => (
                            <Card
                              key={section.id}
                              className="border-l-4 border-l-primary"
                            >
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                  {section.title}
                                </CardTitle>
                                {section.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {section.description}
                                  </p>
                                )}
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {section.fields.map((field: FormField) => {
                                  const value =
                                    record.extended_data?.[field.field_id]
                                  return (
                                    <div
                                      key={field.field_id}
                                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                      <div>
                                        <span className="text-sm font-medium">
                                          {field.label}
                                        </span>
                                        {field.required && (
                                          <span className="text-destructive ml-1">
                                            *
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        {renderFieldValue(field, value)}
                                      </div>
                                    </div>
                                  )
                                })}
                              </CardContent>
                            </Card>
                          )
                        )}
                      </div>
                    </Section>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          No se utilizó ninguna plantilla para esta historia
                          clínica
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab Firmas */}
                <TabsContent value="signatures" className="space-y-6 mt-0">
                  <Section icon={FileSignature} title="Firmas">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Firma del paciente */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base">
                            <span>Firma del Paciente</span>
                            {isSigned ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Firmado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isSigned ? (
                            <div className="space-y-3">
                              {record.signature_data && (
                                <div className="bg-white border rounded p-3">
                                  <img
                                    src={record.signature_data}
                                    alt="Firma del paciente"
                                    className="max-h-32 mx-auto"
                                  />
                                </div>
                              )}
                              <div className="text-sm space-y-1">
                                <p>
                                  <strong>Firmado por:</strong>{' '}
                                  {record.signed_by_name}
                                </p>
                                {record.signed_by_document && (
                                  <p>
                                    <strong>Documento:</strong>{' '}
                                    {record.signed_by_document}
                                  </p>
                                )}
                                {record.signature_date && (
                                  <p>
                                    <strong>Fecha:</strong>{' '}
                                    {format(
                                      new Date(record.signature_date),
                                      'dd/MM/yyyy HH:mm',
                                      { locale: es }
                                    )}
                                  </p>
                                )}
                                {record.signature_ip && (
                                  <p>
                                    <strong>IP:</strong> {record.signature_ip}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              El paciente aún no ha firmado este documento.
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Firma del especialista */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base">
                            <span>Firma del Especialista</span>
                            {hasSpecialistSignature ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Firmado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {hasSpecialistSignature ? (
                            <div className="space-y-3">
                              {record.specialist_signature_data && (
                                <div className="bg-white border rounded p-3">
                                  <img
                                    src={record.specialist_signature_data}
                                    alt="Firma del especialista"
                                    className="max-h-32 mx-auto"
                                  />
                                </div>
                              )}
                              <div className="text-sm space-y-1">
                                {record.specialist_signature_date && (
                                  <p>
                                    <strong>Fecha:</strong>{' '}
                                    {format(
                                      new Date(
                                        record.specialist_signature_date
                                      ),
                                      'dd/MM/yyyy HH:mm',
                                      { locale: es }
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              El especialista aún no ha firmado este documento.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </Section>
                </TabsContent>

                {/* Tab Archivos */}
                <TabsContent value="attachments" className="space-y-6 mt-0">
                  <Section icon={Paperclip} title="Archivos adjuntos">
                    {hasAttachments ? (
                      <div className="grid gap-4">
                        {record.attachments?.map((file, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{file.name}</p>
                                  </div>
                                </div>
                                {file.url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Ver
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            No hay archivos adjuntos
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </Section>
                </TabsContent>

                {/* Tab Clínica */}
                <TabsContent value="details" className="space-y-6 mt-0">
                  {/* Información del registro */}
                  <Section icon={Info} title="Información del Registro">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Datos del Registro
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid gap-3 text-sm">
                            <div>
                              <span className="font-medium">
                                ID del registro:
                              </span>
                              <p className="font-mono text-xs text-muted-foreground mt-1">
                                {record.id}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">
                                Tipo de registro:
                              </span>
                              <p>{recordTypeLabels[record.record_type]}</p>
                            </div>
                            <div>
                              <span className="font-medium">
                                Fecha del registro:
                              </span>
                              <p className="text-muted-foreground">
                                {format(
                                  new Date(record.record_date),
                                  "dd 'de' MMMM 'de' yyyy",
                                  { locale: es }
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">
                                Fecha de creación:
                              </span>
                              <p className="text-muted-foreground">
                                {format(
                                  new Date(record.created_at),
                                  'dd/MM/yyyy HH:mm:ss',
                                  { locale: es }
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">
                                Última actualización:
                              </span>
                              <p className="text-muted-foreground">
                                {format(
                                  new Date(record.updated_at),
                                  'dd/MM/yyyy HH:mm:ss',
                                  { locale: es }
                                )}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Información del Profesional
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {record.specialist ? (
                            <div className="grid gap-3 text-sm">
                              <div>
                                <span className="font-medium">
                                  Nombre del especialista:
                                </span>
                                <p>
                                  {record.specialist.first_name}{' '}
                                  {record.specialist.last_name}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">
                                  ID del especialista:
                                </span>
                                <p className="font-mono text-xs text-muted-foreground">
                                  {record.specialist.id}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No hay especialista asignado
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {template && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Plantilla Utilizada
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-lg">
                                {template.name}
                              </p>
                              <Badge
                                variant={
                                  template.is_active ? 'default' : 'secondary'
                                }
                              >
                                {template.is_active ? 'Activa' : 'Inactiva'}
                              </Badge>
                            </div>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {template.description}
                              </p>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">ID:</span>
                                <p className="font-mono">{template.id}</p>
                              </div>
                              <div>
                                <span className="font-medium">Secciones:</span>
                                <p>{template.toon_schema.sections.length}</p>
                              </div>
                              <div>
                                <span className="font-medium">
                                  Campos totales:
                                </span>
                                <p>
                                  {template.toon_schema.sections.reduce(
                                    (total: number, section: any) =>
                                      total + section.fields.length,
                                    0
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">
                                  Requiere firma:
                                </span>
                                <p>
                                  {template.requires_signature ? 'Sí' : 'No'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Section>

                  {/* Motivo de consulta */}
                  {record.chief_complaint && (
                    <Section icon={ClipboardList} title="Motivo de consulta">
                      <p className="text-sm">{record.chief_complaint}</p>
                    </Section>
                  )}

                  {/* Signos vitales */}
                  {hasVitalSigns && (
                    <Section icon={Activity} title="Signos vitales">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {record.vital_signs?.blood_pressure && (
                          <VitalSignItem
                            label="Presión arterial"
                            value={record.vital_signs.blood_pressure}
                          />
                        )}
                        {record.vital_signs?.heart_rate && (
                          <VitalSignItem
                            label="Frecuencia cardíaca"
                            value={`${record.vital_signs.heart_rate} bpm`}
                          />
                        )}
                        {record.vital_signs?.temperature && (
                          <VitalSignItem
                            label="Temperatura"
                            value={`${record.vital_signs.temperature} °C`}
                          />
                        )}
                        {record.vital_signs?.weight && (
                          <VitalSignItem
                            label="Peso"
                            value={`${record.vital_signs.weight} kg`}
                          />
                        )}
                        {record.vital_signs?.height && (
                          <VitalSignItem
                            label="Altura"
                            value={`${record.vital_signs.height} cm`}
                          />
                        )}
                        {record.vital_signs?.bmi && (
                          <VitalSignItem
                            label="IMC"
                            value={record.vital_signs.bmi.toFixed(1)}
                          />
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Alergias */}
                  {hasAllergies && (
                    <Section
                      icon={AlertTriangle}
                      title="Alergias"
                      variant="warning"
                    >
                      <div className="space-y-3">
                        {record.allergies?.medications &&
                          record.allergies.medications.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Medicamentos:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {record.allergies.medications.map((item, i) => (
                                  <Badge key={i} variant="destructive">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        {record.allergies?.products &&
                          record.allergies.products.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Productos:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {record.allergies.products.map((item, i) => (
                                  <Badge key={i} variant="destructive">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        {record.allergies?.other &&
                          record.allergies.other.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Otros:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {record.allergies.other.map((item, i) => (
                                  <Badge key={i} variant="destructive">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </Section>
                  )}

                  {/* Antecedentes médicos */}
                  {hasMedicalHistory && (
                    <Section icon={Heart} title="Antecedentes médicos">
                      <div className="space-y-4">
                        {record.medical_history?.chronic_conditions &&
                          record.medical_history.chronic_conditions.length >
                            0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Condiciones crónicas:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.chronic_conditions.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.medical_history?.previous_surgeries &&
                          record.medical_history.previous_surgeries.length >
                            0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Cirugías previas:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.previous_surgeries.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.medical_history?.current_medications &&
                          record.medical_history.current_medications.length >
                            0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Medicamentos actuales:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.current_medications.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.medical_history?.family_history &&
                          record.medical_history.family_history.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Antecedentes familiares:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.medical_history.family_history.map(
                                  (item, i) => (
                                    <li key={i}>{item}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </Section>
                  )}

                  {/* Notas clínicas */}
                  {record.clinical_notes && (
                    <Section icon={Stethoscope} title="Notas clínicas">
                      <p className="text-sm whitespace-pre-wrap">
                        {record.clinical_notes}
                      </p>
                    </Section>
                  )}

                  {/* Plan de tratamiento */}
                  {hasTreatmentPlan && (
                    <Section icon={Pill} title="Plan de tratamiento">
                      <div className="space-y-4">
                        {record.treatment_plan?.diagnosis && (
                          <div>
                            <span className="text-sm font-medium">
                              Diagnóstico:
                            </span>
                            <p className="text-sm mt-1">
                              {record.treatment_plan.diagnosis}
                            </p>
                          </div>
                        )}
                        {record.treatment_plan?.treatment && (
                          <div>
                            <span className="text-sm font-medium">
                              Tratamiento:
                            </span>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {record.treatment_plan.treatment}
                            </p>
                          </div>
                        )}
                        {record.treatment_plan?.recommendations &&
                          record.treatment_plan.recommendations.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">
                                Recomendaciones:
                              </span>
                              <ul className="list-disc list-inside mt-1 text-sm">
                                {record.treatment_plan.recommendations.map(
                                  (rec, i) => (
                                    <li key={i}>{rec}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {record.treatment_plan?.follow_up_notes && (
                          <div>
                            <span className="text-sm font-medium">
                              Notas de seguimiento:
                            </span>
                            <p className="text-sm mt-1">
                              {record.treatment_plan.follow_up_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </Section>
                  )}
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
