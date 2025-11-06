import type { DayOfWeek } from '@/lib/types/enums'

export interface Specialist {
  id: string
  business_id: string | null
  first_name: string
  last_name: string | null
  specialty: string | null
  profile_picture_url: string | null
  bio: string | null
  is_featured: boolean
  avg_rating: number
  review_count: number
  trending_score: number
  created_at: string
  updated_at: string
}

export class Specialist implements Specialist {
  id: string
  business_id: string | null
  first_name: string
  last_name: string | null
  specialty: string | null
  profile_picture_url: string | null
  bio: string | null
  is_featured: boolean
  avg_rating: number
  review_count: number
  trending_score: number
  created_at: string
  updated_at: string

  constructor(data: Specialist) {
    this.id = data.id
    this.business_id = data.business_id
    this.first_name = data.first_name
    this.last_name = data.last_name
    this.specialty = data.specialty
    this.profile_picture_url = data.profile_picture_url
    this.bio = data.bio
    this.is_featured = data.is_featured
    this.avg_rating = data.avg_rating
    this.review_count = data.review_count
    this.trending_score = data.trending_score
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get fullName(): string {
    return `${this.first_name} ${this.last_name || ''}`.trim()
  }
}

export interface SpecialistInsert {
  business_id?: string | null
  first_name: string
  last_name?: string | null
  specialty?: string | null
  profile_picture_url?: string | null
  bio?: string | null
  is_featured?: boolean
}

export interface SpecialistUpdate {
  business_id?: string | null
  first_name?: string
  last_name?: string | null
  specialty?: string | null
  profile_picture_url?: string | null
  bio?: string | null
  is_featured?: boolean
  avg_rating?: number
  review_count?: number
  trending_score?: number
}

export interface SpecialistAvailability {
  id: string
  specialist_id: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  is_available: boolean
}

export interface SpecialistTimeOff {
  id: string
  specialist_id: string
  start_time: string
  end_time: string
  reason: string | null
}

export interface SpecialistWithAvailability extends Specialist {
  availability?: SpecialistAvailability[]
  time_off?: SpecialistTimeOff[]
}
