'use client'

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

export function AppSidebar() {
  const { role } = useCurrentUser()

  const filteredAppItems = SIDE_APP_MENU_ITEMS.filter((item) =>
    role ? item.allowedRoles.includes(role) : false
  )

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
