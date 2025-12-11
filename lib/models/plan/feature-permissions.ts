export type AppointmentsFeaturePermission =
  | 'whatsapp_notifications'
  | 'specialist_assignment'
  | 'price_editing'
  | 'credit'

export type ServicesFeaturePermission =
  | 'supply_management'
  | 'price_editing_in_appointment'

export type SpecialistsFeaturePermission = 'goals_management'

export type ReportsFeaturePermission =
  | 'view_charts'
  | 'view_revenue'
  | 'view_appointments'
  | 'view_services'
  | 'view_specialists'
  | 'view_customers'
  | 'view_supplies'
  | 'view_portfolio'
  | 'export_data'

export type FeaturePermission =
  | AppointmentsFeaturePermission
  | ServicesFeaturePermission
  | SpecialistsFeaturePermission
  | ReportsFeaturePermission

export interface ModuleFeaturePermissions {
  appointments?: {
    whatsapp_notifications?: boolean
    specialist_assignment?: boolean
    price_editing?: boolean
  }
  services?: {
    supply_management?: boolean
    price_editing_in_appointment?: boolean
  }
  specialists?: {
    goals_management?: boolean
  }
  reports?: {
    view_charts?: boolean
    view_revenue?: boolean
    view_appointments?: boolean
    view_services?: boolean
    view_specialists?: boolean
    view_customers?: boolean
    view_supplies?: boolean
    view_portfolio?: boolean
    export_data?: boolean
  }
  [key: string]: Record<string, boolean> | undefined
}

export const FEATURE_PERMISSIONS_METADATA = {
  appointments: {
    whatsapp_notifications: {
      name: 'Notificaciones de WhatsApp',
      description: 'Enviar recordatorios y notificaciones por WhatsApp',
      requiredPlan: ['pro', 'enterprise'],
    },
    specialist_assignment: {
      name: 'Asignación por servicio',
      description: 'Asignar especialistas específicos a cada servicio',
      requiredPlan: ['pro', 'enterprise'],
    },
    price_editing: {
      name: 'Edición de precios',
      description:
        'Modificar precios de servicios durante la creación de citas',
      requiredPlan: ['pro', 'enterprise'],
    },
  },
  services: {
    supply_management: {
      name: 'Manejo de insumos',
      description: 'Gestionar insumos asociados a servicios',
      requiredPlan: ['pro', 'enterprise'],
    },
    price_editing_in_appointment: {
      name: 'Edición de precios en citas',
      description: 'Editar precios de servicios al crear citas',
      requiredPlan: ['pro', 'enterprise'],
    },
  },
  specialists: {
    goals_management: {
      name: 'Gestión de metas',
      description: 'Definir y hacer seguimiento a metas de especialistas',
      requiredPlan: ['pro', 'enterprise'],
    },
  },
  reports: {
    view_charts: {
      name: 'Visualización de gráficos',
      description: 'Ver reportes en formato de gráficos',
      requiredPlan: ['pro', 'enterprise'],
    },
    view_revenue: {
      name: 'Ver ingresos',
      description: 'Acceso a datos de ingresos',
      requiredPlan: ['free', 'basic', 'pro', 'enterprise'],
    },
    view_appointments: {
      name: 'Ver citas',
      description: 'Acceso a estadísticas de citas',
      requiredPlan: ['free', 'basic', 'pro', 'enterprise'],
    },
    view_services: {
      name: 'Ver servicios',
      description: 'Acceso a estadísticas de servicios',
      requiredPlan: ['free', 'basic', 'pro', 'enterprise'],
    },
    view_specialists: {
      name: 'Ver especialistas',
      description: 'Acceso a estadísticas de especialistas',
      requiredPlan: ['free', 'basic', 'pro', 'enterprise'],
    },
    view_customers: {
      name: 'Ver clientes',
      description: 'Acceso a estadísticas de clientes',
      requiredPlan: ['pro', 'enterprise'],
    },
    view_supplies: {
      name: 'Ver insumos',
      description: 'Acceso a estadísticas de insumos',
      requiredPlan: ['pro', 'enterprise'],
    },
    view_portfolio: {
      name: 'Ver cartera',
      description: 'Acceso a datos de cartera',
      requiredPlan: ['enterprise'],
    },
    export_data: {
      name: 'Exportar datos',
      description: 'Exportar reportes a archivos',
      requiredPlan: ['pro', 'enterprise'],
    },
  },
} as const

export type ModuleCode = 'appointments' | 'services' | 'specialists' | 'reports'

export function getFeatureMetadata(
  module: ModuleCode,
  feature: string
): {
  name: string
  description: string
  requiredPlan: string[]
} | null {
  const moduleMetadata = FEATURE_PERMISSIONS_METADATA[module]
  if (!moduleMetadata) return null

  const featureMetadata = moduleMetadata[feature as keyof typeof moduleMetadata]
  if (!featureMetadata) return null

  return featureMetadata as {
    name: string
    description: string
    requiredPlan: string[]
  }
}

export function parseFeaturePermission(featureKey: string): {
  module: ModuleCode
  feature: FeaturePermission
} | null {
  const validModules: ModuleCode[] = [
    'appointments',
    'services',
    'specialists',
    'reports',
  ]

  for (const module of validModules) {
    const metadata = FEATURE_PERMISSIONS_METADATA[module]
    if (featureKey in metadata) {
      return {
        module,
        feature: featureKey as FeaturePermission,
      }
    }
  }

  return null
}
