'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import type {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordUpdate,
  MedicalRecordType,
  MedicalRecordVitalSigns,
  MedicalRecordAllergies,
  MedicalRecordMedicalHistory,
  MedicalRecordTreatmentPlan,
} from '@/lib/models/medical-record/medical-record'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import CustomerSearchSelect from './CustomerSearchSelect'

interface MedicalRecordModalProps {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: MedicalRecord | null
  preselectedCustomer?: BusinessCustomer | null
  onSave: (
    data: MedicalRecordInsert | MedicalRecordUpdate,
    recordId?: string
  ) => Promise<void>
}

interface FormData {
  customer_id: string
  record_type: MedicalRecordType
  record_date: string
  chief_complaint: string
  clinical_notes: string
  vital_signs: MedicalRecordVitalSigns
  allergies: MedicalRecordAllergies
  medical_history: MedicalRecordMedicalHistory
  treatment_plan: MedicalRecordTreatmentPlan
}

const RECORD_TYPE_OPTIONS: { value: MedicalRecordType; label: string }[] = [
  { value: 'initial_assessment', label: 'Evaluación inicial' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'procedure', label: 'Procedimiento' },
  { value: 'consultation', label: 'Consulta' },
  { value: 'pre_operative', label: 'Pre-operatorio' },
  { value: 'post_operative', label: 'Post-operatorio' },
]

const getDefaultFormData = (record?: MedicalRecord | null): FormData => ({
  customer_id: record?.customer_id || '',
  record_type: record?.record_type || 'consultation',
  record_date: record?.record_date?.split('T')[0] || new Date().toISOString().split('T')[0],
  chief_complaint: record?.chief_complaint || '',
  clinical_notes: record?.clinical_notes || '',
  vital_signs: record?.vital_signs || {},
  allergies: record?.allergies || { medications: [], products: [], other: [] },
  medical_history: record?.medical_history || {
    chronic_conditions: [],
    previous_surgeries: [],
    current_medications: [],
    family_history: [],
  },
  treatment_plan: record?.treatment_plan || {},
})

