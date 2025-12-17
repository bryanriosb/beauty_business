'use client'

import { useMemo } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import SidebarCustomFooter from './SidebarCustomFooter'
import {
  SIDE_APP_MENU_ITEMS,
  SIDE_SYSTEM_MENU_ITEMS,
} from '@/const/sidebar-menu'
import { useCurrentUser } from '@/hooks/use-current-user'
import { NavMain } from './NavMain'
import { BusinessSwitcher } from './BusinessSwitcher'
import { LowStockAlertBadge } from './inventory/LowStockAlert'
import Image from 'next/image'

interface AppSidebarProps {
  accessibleModules: string[]
}

export function AppSidebar({ accessibleModules }: AppSidebarProps) {
  const { role } = useCurrentUser()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  // Crear set de módulos accesibles para búsqueda rápida
  const accessibleModulesSet = useMemo(() => new Set(accessibleModules), [accessibleModules])

  // Filtrar items del menú por rol y módulos accesibles
  const filteredAppItems = useMemo(() => {
    const items = SIDE_APP_MENU_ITEMS.filter((item) => {
      // Verificar rol
      if (!role || !item.allowedRoles.includes(role)) {
        return false
      }

      // Si skipPlanCheck, siempre mostrar
      if (item.skipPlanCheck) {
        return true
      }

      // Si no tiene moduleCode, mostrar
      if (!item.moduleCode) {
        return true
      }

      // Verificar si el módulo es accesible
      return accessibleModulesSet.has(item.moduleCode)
    })

    // Add badge to Inventory menu item
    return items.map((item) => {
      if (item.url === '/admin/inventory') {
        return {
          ...item,
          badge: <LowStockAlertBadge className="ml-auto" />,
        }
      }
      return item
    })
  }, [role, accessibleModulesSet])

  const filteredSystemItems = useMemo(() => {
    return SIDE_SYSTEM_MENU_ITEMS.filter((item) => {
      // Verificar rol
      if (!role || !item.allowedRoles.includes(role)) {
        return false
      }

      // Si skipPlanCheck, siempre mostrar
      if (item.skipPlanCheck) {
        return true
      }

      // Si no tiene moduleCode, mostrar
      if (!item.moduleCode) {
        return true
      }

      // Verificar si el módulo es accesible
      return accessibleModulesSet.has(item.moduleCode)
    })
  }, [role, accessibleModulesSet])

  // Filtrar sub-items también
  const finalAppItems = useMemo(() => {
    return filteredAppItems.map((item) => {
      if (!item.items) return item

      const filteredSubItems = item.items.filter((subItem) => {
        // Verificar rol en sub-item
        if (subItem.allowedRoles && (!role || !subItem.allowedRoles.includes(role))) {
          return false
        }

        // Verificar módulo en sub-item
        if (subItem.moduleCode) {
          return accessibleModulesSet.has(subItem.moduleCode)
        }

        return true
      })

      return { ...item, items: filteredSubItems }
    })
  }, [filteredAppItems, role, accessibleModulesSet])

  const finalSystemItems = useMemo(() => {
    return filteredSystemItems.map((item) => {
      if (!item.items) return item

      const filteredSubItems = item.items.filter((subItem) => {
        // Verificar rol en sub-item
        if (subItem.allowedRoles && (!role || !subItem.allowedRoles.includes(role))) {
          return false
        }

        // Verificar módulo en sub-item
        if (subItem.moduleCode) {
          return accessibleModulesSet.has(subItem.moduleCode)
        }

        return true
      })

      return { ...item, items: filteredSubItems }
    })
  }, [filteredSystemItems, role, accessibleModulesSet])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="border-b w-full mb-2 overflow-hidden">
          <div className="relative mx-auto mb-4 flex items-center justify-center transition-all duration-300 ease-in-out">
            <Image
              className={`transition-all duration-300 ease-in-out dark:brightness-0 dark:invert ${
                isCollapsed 
                  ? 'scale-100 opacity-100 absolute' 
                  : 'scale-100 opacity-100'
              }`}
              alt="logo"
              src="/beluvio-small.svg"
              width={32}
              height={32}
              style={{
                position: isCollapsed ? 'relative' : 'absolute',
                transform: isCollapsed ? 'scale(1)' : 'scale(0)',
                opacity: isCollapsed ? 1 : 0,
              }}
            />
            <Image
              className={`transition-all duration-300 ease-in-out dark:brightness-0 dark:invert ${
                isCollapsed 
                  ? 'absolute' 
                  : 'relative'
              }`}
              alt="logo"
              src="/beluvio.svg"
              width={150}
              height={40}
              style={{
                position: isCollapsed ? 'absolute' : 'relative',
                transform: isCollapsed ? 'scale(0)' : 'scale(1)',
                opacity: isCollapsed ? 0 : 1,
              }}
            />
          </div>
        </div>

        <BusinessSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {finalAppItems.length > 0 && (
          <NavMain items={finalAppItems} label="Aplicación" userRole={role} />
        )}
        {finalSystemItems.length > 0 && (
          <NavMain items={finalSystemItems} label="Sistema" userRole={role} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarCustomFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
