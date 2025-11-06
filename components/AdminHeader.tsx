'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { SidebarTrigger } from './ui/sidebar'
import { Bell, BrainCircuit, MessageCircle, Moon, Sun, X } from 'lucide-react'
import { Button } from './ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { AIAssistantWithHistory } from './AIAssistantWithHistory'
import { environment } from '@/environment/dev'

export default function AdminHeader() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <SidebarTrigger />
        </div>
        <div className="flex gap-2 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambiar tema</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cambiar tema</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-slot="notifications-trigger"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
              >
                <Bell />
                <span className="sr-only">Notificaciones</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notificaciones</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-slot="chat-trigger"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
              >
                <MessageCircle />
                <span className="sr-only">Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Chat</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        direction="right"
        dismissible={false}
      >
        <DrawerContent className="fixed inset-y-0 right-0 left-auto mt-0 w-full sm:w-[1024px] rounded-none border-l select-text focus:outline-none focus-visible:outline-none">
          <DrawerHeader className="flex items-center justify-between border-b">
            <DrawerTitle className="flex items-center gap-2">
              <BrainCircuit className="size-5" />
              Asistente
            </DrawerTitle>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto select-text">
            <AIAssistantWithHistory
              userId="7"
              showHistory
              url={environment.LLM_WT_URL}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