export default function MedicalRecordModal({
  businessId,
  open,
  onOpenChange,
  record,
  preselectedCustomer,
  onSave,
}: MedicalRecordModalProps) {
  const [showVitalSigns, setShowVitalSigns] = useState(false)
  const [showAllergies, setShowAllergies] = useState(false)
  const [showMedicalHistory, setShowMedicalHistory] = useState(false)
  const [showTreatmentPlan, setShowTreatmentPlan] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(getDefaultFormData(record))
  const [selectedCustomer, setSelectedCustomer] = useState<BusinessCustomer | null>(
    preselectedCustomer || null
  )

  const isEditing = !!record

  useEffect(() => {
    if (open) {
      setFormData(getDefaultFormData(record))
      setSelectedCustomer(preselectedCustomer || null)
      if (preselectedCustomer) {
        setFormData((prev) => ({ ...prev, customer_id: preselectedCustomer.id }))
      }
      setShowVitalSigns(!!record?.vital_signs?.blood_pressure || !!record?.vital_signs?.weight)
      setShowAllergies(
        (record?.allergies?.medications?.length ?? 0) > 0 ||
          (record?.allergies?.products?.length ?? 0) > 0
      )
      setShowMedicalHistory(
        (record?.medical_history?.chronic_conditions?.length ?? 0) > 0 ||
          (record?.medical_history?.current_medications?.length ?? 0) > 0
      )
      setShowTreatmentPlan(!!record?.treatment_plan?.diagnosis || !!record?.treatment_plan?.treatment)
    }
  }, [open, record, preselectedCustomer])

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCustomerSelect = (customer: BusinessCustomer | null) => {
    setSelectedCustomer(customer)
    updateField('customer_id', customer?.id || '')
  }

  const handleSubmit = async () => {
    if (!formData.customer_id) return

    setIsSaving(true)
    try {
      if (isEditing) {
        const updateData: MedicalRecordUpdate = {
          record_type: formData.record_type,
          record_date: formData.record_date,
          chief_complaint: formData.chief_complaint || null,
          clinical_notes: formData.clinical_notes || null,
          vital_signs: Object.keys(formData.vital_signs).length > 0 ? formData.vital_signs : null,
          allergies: formData.allergies,
          medical_history: formData.medical_history,
          treatment_plan:
            Object.keys(formData.treatment_plan).length > 0 ? formData.treatment_plan : null,
        }
        await onSave(updateData, record.id)
      } else {
        const createData: MedicalRecordInsert = {
          business_id: businessId,
          customer_id: formData.customer_id,
          record_type: formData.record_type,
          record_date: formData.record_date,
          chief_complaint: formData.chief_complaint || null,
          clinical_notes: formData.clinical_notes || null,
          vital_signs: Object.keys(formData.vital_signs).length > 0 ? formData.vital_signs : null,
          allergies: formData.allergies,
          medical_history: formData.medical_history,
          treatment_plan:
            Object.keys(formData.treatment_plan).length > 0 ? formData.treatment_plan : null,
          status: 'active',
        }
        await onSave(createData)
      }
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = formData.customer_id && formData.record_date

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Historia Clínica' : 'Nueva Historia Clínica'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <CustomerSearchSelect
                businessId={businessId}
                value={selectedCustomer}
                onChange={handleCustomerSelect}
                disabled={isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <DatePicker
                value={formData.record_date ? new Date(formData.record_date + 'T00:00:00') : undefined}
                onChange={(date) => updateField('record_date', date ? date.toISOString().split('T')[0] : '')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="record_type">Tipo de registro</Label>
            <Select
              value={formData.record_type}
              onValueChange={(value) => updateField('record_type', value as MedicalRecordType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {RECORD_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chief_complaint">Motivo de consulta</Label>
            <Textarea
              id="chief_complaint"
              value={formData.chief_complaint}
              onChange={(e) => updateField('chief_complaint', e.target.value)}
              placeholder="Describa el motivo principal de la consulta..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinical_notes">Notas clínicas</Label>
            <Textarea
              id="clinical_notes"
              value={formData.clinical_notes}
              onChange={(e) => updateField('clinical_notes', e.target.value)}
              placeholder="Observaciones, hallazgos y notas del especialista..."
              rows={4}
            />
          </div>

          <CollapsibleSection
            title="Signos vitales"
            isOpen={showVitalSigns}
            onToggle={() => setShowVitalSigns(!showVitalSigns)}
          >
            <VitalSignsForm
              value={formData.vital_signs}
              onChange={(v) => updateField('vital_signs', v)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Alergias"
            isOpen={showAllergies}
            onToggle={() => setShowAllergies(!showAllergies)}
          >
            <AllergiesForm
              value={formData.allergies}
              onChange={(v) => updateField('allergies', v)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Antecedentes médicos"
            isOpen={showMedicalHistory}
            onToggle={() => setShowMedicalHistory(!showMedicalHistory)}
          >
            <MedicalHistoryForm
              value={formData.medical_history}
              onChange={(v) => updateField('medical_history', v)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Plan de tratamiento"
            isOpen={showTreatmentPlan}
            onToggle={() => setShowTreatmentPlan(!showTreatmentPlan)}
          >
            <TreatmentPlanForm
              value={formData.treatment_plan}
              onChange={(v) => updateField('treatment_plan', v)}
            />
          </CollapsibleSection>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !isValid}>
            {isSaving && <Loading className="mr-2 h-4 w-4" />}
            {isSaving ? 'Guardando' : isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border rounded-lg">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between px-4 py-2"
        onClick={onToggle}
      >
        <span className="font-medium">{title}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  )
}

function VitalSignsForm({
  value,
  onChange,
}: {
  value: MedicalRecordVitalSigns
  onChange: (v: MedicalRecordVitalSigns) => void
}) {
  const update = (field: keyof MedicalRecordVitalSigns, val: string) => {
    const numVal = val ? parseFloat(val) : undefined
    onChange({ ...value, [field]: field === 'blood_pressure' ? val : numVal })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Presión arterial</Label>
        <Input
          placeholder="120/80"
          value={value.blood_pressure || ''}
          onChange={(e) => update('blood_pressure', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Frecuencia cardíaca</Label>
        <Input
          type="number"
          placeholder="bpm"
          value={value.heart_rate || ''}
          onChange={(e) => update('heart_rate', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Temperatura (°C)</Label>
        <Input
          type="number"
          step="0.1"
          placeholder="36.5"
          value={value.temperature || ''}
          onChange={(e) => update('temperature', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Peso (kg)</Label>
        <Input
          type="number"
          step="0.1"
          value={value.weight || ''}
          onChange={(e) => update('weight', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Altura (cm)</Label>
        <Input
          type="number"
          value={value.height || ''}
          onChange={(e) => update('height', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>IMC</Label>
        <Input type="number" step="0.1" value={value.bmi || ''} disabled className="bg-muted" />
      </div>
    </div>
  )
}

function AllergiesForm({
  value,
  onChange,
}: {
  value: MedicalRecordAllergies
  onChange: (v: MedicalRecordAllergies) => void
}) {
  return (
    <div className="space-y-4">
      <TagInput
        label="Medicamentos"
        value={value.medications || []}
        onChange={(v) => onChange({ ...value, medications: v })}
        placeholder="Agregar medicamento..."
      />
      <TagInput
        label="Productos"
        value={value.products || []}
        onChange={(v) => onChange({ ...value, products: v })}
        placeholder="Agregar producto..."
      />
      <TagInput
        label="Otros"
        value={value.other || []}
        onChange={(v) => onChange({ ...value, other: v })}
        placeholder="Agregar alergia..."
      />
    </div>
  )
}

function MedicalHistoryForm({
  value,
  onChange,
}: {
  value: MedicalRecordMedicalHistory
  onChange: (v: MedicalRecordMedicalHistory) => void
}) {
  return (
    <div className="space-y-4">
      <TagInput
        label="Condiciones crónicas"
        value={value.chronic_conditions || []}
        onChange={(v) => onChange({ ...value, chronic_conditions: v })}
        placeholder="Diabetes, hipertensión..."
      />
      <TagInput
        label="Cirugías previas"
        value={value.previous_surgeries || []}
        onChange={(v) => onChange({ ...value, previous_surgeries: v })}
        placeholder="Agregar cirugía..."
      />
      <TagInput
        label="Medicamentos actuales"
        value={value.current_medications || []}
        onChange={(v) => onChange({ ...value, current_medications: v })}
        placeholder="Agregar medicamento..."
      />
      <TagInput
        label="Antecedentes familiares"
        value={value.family_history || []}
        onChange={(v) => onChange({ ...value, family_history: v })}
        placeholder="Agregar antecedente..."
      />
    </div>
  )
}

function TreatmentPlanForm({
  value,
  onChange,
}: {
  value: MedicalRecordTreatmentPlan
  onChange: (v: MedicalRecordTreatmentPlan) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Diagnóstico</Label>
        <Textarea
          value={value.diagnosis || ''}
          onChange={(e) => onChange({ ...value, diagnosis: e.target.value })}
          placeholder="Diagnóstico del paciente..."
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Tratamiento</Label>
        <Textarea
          value={value.treatment || ''}
          onChange={(e) => onChange({ ...value, treatment: e.target.value })}
          placeholder="Plan de tratamiento recomendado..."
          rows={3}
        />
      </div>
      <TagInput
        label="Recomendaciones"
        value={value.recommendations || []}
        onChange={(v) => onChange({ ...value, recommendations: v })}
        placeholder="Agregar recomendación..."
      />
      <div className="space-y-2">
        <Label>Notas de seguimiento</Label>
        <Textarea
          value={value.follow_up_notes || ''}
          onChange={(e) => onChange({ ...value, follow_up_notes: e.target.value })}
          placeholder="Notas adicionales para seguimiento..."
          rows={2}
        />
      </div>
    </div>
  )
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }

  const handleRemove = (item: string) => {
    onChange(value.filter((v) => v !== item))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="icon" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((item, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {item}
              <button type="button" onClick={() => handleRemove(item)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
