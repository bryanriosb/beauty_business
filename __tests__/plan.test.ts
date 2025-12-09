import { describe, it, expect } from 'vitest'
import type {
  Plan,
  PlanInsert,
  PlanModule,
  PlanModuleAccess,
  PlanFeatures,
  BillingPeriod,
  PlanStatus,
} from '@/lib/models/plan/plan'
import { DEFAULT_PLAN_FEATURES } from '@/lib/models/plan/plan'

const createMockPlan = (overrides?: Partial<Plan>): Plan => ({
  id: 'plan-12345678-abcd-1234-efgh-123456789012',
  code: 'pro_monthly',
  name: 'Plan Profesional',
  description: 'Plan para negocios en crecimiento',
  price_cents: 9900000,
  billing_period: 'monthly',
  status: 'active',
  max_businesses: 3,
  max_users_per_business: 10,
  max_specialists_per_business: 10,
  features: {
    // Límites de uso
    max_appointments_per_month: null,
    max_products: null,
    max_services: null,
    max_customers: null,
    max_storage_mb: null,
    // Configuraciones adicionales
    has_custom_branding: false,
    has_priority_support: true,
    has_api_access: false,
  },
  sort_order: 2,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockPlanModule = (overrides?: Partial<PlanModule>): PlanModule => ({
  id: 'mod-12345678-abcd-1234-efgh-123456789012',
  code: 'appointments',
  name: 'Citas',
  description: 'Gestión de citas y agenda',
  icon_key: 'Calendar',
  is_active: true,
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

describe('Plan Model', () => {
  describe('Plan interface', () => {
    it('should create a valid Plan object', () => {
      const plan = createMockPlan()

      expect(plan.id).toBe('plan-12345678-abcd-1234-efgh-123456789012')
      expect(plan.code).toBe('pro_monthly')
      expect(plan.name).toBe('Plan Profesional')
      expect(plan.status).toBe('active')
      expect(plan.billing_period).toBe('monthly')
    })

    it('should support all billing periods', () => {
      const periods: BillingPeriod[] = ['monthly', 'yearly', 'lifetime']

      periods.forEach((period) => {
        const plan = createMockPlan({ billing_period: period })
        expect(plan.billing_period).toBe(period)
      })
    })

    it('should support all status types', () => {
      const statuses: PlanStatus[] = ['active', 'inactive', 'deprecated']

      statuses.forEach((status) => {
        const plan = createMockPlan({ status })
        expect(plan.status).toBe(status)
      })
    })

    it('should handle different price values', () => {
      const freePlan = createMockPlan({ price_cents: 0 })
      const paidPlan = createMockPlan({ price_cents: 4900000 })
      const premiumPlan = createMockPlan({ price_cents: 19900000 })

      expect(freePlan.price_cents).toBe(0)
      expect(paidPlan.price_cents).toBe(4900000)
      expect(premiumPlan.price_cents).toBe(19900000)
    })
  })

  describe('PlanFeatures interface', () => {
    it('should handle boolean features', () => {
      const features: PlanFeatures = {
        // Límites de uso
        max_appointments_per_month: null,
        max_products: null,
        max_services: null,
        max_customers: null,
        max_storage_mb: null,
        // Configuraciones adicionales
        has_custom_branding: true,
        has_priority_support: true,
        has_api_access: false,
      }

      expect(features.has_custom_branding).toBe(true)
      expect(features.has_api_access).toBe(false)
    })

    it('should handle numeric limits', () => {
      const limitedFeatures: PlanFeatures = {
        ...DEFAULT_PLAN_FEATURES,
        max_appointments_per_month: 100,
        max_products: 50,
        max_services: 25,
      }

      const unlimitedFeatures: PlanFeatures = {
        ...DEFAULT_PLAN_FEATURES,
        max_appointments_per_month: null,
        max_products: null,
        max_services: null,
      }

      expect(limitedFeatures.max_appointments_per_month).toBe(100)
      expect(limitedFeatures.max_products).toBe(50)
      expect(unlimitedFeatures.max_appointments_per_month).toBeNull()
    })

    it('should allow custom feature keys', () => {
      const features: PlanFeatures = {
        ...DEFAULT_PLAN_FEATURES,
        custom_feature: true,
        another_limit: 500,
      }

      expect(features.custom_feature).toBe(true)
      expect(features.another_limit).toBe(500)
    })
  })

  describe('PlanModule interface', () => {
    it('should create a valid PlanModule object', () => {
      const module = createMockPlanModule()

      expect(module.id).toBe('mod-12345678-abcd-1234-efgh-123456789012')
      expect(module.code).toBe('appointments')
      expect(module.name).toBe('Citas')
      expect(module.is_active).toBe(true)
    })

    it('should handle optional fields', () => {
      const moduleWithoutDesc = createMockPlanModule({
        description: null,
        icon_key: null,
      })

      expect(moduleWithoutDesc.description).toBeNull()
      expect(moduleWithoutDesc.icon_key).toBeNull()
    })
  })

  describe('PlanModuleAccess interface', () => {
    it('should create valid access permissions', () => {
      const access: PlanModuleAccess = {
        id: 'access-1',
        plan_id: 'plan-1',
        module_id: 'mod-1',
        can_read: true,
        can_write: true,
        can_delete: false,
        custom_permissions: null,
        created_at: '2024-01-15T10:00:00Z',
      }

      expect(access.can_read).toBe(true)
      expect(access.can_write).toBe(true)
      expect(access.can_delete).toBe(false)
    })

    it('should handle custom permissions', () => {
      const access: PlanModuleAccess = {
        id: 'access-1',
        plan_id: 'plan-1',
        module_id: 'mod-1',
        can_read: true,
        can_write: true,
        can_delete: true,
        custom_permissions: {
          can_export: true,
          can_bulk_edit: false,
        },
        created_at: '2024-01-15T10:00:00Z',
      }

      expect(access.custom_permissions?.can_export).toBe(true)
      expect(access.custom_permissions?.can_bulk_edit).toBe(false)
    })
  })

  describe('PlanInsert interface', () => {
    it('should create valid insert data with required fields', () => {
      const insertData: PlanInsert = {
        code: 'basic_monthly',
        name: 'Plan Básico',
        price_cents: 4900000,
        billing_period: 'monthly',
        max_businesses: 1,
        max_users_per_business: 5,
        max_specialists_per_business: 3,
        features: DEFAULT_PLAN_FEATURES,
      }

      expect(insertData.code).toBe('basic_monthly')
      expect(insertData.name).toBe('Plan Básico')
      expect(insertData.price_cents).toBe(4900000)
    })

    it('should allow optional fields', () => {
      const insertData: PlanInsert = {
        code: 'pro_yearly',
        name: 'Plan Pro Anual',
        description: 'Ahorra 2 meses con el plan anual',
        price_cents: 99000000,
        billing_period: 'yearly',
        status: 'active',
        max_businesses: 5,
        max_users_per_business: 20,
        max_specialists_per_business: 15,
        features: {
          ...DEFAULT_PLAN_FEATURES,
          has_custom_branding: true,
          has_priority_support: true,
        },
        sort_order: 5,
      }

      expect(insertData.description).toBe('Ahorra 2 meses con el plan anual')
      expect(insertData.status).toBe('active')
      expect(insertData.sort_order).toBe(5)
    })
  })
})

describe('Plan Business Logic', () => {
  it('should identify free plans', () => {
    const freePlan = createMockPlan({ price_cents: 0, code: 'free' })
    expect(freePlan.price_cents).toBe(0)
    expect(freePlan.code).toBe('free')
  })

  it('should identify limited vs unlimited features', () => {
    const limitedPlan = createMockPlan({
      features: {
        ...DEFAULT_PLAN_FEATURES,
        max_appointments_per_month: 50,
        max_products: 20,
      },
    })

    const unlimitedPlan = createMockPlan({
      features: {
        ...DEFAULT_PLAN_FEATURES,
        max_appointments_per_month: null,
        max_products: null,
      },
    })

    expect(limitedPlan.features.max_appointments_per_month).toBe(50)
    expect(unlimitedPlan.features.max_appointments_per_month).toBeNull()
  })

  it('should support business scaling limits', () => {
    const starterPlan = createMockPlan({
      max_businesses: 1,
      max_users_per_business: 3,
      max_specialists_per_business: 2,
    })

    const enterprisePlan = createMockPlan({
      max_businesses: 50,
      max_users_per_business: 100,
      max_specialists_per_business: 100,
    })

    expect(starterPlan.max_businesses).toBe(1)
    expect(enterprisePlan.max_businesses).toBe(50)
    expect(enterprisePlan.max_users_per_business).toBe(100)
  })

  it('should track plan ordering', () => {
    const plans = [
      createMockPlan({ code: 'free', sort_order: 0 }),
      createMockPlan({ code: 'basic', sort_order: 1 }),
      createMockPlan({ code: 'pro', sort_order: 2 }),
      createMockPlan({ code: 'enterprise', sort_order: 3 }),
    ]

    const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order)

    expect(sorted[0].code).toBe('free')
    expect(sorted[3].code).toBe('enterprise')
  })
})

describe('DEFAULT_PLAN_FEATURES', () => {
  it('should have all boolean configuration features set to false', () => {
    expect(DEFAULT_PLAN_FEATURES.has_custom_branding).toBe(false)
    expect(DEFAULT_PLAN_FEATURES.has_priority_support).toBe(false)
    expect(DEFAULT_PLAN_FEATURES.has_api_access).toBe(false)
  })

  it('should have all numeric limits set to null (unlimited)', () => {
    expect(DEFAULT_PLAN_FEATURES.max_appointments_per_month).toBeNull()
    expect(DEFAULT_PLAN_FEATURES.max_products).toBeNull()
    expect(DEFAULT_PLAN_FEATURES.max_services).toBeNull()
    expect(DEFAULT_PLAN_FEATURES.max_customers).toBeNull()
    expect(DEFAULT_PLAN_FEATURES.max_storage_mb).toBeNull()
  })
})

describe('Edge Cases', () => {
  it('should handle null description', () => {
    const plan = createMockPlan({ description: null })
    expect(plan.description).toBeNull()
  })

  it('should handle special characters in plan name', () => {
    const plan = createMockPlan({
      name: 'Plan "Premium" - Especial & Único',
      description: "Descripción con 'comillas' y símbolos: <, >, &",
    })

    expect(plan.name).toContain('"Premium"')
    expect(plan.description).toContain("'comillas'")
  })

  it('should handle very long plan descriptions', () => {
    const longDescription = 'Lorem ipsum '.repeat(500)
    const plan = createMockPlan({ description: longDescription })

    expect(plan.description?.length).toBeGreaterThan(5000)
  })

  it('should handle zero limits gracefully', () => {
    const plan = createMockPlan({
      max_businesses: 0,
      max_users_per_business: 0,
      max_specialists_per_business: 0,
    })

    expect(plan.max_businesses).toBe(0)
    expect(plan.max_users_per_business).toBe(0)
  })

  it('should handle plan code with underscores and numbers', () => {
    const plan = createMockPlan({ code: 'pro_v2_2024' })
    expect(plan.code).toBe('pro_v2_2024')
  })
})

describe('Plan Feature Combinations', () => {
  it('should support minimal free plan configuration', () => {
    const freePlan = createMockPlan({
      code: 'free',
      price_cents: 0,
      status: 'active',
      max_businesses: 1,
      max_users_per_business: 2,
      max_specialists_per_business: 1,
      features: {
        ...DEFAULT_PLAN_FEATURES,
        max_appointments_per_month: 50,
        max_products: 10,
        max_services: 5,
      },
    })

    expect(freePlan.price_cents).toBe(0)
    expect(freePlan.features.has_custom_branding).toBe(false)
    expect(freePlan.features.max_appointments_per_month).toBe(50)
  })

  it('should support full enterprise plan configuration', () => {
    const enterprisePlan = createMockPlan({
      code: 'enterprise',
      price_cents: 19900000,
      status: 'active',
      max_businesses: 100,
      max_users_per_business: 500,
      max_specialists_per_business: 200,
      features: {
        // Sin límites para enterprise
        max_appointments_per_month: null,
        max_products: null,
        max_services: null,
        max_customers: null,
        max_storage_mb: null,
        // Todas las configuraciones adicionales habilitadas
        has_custom_branding: true,
        has_priority_support: true,
        has_api_access: true,
      },
    })

    expect(enterprisePlan.features.has_custom_branding).toBe(true)
    expect(enterprisePlan.features.has_api_access).toBe(true)
    expect(enterprisePlan.features.max_appointments_per_month).toBeNull()
  })
})
