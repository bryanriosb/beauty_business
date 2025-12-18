'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp, Plus, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import type {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordUpdate,
  MedicalRecordType,
} from '@/lib/models/medical-record/medical-record'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import CustomerSearchSelect from './CustomerSearchSelect'

const RECORD_TYPE_OPTIONS: { value: MedicalRecordType; label: string }[] = [
  { value: 'initial_assessment', label: 'Evaluación inicial' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'procedure', label: 'Procedimiento' },
  { value: 'consultation', label: 'Consulta' },
  { value: 'pre_operative', label: 'Pre-operatorio' },
  { value: 'post_operative', label: 'Post-operatorio' },
]

const medicalRecordSchema = z.object({
  customer_id: z.string().min(1, 'Seleccione un paciente'),
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
  vital_signs: z
    .object({
      blood_pressure: z.string().optional(),
      heart_rate: z.number().optional(),
      temperature: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      bmi: z.number().optional(),
    })
    .optional(),
  allergies: z
    .object({
      medications: z.array(z.string()),
      products: z.array(z.string()),
      other: z.array(z.string()),
    })
    .optional(),
  medical_history: z
    .object({
      chronic_conditions: z.array(z.string()),
      previous_surgeries: z.array(z.string()),
      current_medications: z.array(z.string()),
      family_history: z.array(z.string()),
    })
    .optional(),
  treatment_plan: z
    .object({
      diagnosis: z.string().optional(),
      treatment: z.string().optional(),
      recommendations: z.array(z.string()),
      next_appointment: z.string().optional(),
      follow_up_notes: z.string().optional(),
    })
    .optional(),
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
  const [showVitalSigns, setShowVitalSigns] = useState(false)
  const [showAllergies, setShowAllergies] = useState(false)
  const [showMedicalHistory, setShowMedicalHistory] = useState(false)
  const [showTreatmentPlan, setShowTreatmentPlan] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] =
    useState<BusinessCustomer | null>(preselectedCustomer || null)

  const isEditing = !!record

  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      customer_id: record?.customer_id || '',
      record_type: record?.record_type || 'consultation',
      record_date:
        record?.record_date?.split('T')[0] ||
        new Date().toISOString().split('T')[0],
      chief_complaint: record?.chief_complaint || '',
      clinical_notes: record?.clinical_notes || '',
      vital_signs: record?.vital_signs || {},
      allergies: record?.allergies || {
        medications: [],
        products: [],
        other: [],
      },
      medical_history: record?.medical_history || {
        chronic_conditions: [],
        previous_surgeries: [],
        current_medications: [],
        family_history: [],
      },
      treatment_plan: record?.treatment_plan || {},
    },
  })

  useEffect(() => {
    if (open) {
      if (record) {
        form.reset({
          customer_id: record.customer_id,
          record_type: record.record_type,
          record_date:
            record.record_date?.split('T')[0] ||
            new Date().toISOString().split('T')[0],
          chief_complaint: record.chief_complaint || '',
          clinical_notes: record.clinical_notes || '',
          vital_signs: record.vital_signs || {},
          allergies: record.allergies || {
            medications: [],
            products: [],
            other: [],
          },
          medical_history: record.medical_history || {
            chronic_conditions: [],
            previous_surgeries: [],
            current_medications: [],
            family_history: [],
          },
          treatment_plan: record.treatment_plan || {},
        })
      } else {
        form.reset({
          customer_id: preselectedCustomer?.id || '',
          record_type: 'consultation',
          record_date: new Date().toISOString().split('T')[0],
          chief_complaint: '',
          clinical_notes: '',
          vital_signs: {},
          allergies: { medications: [], products: [], other: [] },
          medical_history: {
            chronic_conditions: [],
            previous_surgeries: [],
            current_medications: [],
            family_history: [],
          },
          treatment_plan: {},
        })
      }
      setSelectedCustomer(preselectedCustomer || null)
      setShowVitalSigns(
        !!record?.vital_signs?.blood_pressure || !!record?.vital_signs?.weight
      )
      setShowAllergies(
        (record?.allergies?.medications?.length ?? 0) > 0 ||
          (record?.allergies?.products?.length ?? 0) > 0
      )
      setShowMedicalHistory(
        (record?.medical_history?.chronic_conditions?.length ?? 0) > 0 ||
          (record?.medical_history?.current_medications?.length ?? 0) > 0
      )
      setShowTreatmentPlan(
        !!record?.treatment_plan?.diagnosis ||
          !!record?.treatment_plan?.treatment
      )
    }
  }, [open, record, preselectedCustomer, form])

  const handleCustomerSelect = (customer: BusinessCustomer | null) => {
    setSelectedCustomer(customer)
    form.setValue('customer_id', customer?.id || '')
  }

  const onSubmit = async (data: MedicalRecordFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEditing && record) {
        const updateData: MedicalRecordUpdate = {
          record_type: data.record_type,
          record_date: data.record_date,
          chief_complaint: data.chief_complaint || null,
          clinical_notes: data.clinical_notes || null,
          vital_signs: data.vital_signs || null,
          allergies: data.allergies || null,
          medical_history: data.medical_history || null,
          treatment_plan: data.treatment_plan || null,
        }
        await onSave(updateData, record.id)
      } else {
        const createData: MedicalRecordInsert = {
          business_id: businessId,
          customer_id: data.customer_id,
          record_type: data.record_type,
          record_date: data.record_date,
          chief_complaint: data.chief_complaint || null,
          clinical_notes: data.clinical_notes || null,
          vital_signs: data.vital_signs || null,
          allergies: data.allergies || null,
          medical_history: data.medical_history || null,
          treatment_plan: data.treatment_plan || null,
          status: 'active',
        }
        await onSave(createData)
      }
      onOpenChange(false)
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Error al guardar la historia clínica'
      console.error('Error saving medical record:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Historia Clínica' : 'Nueva Historia Clínica'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la información de la historia clínica'
              : 'Ingresa los datos de la nueva historia clínica'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col min-h-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Paciente *</Label>
                    <CustomerSearchSelect
                      businessId={businessId}
                      value={selectedCustomer}
                      onChange={handleCustomerSelect}
                      disabled={isEditing}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="record_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={
                              field.value
                                ? new Date(field.value + 'T00:00:00')
                                : undefined
                            }
                            onChange={(date) =>
                              field.onChange(
                                date ? date.toISOString().split('T')[0] : ''
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="record_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de registro</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RECORD_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="chief_complaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de consulta</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describa el motivo principal de la consulta..."
                          rows={2}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinical_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas clínicas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observaciones, hallazgos y notas del especialista..."
                          rows={4}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Collapsible
                  open={showVitalSigns}
                  onOpenChange={setShowVitalSigns}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm font-medium">
                        Signos vitales
                      </span>
                      {showVitalSigns ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4 border-t">
                    <VitalSignsForm control={form.control} />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible
                  open={showAllergies}
                  onOpenChange={setShowAllergies}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm font-medium">Alergias</span>
                      {showAllergies ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4 border-t">
                    <AllergiesForm control={form.control} />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible
                  open={showMedicalHistory}
                  onOpenChange={setShowMedicalHistory}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm font-medium">
                        Antecedentes médicos
                      </span>
                      {showMedicalHistory ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4 border-t">
                    <MedicalHistoryForm control={form.control} />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible
                  open={showTreatmentPlan}
                  onOpenChange={setShowTreatmentPlan}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm font-medium">
                        Plan de tratamiento
                      </span>
                      {showTreatmentPlan ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4 border-t">
                    <TreatmentPlanForm control={form.control} />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <DialogFooter className="shrink-0 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting
                    ? 'Guardando'
                    : isEditing
                    ? 'Actualizar'
                    : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function VitalSignsForm({ control }: { control: any }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <FormField
        control={control}
        name="vital_signs.blood_pressure"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Presión arterial</FormLabel>
            <FormControl>
              <Input
                placeholder="120/80"
                disabled={false}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="vital_signs.heart_rate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Frecuencia cardíaca</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="bpm"
                disabled={false}
                value={field.value || ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="vital_signs.temperature"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Temperatura (°C)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.1"
                placeholder="36.5"
                disabled={false}
                value={field.value || ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="vital_signs.weight"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Peso (kg)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.1"
                disabled={false}
                value={field.value || ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="vital_signs.height"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Altura (cm)</FormLabel>
            <FormControl>
              <Input
                type="number"
                disabled={false}
                value={field.value || ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="vital_signs.bmi"
        render={({ field }) => (
          <FormItem>
            <FormLabel>IMC</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.1"
                value={field.value || ''}
                disabled={true}
                className="bg-muted"
                readOnly
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function AllergiesForm({ control }: { control: any }) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="allergies.medications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Medicamentos</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Agregar medicamento..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="allergies.products"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Productos</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Agregar producto..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="allergies.other"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Otros</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Agregar alergia..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function MedicalHistoryForm({ control }: { control: any }) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="medical_history.chronic_conditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Condiciones crónicas</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Diabetes, hipertensión..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="medical_history.previous_surgeries"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cirugías previas</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Agregar cirugía..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="medical_history.current_medications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Medicamentos actuales</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Agregar medicamento..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="medical_history.family_history"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Antecedentes familiares</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Agregar antecedente..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function TreatmentPlanForm({ control }: { control: any }) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="treatment_plan.diagnosis"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Diagnóstico</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Diagnóstico del paciente..."
                rows={2}
                disabled={false}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="treatment_plan.treatment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tratamiento</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Plan de tratamiento recomendado..."
                rows={3}
                disabled={false}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="treatment_plan.recommendations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recomendaciones</FormLabel>
            <FormControl>
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Agregar recomendación..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="treatment_plan.follow_up_notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas de seguimiento</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Notas adicionales para seguimiento..."
                rows={2}
                disabled={false}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
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
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
