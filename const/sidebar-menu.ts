import {
  Building2,
  Calendar,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  Scissors,
  UserCircle,
  BarChart3,
  Briefcase,
  FileStack,
} from 'lucide-react'
import { USER_ROLES, type UserRole } from './roles'

export interface MenuSubItem {
  title: string
  url: string
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
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: LayoutDashboard,
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Citas',
    url: '/admin',
    icon: Calendar,
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Servicios',
    url: '/admin/services',
    icon: Scissors,
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Especialistas',
    url: '/admin/specialists',
    icon: UserCircle,
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
  {
    title: 'Clientes',
    url: '/admin/customers',
    icon: Users,
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
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
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
  },
]

export const SIDE_SYSTEM_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Sucursales',
    url: '/admin/businesses',
    icon: Building2,
    allowedRoles: [USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN],
    items: [
      {
        title: 'Cuentas',
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
  },
]
