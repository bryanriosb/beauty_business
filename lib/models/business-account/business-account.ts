export type SubscriptionPlan = 'trial' | 'free' | 'basic' | 'pro' | 'enterprise'
export type AccountStatus = 'active' | 'suspended' | 'cancelled' | 'trial'

export interface BusinessAccount {
  id: string
  company_name: string
  tax_id: string | null
  legal_name: string | null
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_postal_code: string | null
  billing_country: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  subscription_plan: SubscriptionPlan
  status: AccountStatus
  trial_ends_at: string | null
  subscription_started_at: string | null
  settings: Record<string, unknown> | null
  plan_id: string | null
  custom_trial_days: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export class BusinessAccount implements BusinessAccount {
  id: string
  company_name: string
  tax_id: string | null
  legal_name: string | null
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_postal_code: string | null
  billing_country: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  subscription_plan: SubscriptionPlan
  status: AccountStatus
  trial_ends_at: string | null
  subscription_started_at: string | null
  settings: Record<string, unknown> | null
  plan_id: string | null
  custom_trial_days: number | null
  created_by: string
  created_at: string
  updated_at: string

  constructor(data: BusinessAccount) {
    this.id = data.id
    this.company_name = data.company_name
    this.tax_id = data.tax_id
    this.legal_name = data.legal_name
    this.billing_address = data.billing_address
    this.billing_city = data.billing_city
    this.billing_state = data.billing_state
    this.billing_postal_code = data.billing_postal_code
    this.billing_country = data.billing_country
    this.contact_name = data.contact_name
    this.contact_email = data.contact_email
    this.contact_phone = data.contact_phone
    this.subscription_plan = data.subscription_plan
    this.status = data.status
    this.trial_ends_at = data.trial_ends_at
    this.subscription_started_at = data.subscription_started_at
    this.settings = data.settings
    this.plan_id = data.plan_id
    this.custom_trial_days = data.custom_trial_days
    this.created_by = data.created_by
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  isActive(): boolean {
    return this.status === 'active' || this.status === 'trial'
  }

  isOnTrial(): boolean {
    if (this.status !== 'trial' || !this.trial_ends_at) return false
    return new Date(this.trial_ends_at) > new Date()
  }

  /** @deprecated Use canCreateBusinessInAccountAction instead - this method doesn't check actual business count */
  canCreateBusiness(): boolean {
    return this.isActive() && this.plan_id !== null
  }
}

export interface BusinessAccountInsert {
  company_name: string
  tax_id?: string | null
  legal_name?: string | null
  billing_address?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_postal_code?: string | null
  billing_country: string
  contact_name: string
  contact_email: string
  contact_phone?: string | null
  subscription_plan?: SubscriptionPlan
  status?: AccountStatus
  trial_ends_at?: string | null
  subscription_started_at?: string | null
  settings?: Record<string, unknown> | null
  plan_id?: string | null
  custom_trial_days?: number | null
  created_by: string
}

export interface BusinessAccountUpdate {
  company_name?: string
  tax_id?: string | null
  legal_name?: string | null
  billing_address?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_postal_code?: string | null
  billing_country?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string | null
  subscription_plan?: SubscriptionPlan
  status?: AccountStatus
  trial_ends_at?: string | null
  subscription_started_at?: string | null
  settings?: Record<string, unknown> | null
  plan_id?: string | null
  custom_trial_days?: number | null
}
