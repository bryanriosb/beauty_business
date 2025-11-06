import { signOut } from 'next-auth/react'
import { Button } from './ui/button'
import { LogOut } from 'lucide-react'

export default function SidebarFooter() {
  const handleLogout = (event: React.MouseEvent) => {
    event.preventDefault()
    signOut()
  }
  return (
    <footer className="flex items-center justify-between">
      <div className="flex gap-2 items-center">
        <div className="h-8 w-8 rounded-full bg-orange-300"></div>
        <div className="flex flex-col">
          <span className="font-bold">Bryan Rios</span>
          <span className="text-xs">bryan@example.com</span>
        </div>
      </div>
      <Button
        className="flex gap-2"
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Cerrar Sesión"
      >
        <LogOut />
      </Button>
    </footer>
  )
}
