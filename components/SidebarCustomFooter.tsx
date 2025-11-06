'use client'

import { signOut } from 'next-auth/react'
import { Button } from './ui/button'
import { LogOut } from 'lucide-react'
import { useSidebar } from './ui/sidebar'

export default function SidebarFooter() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const handleLogout = (event: React.MouseEvent) => {
    event.preventDefault()
    signOut()
  }

  if (isCollapsed) {
    return (
      <footer className="flex items-center justify-center p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Cerrar Sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </footer>
    )
  }

  return (
    <footer className="flex items-center justify-between p-2 border-t">
      <div className="flex gap-2 items-center min-w-0">
        <div className="h-8 w-8 rounded-full bg-primary flex-shrink-0"></div>
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span className="font-bold text-sm truncate">Bryan Rios</span>
          <span className="text-xs text-muted-foreground truncate">
            bryan@example.com
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Cerrar Sesión"
        className="flex-shrink-0"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </footer>
  )
}
