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

export function AppSidebar() {
  const { role } = useCurrentUser()

  // Filtrar items del menú según el rol del usuario
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
