'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type {
  FormSection,
  FormField,
  ExtendedData,
  ExtendedDataValue,
  YesNoObservationValue,
  FrequencyValue,
  MeasurementValue,
} from '@/lib/models/form-template/form-template'

interface DynamicFormFieldsProps {
  sections: FormSection[]
  values: ExtendedData
  onChange: (values: ExtendedData) => void
  disabled?: boolean
}

export default function DynamicFormFields({
  sections,
  values,
  onChange,
  disabled = false,
}: DynamicFormFieldsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    sections.reduce((acc, section) => ({ ...acc, [section.id]: true }), {})
  )

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const updateValue = (fieldId: string, value: ExtendedDataValue) => {
    onChange({ ...values, [fieldId]: value })
  }

  const shouldShowSection = (section: FormSection): boolean => {
    if (!section.condition) return true
    // Simple condition evaluation (ej: "age < 18")
    try {
      const match = section.condition.match(/(\w+)\s*([<>=!]+)\s*(\d+)/)
      if (match) {
        const [, field, operator, value] = match
        const fieldValue = values[field] as number
        if (fieldValue === undefined || fieldValue === null) return false
        switch (operator) {
          case '<': return fieldValue < Number(value)
          case '>': return fieldValue > Number(value)
          case '<=': return fieldValue <= Number(value)
          case '>=': return fieldValue >= Number(value)
          case '==': return fieldValue === Number(value)
          case '!=': return fieldValue !== Number(value)
        }
      }
    } catch {
      return true
    }
    return true
  }

  return (
    <div className="space-y-4">
      {sections.filter(shouldShowSection).map((section) => (
        <Collapsible
          key={section.id}
          open={openSections[section.id]}
          onOpenChange={() => toggleSection(section.id)}
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
            >
              <div className="text-left">
                <span className="text-sm font-medium">{section.title}</span>
                {section.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {section.description}
                  </p>
                )}
              </div>
              {openSections[section.id] ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4 border-t">
            <div className="grid gap-4">
              {section.fields.map((field) => (
                <DynamicField
                  key={field.field_id}
                  field={field}
                  value={values[field.field_id]}
                  onChange={(value) => updateValue(field.field_id, value)}
                  disabled={disabled}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )
}

interface DynamicFieldProps {
  field: FormField
  value: ExtendedDataValue
  onChange: (value: ExtendedDataValue) => void
  disabled?: boolean
}

function DynamicField({ field, value, onChange, disabled }: DynamicFieldProps) {
  switch (field.type) {
    case 'text':
    case 'email':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            type={field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
          />
        </div>
      )

    case 'number':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : null)
            }
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        </div>
      )

    case 'date':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={field.required}
          />
        </div>
      )

    case 'textarea':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
            rows={3}
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Select
            value={(value as string) || ''}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.field_id}
            checked={(value as boolean) || false}
            onCheckedChange={onChange}
            disabled={disabled}
          />
          <Label htmlFor={field.field_id} className="text-sm font-normal">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
      )

    case 'radio':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <RadioGroup
            value={(value as string) || ''}
            onValueChange={onChange}
            disabled={disabled}
            className="flex flex-wrap gap-4"
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.field_id}-${option}`} />
                <Label
                  htmlFor={`${field.field_id}-${option}`}
                  className="text-sm font-normal"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )

    case 'yes_no_observation':
      return (
        <YesNoObservationField
          field={field}
          value={value as YesNoObservationValue}
          onChange={onChange}
          disabled={disabled}
        />
      )

    case 'frequency':
      return (
        <FrequencyField
          field={field}
          value={value as FrequencyValue}
          onChange={onChange}
          disabled={disabled}
        />
      )

    case 'measurement':
      return (
        <MeasurementField
          field={field}
          value={value as MeasurementValue}
          onChange={onChange}
          disabled={disabled}
        />
      )

    default:
      return null
  }
}

function YesNoObservationField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField
  value: YesNoObservationValue | undefined
  onChange: (value: YesNoObservationValue) => void
  disabled?: boolean
}) {
  const current: YesNoObservationValue = value || { answer: null, observation: '' }

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-4">
        <RadioGroup
          value={current.answer || ''}
          onValueChange={(val) =>
            onChange({ ...current, answer: val as 'yes' | 'no' })
          }
          disabled={disabled}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id={`${field.field_id}-yes`} />
            <Label htmlFor={`${field.field_id}-yes`} className="text-sm font-normal">
              Sí
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id={`${field.field_id}-no`} />
            <Label htmlFor={`${field.field_id}-no`} className="text-sm font-normal">
              No
            </Label>
          </div>
        </RadioGroup>
        <Input
          placeholder="Observación..."
          value={current.observation || ''}
          onChange={(e) => onChange({ ...current, observation: e.target.value })}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    </div>
  )
}

function FrequencyField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField
  value: FrequencyValue | undefined
  onChange: (value: FrequencyValue) => void
  disabled?: boolean
}) {
  const current: FrequencyValue = value || { answer: null, observation: '' }
  const options = field.options || ['Sí', 'No', 'Ocasional']

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-4">
        <RadioGroup
          value={current.answer || ''}
          onValueChange={(val) =>
            onChange({ ...current, answer: val as 'yes' | 'no' | 'occasional' })
          }
          disabled={disabled}
          className="flex gap-4"
        >
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.toLowerCase()}
                id={`${field.field_id}-${option}`}
              />
              <Label
                htmlFor={`${field.field_id}-${option}`}
                className="text-sm font-normal"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <Input
          placeholder="Observación..."
          value={current.observation || ''}
          onChange={(e) => onChange({ ...current, observation: e.target.value })}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    </div>
  )
}

function MeasurementField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField
  value: MeasurementValue | undefined
  onChange: (value: MeasurementValue) => void
  disabled?: boolean
}) {
  const current: MeasurementValue = value || { initial: null, final: null }

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Inicial</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="Inicial"
            value={current.initial ?? ''}
            onChange={(e) =>
              onChange({
                ...current,
                initial: e.target.value ? Number(e.target.value) : null,
              })
            }
            disabled={disabled}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Final</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="Final"
            value={current.final ?? ''}
            onChange={(e) =>
              onChange({
                ...current,
                final: e.target.value ? Number(e.target.value) : null,
              })
            }
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
