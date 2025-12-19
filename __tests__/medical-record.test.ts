import { describe, it, expect } from 'vitest'
import {
  MedicalRecordModel,
  type MedicalRecord,
  type MedicalRecordInsert,
  type MedicalRecordAllergies,
  type MedicalRecordVitalSigns,
  type MedicalRecordMedicalHistory,
  type MedicalRecordTreatmentPlan,
} from '@/lib/models/medical-record/medical-record'

const createMockMedicalRecord = (
  overrides?: Partial<MedicalRecord>
): MedicalRecord => ({
  id: 'mr-12345678-abcd-1234-efgh-123456789012',
  business_id: 'biz-1',
  customer_id: 'cust-1',
  specialist_id: 'spec-1',
  record_type: 'consultation',
  record_date: '2024-01-15',
  chief_complaint: 'Evaluación facial para tratamiento anti-edad',
  vital_signs: {
    blood_pressure: '120/80',
    heart_rate: 72,
    temperature: 36.5,
    weight: 65,
    height: 165,
    bmi: 23.9,
  },
  allergies: {
    medications: ['Penicilina'],
    products: ['Látex'],
    other: [],
  },
  medical_history: {
    chronic_conditions: ['Hipertensión'],
    previous_surgeries: ['Rinoplastia 2020'],
    current_medications: ['Losartán 50mg'],
    family_history: ['Diabetes tipo 2'],
  },
  clinical_notes: 'Paciente presenta signos de envejecimiento prematuro.',
  treatment_plan: {
    diagnosis: 'Envejecimiento cutáneo prematuro',
    treatment: 'Aplicación de ácido hialurónico en zona periocular',
    recommendations: ['Usar protector solar SPF 50', 'Hidratación constante'],
    follow_up_notes: 'Control en 2 semanas',
  },
  attachments: [],
  status: 'active',
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  extended_data: null,
  form_template_id: null,
  signature_data: null,
  signature_date: null,
  signed_by_name: null,
  signed_by_document: null,
  signature_ip: null,
  specialist_signature_data: null,
  specialist_signature_date: null,
  ...overrides,
})

