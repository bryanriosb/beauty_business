import type { UsersProfile, UserGender } from '@/lib/models/user/users-profile'

export type CustomerSource = 'walk_in' | 'referral' | 'social_media' | 'website' | 'other'
export type CustomerStatus = 'active' | 'inactive' | 'vip' | 'blocked'

export interface CustomerMetadata {
  allergies?: string[]
  preferred_specialist_id?: string
  preferred_services?: string[]
  preferred_payment_method?: string
  special_requirements?: string
  referral_code?: string
  referred_by_customer_id?: string
  custom_fields?: Record<string, unknown>
  [key: string]: unknown
}

export interface BusinessCustomer {
  id: string
  business_id: string
  user_profile_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  status: CustomerStatus
  source: CustomerSource | null
  notes: string | null
  preferences: string | null
  tags: string[] | null
  birthday: string | null
  metadata: CustomerMetadata | null
  total_visits: number
  total_spent_cents: number
  last_visit_at: string | null
  avg_rating_given: number | null
  created_at: string
  updated_at: string
}

export class BusinessCustomer implements BusinessCustomer {
  id: string
  business_id: string
  user_profile_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  status: CustomerStatus
  source: CustomerSource | null
  notes: string | null
  preferences: string | null
  tags: string[] | null
  birthday: string | null
  metadata: CustomerMetadata | null
  total_visits: number
  total_spent_cents: number
  last_visit_at: string | null
  avg_rating_given: number | null
  created_at: string
  updated_at: string

  constructor(data: BusinessCustomer) {
    this.id = data.id
    this.business_id = data.business_id
    this.user_profile_id = data.user_profile_id
    this.first_name = data.first_name
    this.last_name = data.last_name
    this.email = data.email
    this.phone = data.phone
    this.status = data.status
    this.source = data.source
    this.notes = data.notes
    this.preferences = data.preferences
    this.tags = data.tags
    this.birthday = data.birthday
    this.metadata = data.metadata
    this.total_visits = data.total_visits
    this.total_spent_cents = data.total_spent_cents
    this.last_visit_at = data.last_visit_at
    this.avg_rating_given = data.avg_rating_given
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get fullName(): string {
    return `${this.first_name} ${this.last_name || ''}`.trim()
  }

  get totalSpent(): number {
    return this.total_spent_cents / 100
  }

  get isVip(): boolean {
    return this.status === 'vip'
  }

  get isActive(): boolean {
    return this.status === 'active' || this.status === 'vip'
  }

  hasAllergy(allergy: string): boolean {
    return this.metadata?.allergies?.includes(allergy) ?? false
  }

  getMetadataValue<T>(key: string): T | undefined {
    return this.metadata?.[key] as T | undefined
  }
}

export interface BusinessCustomerInsert {
  business_id: string
  user_profile_id: string
  first_name: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  status?: CustomerStatus
  source?: CustomerSource | null
  notes?: string | null
  preferences?: string | null
  tags?: string[] | null
  birthday?: string | null
  metadata?: CustomerMetadata | null
}

export interface BusinessCustomerUpdate {
  first_name?: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  status?: CustomerStatus
  source?: CustomerSource | null
  notes?: string | null
  preferences?: string | null
  tags?: string[] | null
  birthday?: string | null
  metadata?: CustomerMetadata | null
}

export interface BusinessCustomerWithProfile extends BusinessCustomer {
  user_profile?: UsersProfile | null
}

export interface CreateCustomerInput {
  business_id: string
  first_name: string
  last_name?: string | null
  email: string
  phone?: string | null
  // Ubicación (con defaults para Colombia)
  city?: string
  state?: string
  country?: string
  // Datos opcionales para facturación
  date_of_birth?: string | null
  gender?: UserGender | null
  identification_type?: string | null
  identification_number?: string | null
  // Otros
  source?: CustomerSource
  notes?: string | null
  metadata?: CustomerMetadata | null
}
