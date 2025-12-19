'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import type { FormField } from '@/lib/models/form-template/form-template'

interface FormFieldRendererProps {
  field: FormField
  value: any
}

export function FormFieldRenderer({ field, value }: FormFieldRendererProps) {
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
                <span className="text-xs text-muted-foreground">Inicial:</span>
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