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

export function AppSidebar() {
  const { role } = useCurrentUser()

  const filteredAppItems = useMemo(() => {
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

  const filteredSystemItems = SIDE_SYSTEM_MENU_ITEMS.filter((item) =>
    role ? item.allowedRoles.includes(role) : false
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo />
        <BusinessSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {filteredAppItems.length > 0 && (
          <NavMain items={filteredAppItems} label="Aplicación" />
        )}
        {filteredSystemItems.length > 0 && (
          <NavMain items={filteredSystemItems} label="Sistema" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarCustomFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
