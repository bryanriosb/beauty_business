import {
  Building2,
  Calendar,
  LayoutDashboard,
  Settings,
  Users,
  Scissors,
  UserCircle,
  BarChart3,
  FileStack,
  Package,
  Warehouse,
  Percent,
  ClipboardList,
  CreditCard,
} from 'lucide-react'
import { USER_ROLES, type UserRole } from './roles'

export type ModuleCode =
  | 'dashboard'
  | 'appointments'
  | 'services'
  | 'products'
  | 'inventory'
  | 'specialists'
  | 'customers'
  | 'medical_records'
  | 'commissions'
  | 'reports'
  | 'invoices'
  | 'ai_assistant'
  | 'whatsapp'
  | 'settings'

export interface MenuSubItem {
  title: string
  url: string
  allowedRoles?: UserRole[]
  moduleCode?: ModuleCode
  targetTutorialStep?: string
}

export interface MenuItem {
  title: string
  url: string
  icon: any
  allowedRoles: UserRole[]
  items?: MenuSubItem[]
  moduleCode?: ModuleCode // Código del módulo para verificar acceso del plan
  skipPlanCheck?: boolean // Para menús del sistema que no requieren verificación de plan
  targetTutorialStep?: string // Paso del tutorial asociado al ítem del menú
}

export const SIDE_APP_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Tablero',
    url: '/admin',
    icon: LayoutDashboard,
    moduleCode: 'dashboard',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Citas',
    url: '/admin/appointments',
    icon: Calendar,
    moduleCode: 'appointments',
    targetTutorialStep: 'appointments-menu',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Servicios',
    url: '/admin/services',
    icon: Scissors,
    moduleCode: 'services',
    targetTutorialStep: 'services-menu',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Productos',
    url: '/admin/products',
    icon: Package,
    moduleCode: 'products',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Inventario',
    url: '/admin/inventory',
    icon: Warehouse,
    moduleCode: 'inventory',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Especialistas',
    url: '/admin/specialists/goals',
    icon: UserCircle,
    moduleCode: 'specialists',
    targetTutorialStep: 'specialists-menu',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
    items: [
      {
        title: 'Equipo',
        url: '/admin/specialists/team',
        targetTutorialStep: 'specialists-menu',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
      },
      {
        title: 'Metas',
        url: '/admin/specialists/goals',
        allowedRoles: [
          USER_ROLES.COMPANY_ADMIN,
          USER_ROLES.BUSINESS_ADMIN,
          USER_ROLES.PROFESSIONAL,
        ],
      },
    ],
  },
  {
    title: 'Clientes',
    url: '/admin/customers',
    icon: Users,
    moduleCode: 'customers',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Historias Clínicas',
    url: '/admin/medical-records',
    icon: ClipboardList,
    moduleCode: 'medical_records',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Comisiones',
    url: '/admin/commissions',
    icon: Percent,
    moduleCode: 'commissions',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
  {
    title: 'Reportes',
    url: '/admin/reports',
    icon: BarChart3,
    moduleCode: 'reports',
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Facturas',
    url: '/admin/invoices',
    icon: FileStack,
    moduleCode: 'invoices',
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
]

export const SIDE_SYSTEM_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Suscripción',
    icon: CreditCard,
    url: '/admin/suscription',
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Planes',
    url: '/admin/plans',
    icon: CreditCard,
    skipPlanCheck: true, // Menú del sistema, no requiere verificación de plan
    allowedRoles: [USER_ROLES.COMPANY_ADMIN],
    items: [
      {
        title: 'Gestión de Planes',
        url: '/admin/plans',
      },
      {
        title: 'Asignación a Cuentas',
        url: '/admin/plans/assignments',
      },
    ],
  },
  {
    title: 'Cuentas',
    url: '/admin/businesses',
    icon: Building2,
    skipPlanCheck: true, // Menú del sistema
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
    items: [
      {
        title: 'Gestión de Cuentas',
        url: '/admin/business-accounts',
      },
      {
        title: 'Sucursales',
        url: '/admin/businesses',
      },
    ],
  },
  {
    title: 'Configuración',
    url: '/admin/settings',
    icon: Settings,
    skipPlanCheck: true, // Siempre visible para acceso a suscripción y pagos
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
    items: [
      {
        title: 'Horarios',
        url: '/admin/settings/scheduler',
      },
      {
        title: 'Facturación',
        url: '/admin/settings/invoicing',
      },
      {
        title: 'Comisiones',
        url: '/admin/settings/commissions',
        moduleCode: 'commissions',
      },
      {
        title: 'Período de Prueba',
        url: '/admin/settings/trial',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN],
      },
      {
        title: 'Asistente IA',
        url: '/admin/settings/ai-agent',
        moduleCode: 'ai_assistant',
      },
      {
        title: 'WhatsApp',
        url: '/admin/settings/whatsapp',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN],
        moduleCode: 'whatsapp',
      },
    ],
  },
]
