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
import Image from 'next/image'

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
        {filteredAppItems.length > 0 && (
          <NavMain items={filteredAppItems} label="Aplicación" userRole={role} />
        )}
        {filteredSystemItems.length > 0 && (
          <NavMain items={filteredSystemItems} label="Sistema" userRole={role} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarCustomFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
