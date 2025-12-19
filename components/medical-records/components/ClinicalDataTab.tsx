'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ClipboardList,
  Activity,
  AlertTriangle,
  Heart,
  Stethoscope,
  Pill,
  Info,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Section, VitalSignItem } from './MedicalRecordSections'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'

interface ClinicalDataTabProps {
  record: MedicalRecordWithDetails
}

const recordTypeLabels: Record<string, string> = {
  initial_assessment: 'Evaluación inicial',
  follow_up: 'Seguimiento',
  procedure: 'Procedimiento',
  consultation: 'Consulta',
  pre_operative: 'Pre-operatorio',
  post_operative: 'Post-operatorio',
}

export function ClinicalDataTab({ record }: ClinicalDataTabProps) {
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

  return (
    <div className="space-y-6">
      {/* Información del registro */}
      <Section icon={Info} title="Información del Registro">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del Registro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 text-sm">
                <div>
                  <span className="font-medium">ID del registro:</span>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {record.id}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Tipo de registro:</span>
                  <p className="text-muted-foreground">
                    {recordTypeLabels[record.record_type]}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Fecha del registro:</span>
                  <p className="text-muted-foreground">
                    {format(
                      new Date(record.record_date),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: es }
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Fecha de creación:</span>
                  <p className="text-muted-foreground">
                    {format(
                      new Date(record.created_at),
                      'dd/MM/yyyy HH:mm:ss',
                      { locale: es }
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Última actualización:</span>
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
                    <span className="font-medium">ID del especialista:</span>
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
        <Section icon={AlertTriangle} title="Alergias" variant="warning">
          <div className="space-y-3">
            {record.allergies?.medications &&
              record.allergies.medications.length > 0 && (
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
            {record.allergies?.products &&
              record.allergies.products.length > 0 && (
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

      {/* Antecedentes médicos */}
      {hasMedicalHistory && (
        <Section icon={Heart} title="Antecedentes médicos">
          <div className="space-y-4">
            {record.medical_history?.chronic_conditions &&
              record.medical_history.chronic_conditions.length > 0 && (
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
              record.medical_history.previous_surgeries.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Cirugías previas:</span>
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
              record.medical_history.current_medications.length > 0 && (
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
                    {record.medical_history.family_history.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </Section>
      )}

      {/* Notas clínicas */}
      {record.clinical_notes && (
        <Section icon={Stethoscope} title="Notas clínicas">
          <p className="text-sm whitespace-pre-wrap">{record.clinical_notes}</p>
        </Section>
      )}

      {/* Plan de tratamiento */}
      {hasTreatmentPlan && (
        <Section icon={Pill} title="Plan de tratamiento">
          <div className="space-y-4">
            {record.treatment_plan?.diagnosis && (
              <div>
                <span className="text-sm font-medium">Diagnóstico:</span>
                <p className="text-sm mt-1">
                  {record.treatment_plan.diagnosis}
                </p>
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
    </div>
  )
}
