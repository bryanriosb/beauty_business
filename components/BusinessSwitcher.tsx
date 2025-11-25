'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronsUpDown, Store, Check, RefreshCw, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  useActiveBusinessStore,
  Business,
} from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import BusinessService from '@/lib/services/business/business-service'

export function BusinessSwitcher() {
  const { isMobile } = useSidebar()
  const { businessAccountId, role, isLoading: isUserLoading } = useCurrentUser()
  const { activeBusiness, setActiveBusiness, initializeFromSession } =
    useActiveBusinessStore()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadBusinesses = useCallback(async () => {
    if (!businessAccountId) return

    setIsLoading(true)
    try {
      const service = new BusinessService()
      const result = await service.fetchItems({
        business_account_id: businessAccountId,
        page_size: 50,
      })
      const loadedBusinesses = result.data.map((b) => ({
        id: b.id,
        name: b.name,
        business_account_id: b.business_account_id,
      }))
      setBusinesses(loadedBusinesses)
      initializeFromSession(loadedBusinesses)
    } catch (error) {
      console.error('Error loading businesses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [businessAccountId, initializeFromSession])

  useEffect(() => {
    if (role === USER_ROLES.BUSINESS_ADMIN && businessAccountId) {
      loadBusinesses()
    } else {
      setIsLoading(false)
    }
  }, [role, businessAccountId, loadBusinesses])

  if (isUserLoading) {
    return null
  }

  if (role !== USER_ROLES.BUSINESS_ADMIN) {
    return null
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex w-full items-center gap-2 rounded-lg p-2">
            <div className="bg-muted flex aspect-square size-8 items-center justify-center rounded-lg">
              <Loader2 className="size-4 animate-spin" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-muted-foreground">
                Cargando...
              </span>
              <span className="truncate text-xs text-muted-foreground">
                Sucursales
              </span>
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (businesses.length === 0) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="border rounded-lg">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Store className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeBusiness?.name || 'Seleccionar'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Sucursal activa
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg z-50"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Sucursales
            </DropdownMenuLabel>
            {businesses.map((business) => (
              <DropdownMenuItem
                key={business.id}
                onClick={() => setActiveBusiness(business)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Store className="size-3.5 shrink-0" />
                </div>
                <span className="flex-1 truncate">{business.name}</span>
                {activeBusiness?.id === business.id && (
                  <Check className="size-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                loadBusinesses()
              }}
              className="gap-2 p-2"
              disabled={isLoading}
            >
              <RefreshCw
                className={`size-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className="text-muted-foreground">Actualizar lista</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
