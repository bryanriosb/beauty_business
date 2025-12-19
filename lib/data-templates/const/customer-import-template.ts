import type { CustomerSource, CustomerStatus } from '@/lib/models/customer/business-customer'
import type { UserGender } from '@/lib/models/user/users-profile'

export interface CustomerRow {
  first_name: string
  last_name: string
  email: string
  phone?: string
  source?: CustomerSource
  status?: CustomerStatus
  notes?: string
  birthday?: string
  city?: string
  state?: string
  country?: string
  gender?: UserGender
  identification_type?: string
  identification_number?: string
}

export const DEFAULT_CUSTOMER_TEMPLATES: CustomerRow[] = [
  {
    first_name: 'María',
    last_name: 'González',
    email: 'maria.gonzalez@example.com',
    phone: '+57 300 123 4567',
    source: 'walk_in',
    status: 'active',
    notes: 'Cliente frecuente, prefiere citas en la mañana',
    birthday: '1990-05-15',
    city: 'Cali',
    state: 'Valle del Cauca',
    country: 'CO',
    gender: 'FEMALE',
    identification_type: 'CC',
    identification_number: '1234567890',
  },
  {
    first_name: 'Carlos',
    last_name: 'Ramírez',
    email: 'carlos.ramirez@example.com',
    phone: '+57 301 234 5678',
    source: 'social_media',
    status: 'vip',
    notes: 'Cliente VIP, atención preferencial',
    birthday: '1985-08-22',
    city: 'Cali',
    state: 'Valle del Cauca',
    country: 'CO',
    gender: 'MALE',
  },
  {
    first_name: 'Ana',
    last_name: 'Martínez',
    email: 'ana.martinez@example.com',
    phone: '+57 302 345 6789',
    source: 'referral',
    status: 'active',
    birthday: '1995-03-10',
    city: 'Cali',
    state: 'Valle del Cauca',
    country: 'CO',
    gender: 'FEMALE',
  },
  {
    first_name: 'Luis',
    last_name: 'Torres',
    email: 'luis.torres@example.com',
    source: 'website',
    status: 'active',
    notes: 'Nuevo cliente desde el sitio web',
    city: 'Cali',
    state: 'Valle del Cauca',
    country: 'CO',
  },
]