describe('MedicalRecord Model', () => {
  describe('MedicalRecordModel class', () => {
    it('should create a valid MedicalRecordModel instance', () => {
      const data = createMockMedicalRecord()
      const record = new MedicalRecordModel(data)

      expect(record.id).toBe(data.id)
      expect(record.business_id).toBe(data.business_id)
      expect(record.customer_id).toBe(data.customer_id)
      expect(record.record_type).toBe('consultation')
      expect(record.status).toBe('active')
    })

    it('should correctly identify active records', () => {
      const activeRecord = new MedicalRecordModel(createMockMedicalRecord({ status: 'active' }))
      const archivedRecord = new MedicalRecordModel(createMockMedicalRecord({ status: 'archived' }))

      expect(activeRecord.isActive).toBe(true)
      expect(archivedRecord.isActive).toBe(false)
    })

    it('should correctly identify records with allergies', () => {
      const withAllergies = new MedicalRecordModel(
        createMockMedicalRecord({
          allergies: { medications: ['Penicilina'], products: [], other: [] },
        })
      )
      const withoutAllergies = new MedicalRecordModel(
        createMockMedicalRecord({
          allergies: { medications: [], products: [], other: [] },
        })
      )
      const nullAllergies = new MedicalRecordModel(
        createMockMedicalRecord({ allergies: null })
      )

      expect(withAllergies.hasAllergies).toBe(true)
      expect(withoutAllergies.hasAllergies).toBe(false)
      expect(nullAllergies.hasAllergies).toBe(false)
    })

    it('should aggregate all allergies correctly', () => {
      const record = new MedicalRecordModel(
        createMockMedicalRecord({
          allergies: {
            medications: ['Penicilina', 'Ibuprofeno'],
            products: ['Látex'],
            other: ['Polen'],
          },
        })
      )

      const allAllergies = record.allAllergies
      expect(allAllergies).toHaveLength(4)
      expect(allAllergies).toContain('Penicilina')
      expect(allAllergies).toContain('Látex')
      expect(allAllergies).toContain('Polen')
    })

    it('should return empty array when no allergies', () => {
      const record = new MedicalRecordModel(createMockMedicalRecord({ allergies: null }))
      expect(record.allAllergies).toEqual([])
    })

    it('should count attachments correctly', () => {
      const withAttachments = new MedicalRecordModel(
        createMockMedicalRecord({
          attachments: [
            { id: '1', name: 'foto1.jpg', url: 'http://...', type: 'image/jpeg', uploaded_at: '2024-01-15' },
            { id: '2', name: 'foto2.jpg', url: 'http://...', type: 'image/jpeg', uploaded_at: '2024-01-15' },
          ],
        })
      )
      const noAttachments = new MedicalRecordModel(
        createMockMedicalRecord({ attachments: null })
      )

      expect(withAttachments.attachmentCount).toBe(2)
      expect(noAttachments.attachmentCount).toBe(0)
    })
  })

  describe('MedicalRecord types', () => {
    it('should support all record types', () => {
      const types = [
        'initial_assessment',
        'follow_up',
        'procedure',
        'consultation',
        'pre_operative',
        'post_operative',
      ] as const

      types.forEach((type) => {
        const record = createMockMedicalRecord({ record_type: type })
        expect(record.record_type).toBe(type)
      })
    })

    it('should support all status types', () => {
      const statuses = ['active', 'archived', 'deleted'] as const

      statuses.forEach((status) => {
        const record = createMockMedicalRecord({ status })
        expect(record.status).toBe(status)
      })
    })
  })

  describe('VitalSigns interface', () => {
    it('should handle complete vital signs', () => {
      const vitalSigns: MedicalRecordVitalSigns = {
        blood_pressure: '120/80',
        heart_rate: 72,
        temperature: 36.5,
        weight: 70,
        height: 175,
        bmi: 22.9,
      }

      expect(vitalSigns.blood_pressure).toBe('120/80')
      expect(vitalSigns.heart_rate).toBe(72)
      expect(vitalSigns.bmi).toBeCloseTo(22.9, 1)
    })

    it('should handle partial vital signs', () => {
      const vitalSigns: MedicalRecordVitalSigns = {
        blood_pressure: '130/85',
      }

      expect(vitalSigns.blood_pressure).toBe('130/85')
      expect(vitalSigns.heart_rate).toBeUndefined()
      expect(vitalSigns.weight).toBeUndefined()
    })
  })

  describe('Allergies interface', () => {
    it('should handle multiple allergies in each category', () => {
      const allergies: MedicalRecordAllergies = {
        medications: ['Penicilina', 'Aspirina', 'Ibuprofeno'],
        products: ['Látex', 'Níquel'],
        other: ['Mariscos', 'Nueces'],
      }

      expect(allergies.medications).toHaveLength(3)
      expect(allergies.products).toHaveLength(2)
      expect(allergies.other).toHaveLength(2)
    })

    it('should handle empty allergies', () => {
      const allergies: MedicalRecordAllergies = {
        medications: [],
        products: [],
        other: [],
      }

      expect(allergies.medications).toHaveLength(0)
    })
  })

  describe('MedicalHistory interface', () => {
    it('should handle complete medical history', () => {
      const history: MedicalRecordMedicalHistory = {
        chronic_conditions: ['Diabetes tipo 2', 'Hipertensión'],
        previous_surgeries: ['Apendicectomía 2015', 'Cesárea 2018'],
        current_medications: ['Metformina 850mg', 'Losartán 50mg'],
        family_history: ['Cáncer de mama (madre)', 'Diabetes (padre)'],
      }

      expect(history.chronic_conditions).toHaveLength(2)
      expect(history.previous_surgeries).toHaveLength(2)
      expect(history.current_medications).toHaveLength(2)
      expect(history.family_history).toHaveLength(2)
    })
  })

  describe('TreatmentPlan interface', () => {
    it('should handle complete treatment plan', () => {
      const plan: MedicalRecordTreatmentPlan = {
        diagnosis: 'Acné severo',
        treatment: 'Tratamiento con isotretinoína oral',
        recommendations: [
          'Evitar exposición solar',
          'Usar hidratante sin aceite',
          'Control mensual de laboratorios',
        ],
        next_appointment: '2024-02-15',
        follow_up_notes: 'Revisar resultados de laboratorio en próxima cita',
      }

      expect(plan.diagnosis).toBe('Acné severo')
      expect(plan.recommendations).toHaveLength(3)
      expect(plan.next_appointment).toBe('2024-02-15')
    })

    it('should handle minimal treatment plan', () => {
      const plan: MedicalRecordTreatmentPlan = {
        diagnosis: 'Evaluación de rutina',
      }

      expect(plan.diagnosis).toBe('Evaluación de rutina')
      expect(plan.treatment).toBeUndefined()
      expect(plan.recommendations).toBeUndefined()
    })
  })

  describe('MedicalRecordInsert interface', () => {
    it('should create valid insert data', () => {
      const insertData: MedicalRecordInsert = {
        business_id: 'biz-1',
        customer_id: 'cust-1',
        record_type: 'initial_assessment',
        record_date: '2024-01-15',
        chief_complaint: 'Primera consulta dermatológica',
      }

      expect(insertData.business_id).toBe('biz-1')
      expect(insertData.customer_id).toBe('cust-1')
      expect(insertData.record_type).toBe('initial_assessment')
    })

    it('should allow optional fields', () => {
      const insertData: MedicalRecordInsert = {
        business_id: 'biz-1',
        customer_id: 'cust-1',
        record_type: 'consultation',
        record_date: '2024-01-15',
        specialist_id: 'spec-1',
        allergies: { medications: ['Penicilina'], products: [], other: [] },
        vital_signs: { blood_pressure: '120/80' },
      }

      expect(insertData.specialist_id).toBe('spec-1')
      expect(insertData.allergies?.medications).toContain('Penicilina')
    })
  })
})

