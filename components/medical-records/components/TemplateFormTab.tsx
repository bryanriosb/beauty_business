'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Section } from './MedicalRecordSections'
import { FormFieldRenderer } from './FormFieldRenderer'
import type {
  FormTemplate,
  FormField,
  FormSection,
} from '@/lib/models/form-template/form-template'
import type { MedicalRecordWithDetails } from '@/lib/models/medical-record/medical-record'

interface TemplateFormTabProps {
  record: MedicalRecordWithDetails
  template: FormTemplate | null
}

export function TemplateFormTab({ record, template }: TemplateFormTabProps) {
  const hasExtendedData =
    record.extended_data && Object.keys(record.extended_data).length > 0

  return hasExtendedData && template ? (
    <Section icon={FileText} title={`Plantilla: ${template.name}`}>
      <div className="space-y-6">
        {template.toon_schema.sections.map((section: FormSection) => (
          <Card
            key={section.id}
            className="border-l-4 border-l-primary"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
              {section.description && (
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map((field: FormField) => {
                const value = record.extended_data?.[field.field_id]
                return (
                  <div
                    key={field.field_id}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <span className="text-sm font-medium">{field.label}</span>
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </div>
                    <div>
                      <FormFieldRenderer field={field} value={value} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  ) : (
    <Card>
      <CardContent className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          No se utilizó ninguna plantilla para esta historia clínica
        </p>
      </CardContent>
    </Card>
  )
}