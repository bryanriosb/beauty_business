import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  coloring: 'Coloración',
  facial: 'Facial',
  haircut: 'Corte de cabello',
  makeup: 'Maquillaje',
  massage: 'Masaje',
  nails: 'Uñas',
  spa: 'Spa',
  waxing: 'Depilación',
}

export function translateCategory(name: string): string {
  const key = name.toLowerCase().trim()
  return CATEGORY_TRANSLATIONS[key] || name
}

export function translateSpecialty(specialty: string): string {
  return specialty
    .split(',')
    .map((cat) => translateCategory(cat.trim()))
    .join(', ')
}

export function formatCurrency(amount: number, currency: string = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
