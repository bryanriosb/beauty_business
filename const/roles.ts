export const USER_ROLES = {
  COMPANY_ADMIN: 'company_admin', // Admin de la empresa (crea negocios/salones)
  BUSINESS_ADMIN: 'business_admin', // Admin de un negocio/salón específico
  EMPLOYEE: 'business_monitor', // Empleado/Especialista
  CUSTOMER: 'customer', // Cliente
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// Permisos por rol
export const ROLE_PERMISSIONS = {
  [USER_ROLES.COMPANY_ADMIN]: {
    canManageBusinesses: true,
    canManageUsers: true,
    canViewAllBusinesses: true,
    canManageSettings: true,
    canManageBusinessAccounts: true,
    canCreateBusinessAccounts: true,
    canCreateBusinessAccount: true,
    canEditBusinessAccount: true,
    canEditAccountContactInfo: true,
    canDeleteBusinessAccount: true,
    canAddAccountMembers: true,
  },
  [USER_ROLES.BUSINESS_ADMIN]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: true,
    canManageEmployees: true,
    canManageServices: true,
    canManageAppointments: true,
    canViewOwnBusinessAccount: true,
    canManageBusinessesInAccount: true,
    canCreateBusinessAccount: false,
    canEditBusinessAccount: false, // No puede editar cuenta completa
    canEditAccountContactInfo: true, // Pero sí puede editar datos de contacto
    canDeleteBusinessAccount: false,
    canAddAccountMembers: true,
  },
  [USER_ROLES.EMPLOYEE]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canManageServices: false,
    canManageAppointments: false,
    canViewOwnAppointments: true, // Ver sus propias citas
    canManageOwnProfile: true, // Gestionar su perfil
  },
  [USER_ROLES.CUSTOMER]: {
    canManageBusinesses: false,
    canManageUsers: false,
    canViewAllBusinesses: false,
    canManageSettings: false,
    canManageOwnBusiness: false,
    canManageEmployees: false,
    canManageServices: false,
    canManageAppointments: false,
    canViewOwnAppointments: false,
    canManageOwnProfile: false,
    canBookAppointments: true, // Reservar citas
    canViewOwnBookings: true, // Ver sus propias reservas
  },
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] as Record<string, boolean>
  return permissions[permission] ?? false
}

// Enlaces del sidebar por rol
export const SIDEBAR_ACCESS = {
  dashboard: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  appointments: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  businesses: [USER_ROLES.COMPANY_ADMIN], // Solo company admin
  services: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  specialists: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  customers: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  reports: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  settings: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
} as const

export function canAccessRoute(
  role: UserRole,
  route: keyof typeof SIDEBAR_ACCESS
): boolean {
  const allowedRoles = SIDEBAR_ACCESS[route]
  return allowedRoles
    ? (allowedRoles as readonly UserRole[]).includes(role)
    : false
}
