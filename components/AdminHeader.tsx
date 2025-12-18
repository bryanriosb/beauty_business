'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { SidebarTrigger } from './ui/sidebar'
import { MessageCircle, Moon, Sun, LifeBuoy } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import NotificationPanel from './notifications/NotificationPanel'
import ChatSheet from './chat/ChatSheet'
import { useUnreadMessages } from '@/hooks/use-unread-messages'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useIsMobile } from '@/hooks/use-mobile'
import { FeedbackDialog } from './feedback/FeedbackDialog'
import { TutorialDropdown } from './tutorials/TutorialDropdown'

export default function AdminHeader() {
  const [chatOpen, setChatOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const unreadCount = useUnreadMessages()
  const { businessAccountId, user } = useCurrentUser()
  const isMobile = useIsMobile()

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
              <Button
                size="sm"
                onClick={() => setFeedbackOpen(true)}
                className="flex items-center gap-2"
              >
                <LifeBuoy className="!h-4.5 !w-4.5" />
                <span className="hidden sm:inline">Feedback</span>
              </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reportar problemas o enviar sugerencias</p>
          </TooltipContent>
        </Tooltip>

        {!isMobile && <TutorialDropdown />}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                <Sun className="!h-5 !w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute !h-5 !w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambiar tema</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cambiar tema</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <NotificationPanel />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notificaciones</p>
            </TooltipContent>
          </Tooltip>
          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-slot="chat-trigger"
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(true)}
                className="relative"
              >
                <MessageCircle className="!h-5 !w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="default"
                    className="absolute top-0.5 right-1 h-4 w-4 px-1 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Chat {unreadCount > 0 ? `(${unreadCount} sin leer)` : ''}</p>
            </TooltipContent>
          </Tooltip> */}
        </div>
      </header>

      <ChatSheet open={chatOpen} onOpenChange={setChatOpen} />

      {businessAccountId && user && (
        <FeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          businessId={businessAccountId}
          userId={user.id}
        />
      )}

    </>
  )
}
