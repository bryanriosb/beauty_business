import { BrainCircuit, FileText, LayoutDashboard, Settings } from 'lucide-react'

export const SIDE_APP_MENU_ITEMS = [
  {
    title: 'Tablero',
    url: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Reportes',
    url: '/admin/reports',
    icon: FileText,
  },
]

export const SIDE_SYSTEM_MENU_ITEMS = [
  {
    title: 'Configuración',
    url: '/admin/settings',
    icon: Settings,
  },
]
