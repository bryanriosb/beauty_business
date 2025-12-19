'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  FileText,
  User,
  Stethoscope,
  Heart,
  ClipboardList,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  Plus,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { Form, FormField } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordUpdate,
  MedicalRecordType,
  MedicalRecordVitalSigns,
  MedicalRecordAllergies,
  MedicalRecordMedicalHistory,
  MedicalRecordTreatmentPlan,
  MedicalRecordAttachment,
} from '@/lib/models/medical-record/medical-record'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import type { Specialist } from '@/lib/models/specialist/specialist'
import type {
  FormTemplate,
  ExtendedData,
  FormField as FormFieldType,
} from '@/lib/models/form-template/form-template'
import CustomerSearchSelect from './CustomerSearchSelect'
import DynamicFormRenderer from '@/components/form-templates/DynamicFormRenderer'
import FormTemplateService from '@/lib/services/form-template/form-template-service'
import { fetchSpecialistsAction } from '@/lib/actions/specialist'

const RECORD_TYPE_OPTIONS: { value: MedicalRecordType; label: string }[] = [
  { value: 'initial_assessment', label: 'Evaluación inicial' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'procedure', label: 'Procedimiento' },
  { value: 'consultation', label: 'Consulta' },
  { value: 'pre_operative', label: 'Pre-operatorio' },
  { value: 'post_operative', label: 'Post-operatorio' },
]

interface Step {
  id: string
  title: string
  icon: React.ReactNode
  isOptional?: boolean
}

const STEPS: Step[] = [
  { id: 'basic', title: 'Información', icon: <User className="w-4 h-4" /> },
  { id: 'consultation', title: 'Consulta', icon: <Stethoscope className="w-4 h-4" /> },
  { id: 'evaluation', title: 'Evaluación', icon: <Heart className="w-4 h-4" />, isOptional: true },
  { id: 'treatment', title: 'Tratamiento', icon: <ClipboardList className="w-4 h-4" />, isOptional: true },
  { id: 'attachments', title: 'Adjuntos', icon: <Paperclip className="w-4 h-4" />, isOptional: true },
]

const medicalRecordSchema = z.object({
  customer_id: z.string().min(1, 'Seleccione un paciente'),
  specialist_id: z.string().optional(),
  record_type: z.enum([
    'initial_assessment',
    'follow_up',
    'procedure',
    'consultation',
    'pre_operative',
    'post_operative',
  ]),
  record_date: z.string().min(1, 'La fecha es requerida'),
  chief_complaint: z.string().optional(),
  clinical_notes: z.string().optional(),
})

type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>

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

