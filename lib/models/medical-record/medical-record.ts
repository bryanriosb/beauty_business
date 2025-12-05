import type { BusinessCustomer } from '@/lib/models/customer/business-customer'

export type MedicalRecordStatus = 'active' | 'archived' | 'deleted'

export type MedicalRecordType =
  | 'initial_assessment'
  | 'follow_up'
  | 'procedure'
  | 'consultation'
  | 'pre_operative'
  | 'post_operative'

export interface MedicalRecordVitalSigns {
  blood_pressure?: string
  heart_rate?: number
  temperature?: number
  weight?: number
  height?: number
  bmi?: number
}

export interface MedicalRecordAllergies {
  medications?: string[]
  products?: string[]
  other?: string[]
}

export interface MedicalRecordMedicalHistory {
  chronic_conditions?: string[]
  previous_surgeries?: string[]
  current_medications?: string[]
  family_history?: string[]
}

export interface MedicalRecordTreatmentPlan {
  diagnosis?: string
  treatment?: string
  recommendations?: string[]
  next_appointment?: string
  follow_up_notes?: string
}

export interface MedicalRecordAttachment {
  id: string
  name: string
  url: string
  type: string
  uploaded_at: string
}

export interface IMedicalRecord {
  id: string
  business_id: string
  customer_id: string
  specialist_id: string | null
  record_type: MedicalRecordType
  record_date: string
  chief_complaint: string | null
  vital_signs: MedicalRecordVitalSigns | null
  allergies: MedicalRecordAllergies | null
  medical_history: MedicalRecordMedicalHistory | null
  clinical_notes: string | null
  treatment_plan: MedicalRecordTreatmentPlan | null
  attachments: MedicalRecordAttachment[] | null
  status: MedicalRecordStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type MedicalRecord = IMedicalRecord

export class MedicalRecordModel implements IMedicalRecord {
  id: string
  business_id: string
  customer_id: string
  specialist_id: string | null
  record_type: MedicalRecordType
  record_date: string
  chief_complaint: string | null
  vital_signs: MedicalRecordVitalSigns | null
  allergies: MedicalRecordAllergies | null
  medical_history: MedicalRecordMedicalHistory | null
  clinical_notes: string | null
  treatment_plan: MedicalRecordTreatmentPlan | null
  attachments: MedicalRecordAttachment[] | null
  status: MedicalRecordStatus
  created_by: string | null
  created_at: string
  updated_at: string

  constructor(data: IMedicalRecord) {
    this.id = data.id
    this.business_id = data.business_id
    this.customer_id = data.customer_id
    this.specialist_id = data.specialist_id
    this.record_type = data.record_type
    this.record_date = data.record_date
    this.chief_complaint = data.chief_complaint
    this.vital_signs = data.vital_signs
    this.allergies = data.allergies
    this.medical_history = data.medical_history
    this.clinical_notes = data.clinical_notes
    this.treatment_plan = data.treatment_plan
    this.attachments = data.attachments
    this.status = data.status
    this.created_by = data.created_by
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get isActive(): boolean {
    return this.status === 'active'
  }

  get hasAllergies(): boolean {
    if (!this.allergies) return false
    return (
      (this.allergies.medications?.length ?? 0) > 0 ||
      (this.allergies.products?.length ?? 0) > 0 ||
      (this.allergies.other?.length ?? 0) > 0
    )
  }

  get allAllergies(): string[] {
    if (!this.allergies) return []
    return [
      ...(this.allergies.medications || []),
      ...(this.allergies.products || []),
      ...(this.allergies.other || []),
    ]
  }

  get attachmentCount(): number {
    return this.attachments?.length ?? 0
  }
}

export interface MedicalRecordInsert {
  business_id: string
  customer_id: string
  specialist_id?: string | null
  record_type: MedicalRecordType
  record_date: string
  chief_complaint?: string | null
  vital_signs?: MedicalRecordVitalSigns | null
  allergies?: MedicalRecordAllergies | null
  medical_history?: MedicalRecordMedicalHistory | null
  clinical_notes?: string | null
  treatment_plan?: MedicalRecordTreatmentPlan | null
  attachments?: MedicalRecordAttachment[] | null
  status?: MedicalRecordStatus
  created_by?: string | null
}

export interface MedicalRecordUpdate {
  specialist_id?: string | null
  record_type?: MedicalRecordType
  record_date?: string
  chief_complaint?: string | null
  vital_signs?: MedicalRecordVitalSigns | null
  allergies?: MedicalRecordAllergies | null
  medical_history?: MedicalRecordMedicalHistory | null
  clinical_notes?: string | null
  treatment_plan?: MedicalRecordTreatmentPlan | null
  attachments?: MedicalRecordAttachment[] | null
  status?: MedicalRecordStatus
}

export interface MedicalRecordWithCustomer extends MedicalRecord {
  customer?: BusinessCustomer | null
}

export interface MedicalRecordWithDetails extends MedicalRecord {
  customer?: BusinessCustomer | null
  specialist?: {
    id: string
    first_name: string
    last_name: string | null
  } | null
}
