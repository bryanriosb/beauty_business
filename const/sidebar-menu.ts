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

export interface MenuSubItem {
  title: string
  url: string
  allowedRoles?: UserRole[]
}

export interface MenuItem {
  title: string
  url: string
  icon: any
  allowedRoles: UserRole[]
  items?: MenuSubItem[]
}

export const SIDE_APP_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Tablero',
    url: '/admin',
    icon: LayoutDashboard,
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
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
    items: [
      {
        title: 'Equipo',
        url: '/admin/specialists/team',
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
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Facturas',
    url: '/admin/invoices',
    icon: FileStack,
    allowedRoles: [
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN,
      USER_ROLES.PROFESSIONAL,
    ],
  },
]

export const SIDE_SYSTEM_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Planes',
    url: '/admin/plans',
    icon: CreditCard,
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
      },
      {
        title: 'Período de Prueba',
        url: '/admin/settings/trial',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN],
      },
      {
        title: 'Asistente IA',
        url: '/admin/settings/ai-agent',
      },
      {
        title: 'WhatsApp',
        url: '/admin/settings/whatsapp',
        allowedRoles: [USER_ROLES.COMPANY_ADMIN],
      },
    ],
  },
]
