import type { BusinessType } from '@/lib/types/enums'

/**
 * Módulos del sistema
 */
export const MODULES = {
  APPOINTMENTS: 'appointments',
  MEDICAL_RECORDS: 'medical_records',
  INVENTORY: 'inventory',
  REPORTS: 'reports',
  CLIENTS: 'clients',
  SERVICES: 'services',
  SPECIALISTS: 'specialists',
  PRODUCTS: 'products',
  COMMISSIONS: 'commissions',
  WHATSAPP: 'whatsapp',
} as const

export type ModuleName = (typeof MODULES)[keyof typeof MODULES]

/**
 * Planes de suscripción
 */
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  TRIAL: 'trial',
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS]

/**
 * Configuración de acceso a módulos por tipo de negocio
 *
 * Define qué tipos de negocio tienen acceso a cada módulo.
 * Si un módulo no está en esta lista, está disponible para todos los tipos de negocio.
 */
export const MODULE_ACCESS_BY_BUSINESS_TYPE: Partial<Record<ModuleName, BusinessType[]>> = {
  [MODULES.MEDICAL_RECORDS]: [
    'AESTHETICS_CENTER',
    'SPA',
    'PLASTIC_SURGERY_CENTER',
    'CONSULTORY',
  ],
}

/**
 * Configuración de acceso a módulos por plan de suscripción
 *
 * Define qué planes tienen acceso a cada módulo.
 * Si un módulo no está en esta lista, está disponible para todos los planes.
 */
export const MODULE_ACCESS_BY_PLAN: Partial<Record<ModuleName, SubscriptionPlan[]>> = {
  [MODULES.MEDICAL_RECORDS]: [
    SUBSCRIPTION_PLANS.PROFESSIONAL,
    SUBSCRIPTION_PLANS.ENTERPRISE,
    SUBSCRIPTION_PLANS.TRIAL, // Trial tiene acceso a todo para evaluar
  ],
  [MODULES.WHATSAPP]: [
    SUBSCRIPTION_PLANS.PROFESSIONAL,
    SUBSCRIPTION_PLANS.ENTERPRISE,
    SUBSCRIPTION_PLANS.TRIAL,
  ],
  [MODULES.COMMISSIONS]: [
    SUBSCRIPTION_PLANS.PROFESSIONAL,
    SUBSCRIPTION_PLANS.ENTERPRISE,
    SUBSCRIPTION_PLANS.TRIAL,
  ],
  // Los módulos básicos están disponibles en todos los planes
  // [MODULES.APPOINTMENTS]: [SUBSCRIPTION_PLANS.BASIC, ...],
  // [MODULES.CLIENTS]: [SUBSCRIPTION_PLANS.BASIC, ...],
}

/**
 * Verifica si un tipo de negocio tiene acceso a un módulo específico
 */
export function hasBusinessTypeAccess(
  module: ModuleName,
  businessType: BusinessType
): boolean {
  const allowedTypes = MODULE_ACCESS_BY_BUSINESS_TYPE[module]

  // Si el módulo no tiene restricciones por tipo de negocio, está disponible para todos
  if (!allowedTypes) {
    return true
  }

  return allowedTypes.includes(businessType)
}

/**
 * Verifica si un plan de suscripción tiene acceso a un módulo específico
 */
export function hasPlanAccess(
  module: ModuleName,
  plan: SubscriptionPlan
): boolean {
  const allowedPlans = MODULE_ACCESS_BY_PLAN[module]

  // Si el módulo no tiene restricciones por plan, está disponible para todos
  if (!allowedPlans) {
    return true
  }

  return allowedPlans.includes(plan)
}

/**
 * Verifica si se tiene acceso completo a un módulo
 * (Valida tanto el tipo de negocio como el plan de suscripción)
 */
export function hasModuleAccess(
  module: ModuleName,
  businessType: BusinessType,
  plan: SubscriptionPlan
): boolean {
  const hasTypeAccess = hasBusinessTypeAccess(module, businessType)
  const hasSubscriptionAccess = hasPlanAccess(module, plan)

  return hasTypeAccess && hasSubscriptionAccess
}

/**
 * Obtiene la lista de módulos disponibles para un tipo de negocio y plan específicos
 */
export function getAvailableModules(
  businessType: BusinessType,
  plan: SubscriptionPlan
): ModuleName[] {
  return Object.values(MODULES).filter((module) =>
    hasModuleAccess(module, businessType, plan)
  )
}

/**
 * Obtiene el motivo por el cual no se tiene acceso a un módulo
 */
export function getAccessDeniedReason(
  module: ModuleName,
  businessType: BusinessType,
  plan: SubscriptionPlan
): string | null {
  const hasTypeAccess = hasBusinessTypeAccess(module, businessType)
  const hasSubscriptionAccess = hasPlanAccess(module, plan)

  if (!hasTypeAccess && !hasSubscriptionAccess) {
    return 'Este módulo no está disponible para tu tipo de negocio y plan de suscripción'
  }

  if (!hasTypeAccess) {
    return 'Este módulo no está disponible para tu tipo de negocio'
  }

  if (!hasSubscriptionAccess) {
    return 'Este módulo requiere un plan superior. Actualiza tu suscripción para acceder'
  }

  return null
}