export default function MedicalRecordModal({
  businessId,
  open,
  onOpenChange,
  record,
  preselectedCustomer,
  onSave,
}: MedicalRecordModalProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState(0)

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<BusinessCustomer | null>(
    preselectedCustomer || null
  )

  // Specialists
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [isLoadingSpecialists, setIsLoadingSpecialists] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [extendedData, setExtendedData] = useState<ExtendedData>({})
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Medical data states
  const [vitalSigns, setVitalSigns] = useState<MedicalRecordVitalSigns>({})
  const [allergies, setAllergies] = useState<MedicalRecordAllergies>({
    medications: [],
    products: [],
    other: [],
  })
  const [medicalHistory, setMedicalHistory] = useState<MedicalRecordMedicalHistory>({
    chronic_conditions: [],
    previous_surgeries: [],
    current_medications: [],
    family_history: [],
  })
  const [treatmentPlan, setTreatmentPlan] = useState<MedicalRecordTreatmentPlan>({})
  const [attachments, setAttachments] = useState<MedicalRecordAttachment[]>([])

  // Temp inputs for array fields
  const [newAllergy, setNewAllergy] = useState({ type: 'medications', value: '' })
  const [newHistoryItem, setNewHistoryItem] = useState({ type: 'chronic_conditions', value: '' })

  const isEditing = !!record
  const templateService = new FormTemplateService()

  // Determine actual steps based on template
  const actualSteps = useMemo((): Step[] => {
    if (selectedTemplate) {
      return [
        ...STEPS,
        { id: 'dynamic', title: 'Plantilla', icon: <FileText className="w-4 h-4" />, isOptional: false },
      ]
    }
    return STEPS
  }, [selectedTemplate])

  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      customer_id: record?.customer_id || '',
      specialist_id: record?.specialist_id || 'unassigned',
      record_type: record?.record_type || 'consultation',
      record_date:
        record?.record_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      chief_complaint: record?.chief_complaint || '',
      clinical_notes: record?.clinical_notes || '',
    },
  })

  // Load specialists
  useEffect(() => {
    if (open && businessId) {
      loadSpecialists()
      loadTemplates()
    }
  }, [open, businessId])

  const loadSpecialists = async () => {
    setIsLoadingSpecialists(true)
    try {
      const result = await fetchSpecialistsAction({ business_id: businessId })
      setSpecialists(result.data)
    } catch (error) {
      console.error('Error loading specialists:', error)
    } finally {
      setIsLoadingSpecialists(false)
    }
  }

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const result = await templateService.fetchItems({
        business_id: businessId,
        is_active: true,
      })
      setTemplates(result.data)
      const defaultTemplate = result.data.find((t) => t.is_default)
      const recordTemplate = record?.form_template_id
        ? result.data.find((t) => t.id === record.form_template_id)
        : null
      setSelectedTemplate(recordTemplate || defaultTemplate || null)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      if (record) {
        form.reset({
          customer_id: record.customer_id,
          specialist_id: record.specialist_id || 'unassigned',
          record_type: record.record_type,
          record_date: record.record_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          chief_complaint: record.chief_complaint || '',
          clinical_notes: record.clinical_notes || '',
        })
        setVitalSigns(record.vital_signs || {})
        setAllergies(record.allergies || { medications: [], products: [], other: [] })
        setMedicalHistory(record.medical_history || {
          chronic_conditions: [],
          previous_surgeries: [],
          current_medications: [],
          family_history: [],
        })
        setTreatmentPlan(record.treatment_plan || {})
        setAttachments(record.attachments || [])
        setExtendedData(record.extended_data || {})
      } else {
        form.reset({
          customer_id: preselectedCustomer?.id || '',
          specialist_id: 'unassigned',
          record_type: 'consultation',
          record_date: new Date().toISOString().split('T')[0],
          chief_complaint: '',
          clinical_notes: '',
        })
        setVitalSigns({})
        setAllergies({ medications: [], products: [], other: [] })
        setMedicalHistory({
          chronic_conditions: [],
          previous_surgeries: [],
          current_medications: [],
          family_history: [],
        })
        setTreatmentPlan({})
        setAttachments([])
        setExtendedData({})
      }
      setSelectedCustomer(preselectedCustomer || null)
    }
  }, [open, record, preselectedCustomer, form])

  // Dynamic form validation
  const requiredDynamicFields = useMemo(() => {
    if (!selectedTemplate?.toon_schema?.sections) return []
    const fields: FormFieldType[] = []
    selectedTemplate.toon_schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required) fields.push(field)
      })
    })
    return fields
  }, [selectedTemplate])

  const validateDynamicFields = useCallback((): boolean => {
    if (!selectedTemplate) return true
    if (requiredDynamicFields.length === 0) return true
    for (const field of requiredDynamicFields) {
      const value = extendedData[field.field_id]
      if (value === undefined || value === null || value === '') return false
      switch (field.type) {
        case 'yes_no_observation':
        case 'frequency':
          if (!value || typeof value !== 'object' || !value.answer) return false
          break
        case 'measurement':
          if (!value || typeof value !== 'object' || (value.initial === null && value.final === null))
            return false
          break
        case 'checkbox':
          if (value !== true) return false
          break
      }
    }
    return true
  }, [selectedTemplate, requiredDynamicFields, extendedData])

  const isDynamicFormValid = useMemo(() => validateDynamicFields(), [validateDynamicFields])

  // Step validation
  const isStepValid = useCallback(
    (stepIndex: number): boolean => {
      const step = actualSteps[stepIndex]
      switch (step.id) {
        case 'basic':
          return !!selectedCustomer && !!form.watch('record_type') && !!form.watch('record_date')
        case 'consultation':
          return true // Optional fields
        case 'evaluation':
          return true // Optional
        case 'treatment':
          return true // Optional
        case 'attachments':
          return true // Optional
        case 'dynamic':
          return isDynamicFormValid
        default:
          return true
      }
    },
    [selectedCustomer, form, isDynamicFormValid, actualSteps]
  )

  const canGoNext = isStepValid(currentStep)
  const isLastStep = currentStep === actualSteps.length - 1
  const canSubmit = useMemo(() => {
    // Validate all required steps
    if (!isStepValid(0)) return false // Basic info is required
    if (selectedTemplate && !isDynamicFormValid) return false
    return !isSubmitting
  }, [isStepValid, selectedTemplate, isDynamicFormValid, isSubmitting])

  const handleNext = () => {
    if (canGoNext && currentStep < actualSteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleStepClick = (index: number) => {
    // Allow navigation to completed steps or current step
    if (index <= currentStep || isStepValid(currentStep)) {
      setCurrentStep(index)
    }
  }

  const handleCustomerSelect = (customer: BusinessCustomer | null) => {
    setSelectedCustomer(customer)
    form.setValue('customer_id', customer?.id || '', { shouldValidate: true })
  }

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'no-template') {
      setSelectedTemplate(null)
      setExtendedData({})
    } else {
      const template = templates.find((t) => t.id === templateId)
      setSelectedTemplate(template || null)
      if (template) setExtendedData({})
    }
  }

  const handleExtendedDataChange = useCallback((newData: ExtendedData) => {
    setExtendedData(newData)
  }, [])

  // Array field helpers
  const addAllergyItem = () => {
    if (!newAllergy.value.trim()) return
    const key = newAllergy.type as keyof MedicalRecordAllergies
    setAllergies((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newAllergy.value.trim()],
    }))
    setNewAllergy((prev) => ({ ...prev, value: '' }))
  }

  const removeAllergyItem = (type: keyof MedicalRecordAllergies, index: number) => {
    setAllergies((prev) => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index) || [],
    }))
  }

  const addHistoryItem = () => {
    if (!newHistoryItem.value.trim()) return
    const key = newHistoryItem.type as keyof MedicalRecordMedicalHistory
    setMedicalHistory((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newHistoryItem.value.trim()],
    }))
    setNewHistoryItem((prev) => ({ ...prev, value: '' }))
  }

  const removeHistoryItem = (type: keyof MedicalRecordMedicalHistory, index: number) => {
    setMedicalHistory((prev) => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index) || [],
    }))
  }

  const onSubmit = async (data: MedicalRecordFormValues) => {
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      const baseData = {
        specialist_id: data.specialist_id === 'unassigned' ? null : data.specialist_id,
        record_type: data.record_type,
        record_date: data.record_date,
        chief_complaint: data.chief_complaint || null,
        clinical_notes: data.clinical_notes || null,
        vital_signs: Object.keys(vitalSigns).length > 0 ? vitalSigns : null,
        allergies: Object.values(allergies).some((arr) => arr && arr.length > 0) ? allergies : null,
        medical_history: Object.values(medicalHistory).some((arr) => arr && arr.length > 0)
          ? medicalHistory
          : null,
        treatment_plan: Object.keys(treatmentPlan).length > 0 ? treatmentPlan : null,
        attachments: attachments.length > 0 ? attachments : null,
      }

      const templateData = selectedTemplate
        ? { form_template_id: selectedTemplate.id, extended_data: extendedData }
        : { form_template_id: null, extended_data: null }

      if (isEditing && record) {
        const updateData: MedicalRecordUpdate = { ...baseData, ...templateData }
        await onSave(updateData, record.id)
      } else {
        const createData: MedicalRecordInsert = {
          business_id: businessId,
          customer_id: data.customer_id,
          ...baseData,
          ...templateData,
          status: 'active',
        }
        await onSave(createData)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving medical record:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render step content
  const renderStepContent = () => {
    const step = actualSteps[currentStep]

    switch (step.id) {
      case 'basic':
        return (
          <div className="space-y-4">
            {/* Template selector */}
            <div className="space-y-2">
              <Label>
                <FileText className="w-4 h-4 inline mr-2" />
                Plantilla
              </Label>
              <Select
                value={selectedTemplate?.id || 'no-template'}
                onValueChange={handleTemplateChange}
                disabled={isLoadingTemplates}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona plantilla" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-template">Sin plantilla</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.is_default && <Badge variant="secondary" className="ml-2 text-xs">Por defecto</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Patient */}
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <CustomerSearchSelect
                businessId={businessId}
                value={selectedCustomer}
                onChange={handleCustomerSelect}
                disabled={isEditing}
              />
              {form.formState.errors.customer_id && (
                <p className="text-sm text-red-500">{form.formState.errors.customer_id.message}</p>
              )}
            </div>

            {/* Specialist */}
            <div className="space-y-2">
              <Label>Especialista</Label>
              <FormField
                control={form.control}
                name="specialist_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingSpecialists}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona especialista (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {specialists.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Type and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Registro *</Label>
                <FormField
                  control={form.control}
                  name="record_type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECORD_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <FormField
                  control={form.control}
                  name="record_date"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )

      case 'consultation':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo de Consulta</Label>
              <FormField
                control={form.control}
                name="chief_complaint"
                render={({ field }) => (
                  <Textarea {...field} placeholder="Describe el motivo principal de la consulta" rows={4} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas Clínicas</Label>
              <FormField
                control={form.control}
                name="clinical_notes"
                render={({ field }) => (
                  <Textarea {...field} placeholder="Notas y observaciones clínicas" rows={6} />
                )}
              />
            </div>
          </div>
        )

      case 'evaluation':
        return (
          <div className="space-y-6">
            {/* Vital Signs */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Signos Vitales</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Presión Arterial</Label>
                  <Input
                    placeholder="120/80"
                    value={vitalSigns.blood_pressure || ''}
                    onChange={(e) => setVitalSigns((prev) => ({ ...prev, blood_pressure: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Frecuencia Cardíaca</Label>
                  <Input
                    type="number"
                    placeholder="72"
                    value={vitalSigns.heart_rate || ''}
                    onChange={(e) => setVitalSigns((prev) => ({ ...prev, heart_rate: Number(e.target.value) || undefined }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Temperatura (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    value={vitalSigns.temperature || ''}
                    onChange={(e) => setVitalSigns((prev) => ({ ...prev, temperature: Number(e.target.value) || undefined }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={vitalSigns.weight || ''}
                    onChange={(e) => setVitalSigns((prev) => ({ ...prev, weight: Number(e.target.value) || undefined }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Altura (cm)</Label>
                  <Input
                    type="number"
                    placeholder="170"
                    value={vitalSigns.height || ''}
                    onChange={(e) => setVitalSigns((prev) => ({ ...prev, height: Number(e.target.value) || undefined }))}
                  />
                </div>
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Alergias</Label>
              <div className="flex gap-2">
                <Select value={newAllergy.type} onValueChange={(v) => setNewAllergy((prev) => ({ ...prev, type: v }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medications">Medicamentos</SelectItem>
                    <SelectItem value="products">Productos</SelectItem>
                    <SelectItem value="other">Otros</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Agregar alergia..."
                  value={newAllergy.value}
                  onChange={(e) => setNewAllergy((prev) => ({ ...prev, value: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergyItem())}
                  className="flex-1"
                />
                <Button type="button" size="icon" variant="outline" onClick={addAllergyItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['medications', 'products', 'other'] as const).map((type) =>
                  allergies[type]?.map((item, i) => (
                    <Badge key={`${type}-${i}`} variant="secondary" className="gap-1">
                      <span className="text-xs text-muted-foreground capitalize">{type}:</span>
                      {item}
                      <button type="button" onClick={() => removeAllergyItem(type, i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Medical History */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Historial Médico</Label>
              <div className="flex gap-2">
                <Select value={newHistoryItem.type} onValueChange={(v) => setNewHistoryItem((prev) => ({ ...prev, type: v }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chronic_conditions">Condiciones crónicas</SelectItem>
                    <SelectItem value="previous_surgeries">Cirugías previas</SelectItem>
                    <SelectItem value="current_medications">Medicamentos actuales</SelectItem>
                    <SelectItem value="family_history">Antecedentes familiares</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Agregar..."
                  value={newHistoryItem.value}
                  onChange={(e) => setNewHistoryItem((prev) => ({ ...prev, value: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHistoryItem())}
                  className="flex-1"
                />
                <Button type="button" size="icon" variant="outline" onClick={addHistoryItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['chronic_conditions', 'previous_surgeries', 'current_medications', 'family_history'] as const).map((type) =>
                  medicalHistory[type]?.map((item, i) => (
                    <Badge key={`${type}-${i}`} variant="outline" className="gap-1">
                      {item}
                      <button type="button" onClick={() => removeHistoryItem(type, i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        )

      case 'treatment':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Textarea
                placeholder="Diagnóstico del paciente"
                value={treatmentPlan.diagnosis || ''}
                onChange={(e) => setTreatmentPlan((prev) => ({ ...prev, diagnosis: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Tratamiento</Label>
              <Textarea
                placeholder="Plan de tratamiento"
                value={treatmentPlan.treatment || ''}
                onChange={(e) => setTreatmentPlan((prev) => ({ ...prev, treatment: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas de Seguimiento</Label>
              <Textarea
                placeholder="Notas adicionales para seguimiento"
                value={treatmentPlan.follow_up_notes || ''}
                onChange={(e) => setTreatmentPlan((prev) => ({ ...prev, follow_up_notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        )

      case 'attachments':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <Button type="button" variant="outline" size="sm" disabled>
                Seleccionar archivos
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Próximamente: Soporte para imágenes, PDFs y documentos
              </p>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Archivos adjuntos</Label>
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm truncate">{att.name}</span>
                      <Badge variant="outline">{att.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'dynamic':
        return selectedTemplate ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="truncate">{selectedTemplate.name}</span>
              </Label>
              {requiredDynamicFields.length > 0 && !isDynamicFormValid && (
                <span className="text-sm text-amber-600">Campos requeridos *</span>
              )}
            </div>
            <DynamicFormRenderer
              schema={selectedTemplate.toon_schema}
              values={extendedData}
              onChange={handleExtendedDataChange}
              disabled={isSubmitting}
            />
          </div>
        ) : null

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Historia Clínica' : 'Nueva Historia Clínica'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica la información de la historia clínica' : 'Completa los pasos para crear la historia clínica'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-2 py-3 border-b overflow-x-auto">
          {actualSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(index)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors min-w-fit',
                index === currentStep && 'bg-primary text-primary-foreground',
                index < currentStep && 'text-primary',
                index > currentStep && 'text-muted-foreground',
                index <= currentStep && 'cursor-pointer hover:bg-accent',
                index > currentStep && !isStepValid(currentStep) && 'cursor-not-allowed opacity-50'
              )}
              disabled={index > currentStep && !isStepValid(currentStep)}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full border-2',
                  index === currentStep && 'border-primary-foreground bg-primary-foreground text-primary',
                  index < currentStep && 'border-primary bg-primary text-primary-foreground',
                  index > currentStep && 'border-muted-foreground'
                )}
              >
                {index < currentStep ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <span className="text-sm font-medium hidden sm:block">{step.title}</span>
              {step.isOptional && <span className="text-xs text-muted-foreground hidden md:block">(opcional)</span>}
            </button>
          ))}
        </div>

        {/* Step Content - Scrollable */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-1 py-4">{renderStepContent()}</div>

            {/* Footer - Sticky */}
            <DialogFooter className="shrink-0 pt-4 border-t">
              <div className="flex w-full justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 0 || isSubmitting}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>

                  {isLastStep ? (
                    <Button type="submit" disabled={!canSubmit}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : isEditing ? (
                        'Actualizar'
                      ) : (
                        'Crear Historia'
                      )}
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleNext} disabled={!canGoNext}>
                      Siguiente
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
