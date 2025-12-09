'use client'

import { useMemo } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import SidebarCustomFooter from './SidebarCustomFooter'
import {
  SIDE_APP_MENU_ITEMS,
  SIDE_SYSTEM_MENU_ITEMS,
} from '@/const/sidebar-menu'
import Logo from './Logo'
import { useCurrentUser } from '@/hooks/use-current-user'
import { NavMain } from './NavMain'
import { BusinessSwitcher } from './BusinessSwitcher'
import { LowStockAlertBadge } from './inventory/LowStockAlert'
import { useSidebarAccess } from '@/hooks/use-sidebar-access'
import Image from 'next/image'

export function AppSidebar() {
  const { role } = useCurrentUser()

  // Filtrar por rol primero
  const roleFilteredAppItems = useMemo(() => {
    const items = SIDE_APP_MENU_ITEMS.filter((item) =>
      role ? item.allowedRoles.includes(role) : false
    )

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
  }, [role])

  const roleFilteredSystemItems = useMemo(() => {
    return SIDE_SYSTEM_MENU_ITEMS.filter((item) =>
      role ? item.allowedRoles.includes(role) : false
    )
  }, [role])

  // Luego filtrar por acceso del plan
  const { filteredItems: planFilteredAppItems } = useSidebarAccess(roleFilteredAppItems)
  const { filteredItems: planFilteredSystemItems } = useSidebarAccess(roleFilteredSystemItems)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="border-b w-full mb-2">
          <Image
            className="relative mx-auto mb-4 dark:brightness-0 dark:invert"
            alt="logo"
            src="/logo.png"
            width={150}
            height={40}
          />
        </div>

        <BusinessSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {planFilteredAppItems.length > 0 && (
          <NavMain items={planFilteredAppItems} label="Aplicación" userRole={role} />
        )}
        {planFilteredSystemItems.length > 0 && (
          <NavMain items={planFilteredSystemItems} label="Sistema" userRole={role} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarCustomFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
