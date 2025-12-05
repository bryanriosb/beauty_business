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
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Loading from '@/components/ui/loading'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'
import MedicalRecordService from '@/lib/services/medical-record/medical-record-service'

interface MedicalRecordDetailModalProps {
  recordId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
}: MedicalRecordDetailModalProps) {
  const [record, setRecord] = useState<MedicalRecordWithDetails | null>(null)
  const [loading, setLoading] = useState(false)

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
    } catch (error) {
      console.error('Error loading record:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
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
    (record.treatment_plan?.recommendations?.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historia Clínica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                {format(new Date(record.record_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </div>
            <Badge variant="outline">{recordTypeLabels[record.record_type]}</Badge>
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

          <Separator />

          {record.chief_complaint && (
            <Section icon={ClipboardList} title="Motivo de consulta">
              <p className="text-sm">{record.chief_complaint}</p>
            </Section>
          )}

          {hasVitalSigns && (
            <Section icon={Activity} title="Signos vitales">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {record.vital_signs?.blood_pressure && (
                  <VitalSignItem label="Presión arterial" value={record.vital_signs.blood_pressure} />
                )}
                {record.vital_signs?.heart_rate && (
                  <VitalSignItem label="Frecuencia cardíaca" value={`${record.vital_signs.heart_rate} bpm`} />
                )}
                {record.vital_signs?.temperature && (
                  <VitalSignItem label="Temperatura" value={`${record.vital_signs.temperature} °C`} />
                )}
                {record.vital_signs?.weight && (
                  <VitalSignItem label="Peso" value={`${record.vital_signs.weight} kg`} />
                )}
                {record.vital_signs?.height && (
                  <VitalSignItem label="Altura" value={`${record.vital_signs.height} cm`} />
                )}
                {record.vital_signs?.bmi && (
                  <VitalSignItem label="IMC" value={record.vital_signs.bmi.toFixed(1)} />
                )}
              </div>
            </Section>
          )}

          {hasAllergies && (
            <Section icon={AlertTriangle} title="Alergias" variant="warning">
              <div className="space-y-3">
                {record.allergies?.medications && record.allergies.medications.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Medicamentos:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {record.allergies.medications.map((item, i) => (
                        <Badge key={i} variant="destructive">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {record.allergies?.products && record.allergies.products.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Productos:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {record.allergies.products.map((item, i) => (
                        <Badge key={i} variant="destructive">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {record.allergies?.other && record.allergies.other.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Otros:</span>
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

          {hasMedicalHistory && (
            <Section icon={Heart} title="Antecedentes médicos">
              <div className="space-y-3">
                {record.medical_history?.chronic_conditions &&
                  record.medical_history.chronic_conditions.length > 0 && (
                    <HistoryItem
                      label="Condiciones crónicas"
                      items={record.medical_history.chronic_conditions}
                    />
                  )}
                {record.medical_history?.previous_surgeries &&
                  record.medical_history.previous_surgeries.length > 0 && (
                    <HistoryItem
                      label="Cirugías previas"
                      items={record.medical_history.previous_surgeries}
                    />
                  )}
                {record.medical_history?.current_medications &&
                  record.medical_history.current_medications.length > 0 && (
                    <HistoryItem
                      label="Medicamentos actuales"
                      items={record.medical_history.current_medications}
                    />
                  )}
                {record.medical_history?.family_history &&
                  record.medical_history.family_history.length > 0 && (
                    <HistoryItem
                      label="Antecedentes familiares"
                      items={record.medical_history.family_history}
                    />
                  )}
              </div>
            </Section>
          )}

          {record.clinical_notes && (
            <Section icon={Stethoscope} title="Notas clínicas">
              <p className="text-sm whitespace-pre-wrap">{record.clinical_notes}</p>
            </Section>
          )}

          {hasTreatmentPlan && (
            <Section icon={Pill} title="Plan de tratamiento">
              <div className="space-y-4">
                {record.treatment_plan?.diagnosis && (
                  <div>
                    <span className="text-sm font-medium">Diagnóstico:</span>
                    <p className="text-sm mt-1">{record.treatment_plan.diagnosis}</p>
                  </div>
                )}
                {record.treatment_plan?.treatment && (
                  <div>
                    <span className="text-sm font-medium">Tratamiento:</span>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {record.treatment_plan.treatment}
                    </p>
                  </div>
                )}
                {record.treatment_plan?.recommendations &&
                  record.treatment_plan.recommendations.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Recomendaciones:</span>
                      <ul className="list-disc list-inside mt-1 text-sm">
                        {record.treatment_plan.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {record.treatment_plan?.follow_up_notes && (
                  <div>
                    <span className="text-sm font-medium">Notas de seguimiento:</span>
                    <p className="text-sm mt-1">{record.treatment_plan.follow_up_notes}</p>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
    <Card className={variant === 'warning' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${variant === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function VitalSignItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function HistoryItem({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <span className="text-sm font-medium">{label}:</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}