describe('Edge Cases', () => {
  it('should handle null values gracefully', () => {
    const record = new MedicalRecordModel(
      createMockMedicalRecord({
        specialist_id: null,
        chief_complaint: null,
        vital_signs: null,
        allergies: null,
        medical_history: null,
        clinical_notes: null,
        treatment_plan: null,
        attachments: null,
      })
    )

    expect(record.specialist_id).toBeNull()
    expect(record.hasAllergies).toBe(false)
    expect(record.allAllergies).toEqual([])
    expect(record.attachmentCount).toBe(0)
  })

  it('should handle special characters in text fields', () => {
    const record = createMockMedicalRecord({
      chief_complaint: "Paciente refiere dolor tipo 'punzante' en área <facial>",
      clinical_notes: 'Notas con "comillas" y caracteres especiales: áéíóú ñ',
    })

    expect(record.chief_complaint).toContain("'punzante'")
    expect(record.clinical_notes).toContain('"comillas"')
    expect(record.clinical_notes).toContain('áéíóú')
  })

  it('should handle very long text content', () => {
    const longText = 'Lorem ipsum '.repeat(1000)
    const record = createMockMedicalRecord({
      clinical_notes: longText,
    })

    expect(record.clinical_notes?.length).toBeGreaterThan(10000)
  })

  it('should handle empty arrays in allergies', () => {
    const record = new MedicalRecordModel(
      createMockMedicalRecord({
        allergies: {
          medications: [],
          products: [],
          other: [],
        },
      })
    )

    expect(record.hasAllergies).toBe(false)
    expect(record.allAllergies).toEqual([])
  })

  it('should handle undefined arrays in allergies', () => {
    const record = new MedicalRecordModel(
      createMockMedicalRecord({
        allergies: {
          medications: undefined,
          products: undefined,
          other: undefined,
        },
      })
    )

    expect(record.hasAllergies).toBe(false)
    expect(record.allAllergies).toEqual([])
  })
})

describe('Business Logic', () => {
  it('should identify high-risk patients with multiple allergies', () => {
    const record = new MedicalRecordModel(
      createMockMedicalRecord({
        allergies: {
          medications: ['Penicilina', 'Sulfonamidas', 'Aspirina'],
          products: ['Látex'],
          other: ['Mariscos'],
        },
      })
    )

    expect(record.hasAllergies).toBe(true)
    expect(record.allAllergies.length).toBeGreaterThanOrEqual(3)
  })

  it('should support pre and post operative records', () => {
    const preOp = createMockMedicalRecord({ record_type: 'pre_operative' })
    const postOp = createMockMedicalRecord({ record_type: 'post_operative' })

    expect(preOp.record_type).toBe('pre_operative')
    expect(postOp.record_type).toBe('post_operative')
  })

  it('should track record dates correctly', () => {
    const record = createMockMedicalRecord({
      record_date: '2024-03-15',
      created_at: '2024-03-15T14:30:00Z',
      updated_at: '2024-03-16T09:00:00Z',
    })

    expect(record.record_date).toBe('2024-03-15')
    expect(new Date(record.updated_at).getTime()).toBeGreaterThan(
      new Date(record.created_at).getTime()
    )
  })
})
