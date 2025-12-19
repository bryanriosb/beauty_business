'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, CheckCircle2, User, Calendar, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'

interface MedicalRecordHeaderProps {
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

export function MedicalRecordHeader({ record }: MedicalRecordHeaderProps) {
  const isSigned = !!record.signature_data
  const hasAllergies =
    (record.allergies?.medications?.length ?? 0) > 0 ||
    (record.allergies?.products?.length ?? 0) > 0 ||
    (record.allergies?.other?.length ?? 0) > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <span className="font-semibold">Historia Clínica</span>
        {isSigned && (
          <Badge variant="default" className="ml-2 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Firmada
          </Badge>
        )}
      </div>

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
  )
}