export interface ServiceCategory {
  id: string
  name: string
  icon_key: string | null
}

export interface Service {
  id: string
  business_id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  duration_minutes: number
  is_featured: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

export class Service implements Service {
  id: string
  business_id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  duration_minutes: number
  is_featured: boolean
  image_url: string | null
  created_at: string
  updated_at: string

  constructor(data: Service) {
    this.id = data.id
    this.business_id = data.business_id
    this.category_id = data.category_id
    this.name = data.name
    this.description = data.description
    this.price_cents = data.price_cents
    this.duration_minutes = data.duration_minutes
    this.is_featured = data.is_featured
    this.image_url = data.image_url
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get price(): number {
    return this.price_cents / 100
  }
}

export interface ServiceInsert {
  business_id: string
  category_id?: string | null
  name: string
  description?: string | null
  price_cents: number
  duration_minutes: number
  is_featured?: boolean
  image_url?: string | null
}

export interface ServiceUpdate {
  business_id?: string
  category_id?: string | null
  name?: string
  description?: string | null
  price_cents?: number
  duration_minutes?: number
  is_featured?: boolean
  image_url?: string | null
}

export interface ServiceWithCategory extends Service {
  category?: ServiceCategory | null
}

export interface AppointmentService {
  id: string
  appointment_id: string
  service_id: string
  price_at_booking_cents: number
  duration_minutes: number
}

export interface AppointmentServiceWithDetails extends AppointmentService {
  service: Service
}
