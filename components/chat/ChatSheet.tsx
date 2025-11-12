'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, MessageSquare, ArrowLeft } from 'lucide-react'
import ConversationService from '@/lib/services/chat/conversation-service'
import type { ConversationWithDetails } from '@/lib/models/chat/conversation'
import { useCurrentUser } from '@/hooks/use-current-user'
import ChatConversation from './ChatConversation'
import Loading from '@/components/ui/loading'

interface ChatSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ChatSheet({ open, onOpenChange }: ChatSheetProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithDetails | null>(null)
  const { user, role, businesses, userProfileId } = useCurrentUser()
  const firstBusinessId = businesses?.[0]?.id
  const userId = user?.id

  useEffect(() => {
    if (!open || !userId) return

    const conversationService = new ConversationService()

    const fetchConversations = async () => {
      try {
        setIsLoading(true)
        const params: any = {
          page: 1,
          page_size: 50,
        }

        if (role === 'business_admin' && firstBusinessId) {
          params.business_id = firstBusinessId
        } else if (role === 'customer' && userProfileId) {
          params.users_profile_id = userProfileId
        }

        const response = await conversationService.fetchItems(params)
        setConversations(response.data)
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [open, userId, role, firstBusinessId, userProfileId])

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true

    const businessName = conversation.business?.name?.toLowerCase() || ''
    const userId = conversation.user_profile?.user_id?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()

    return businessName.includes(query) || userId.includes(query)
  })

  const handleConversationClick = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
  }

  const formatLastMessageTime = (dateString: string | null) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (days === 1) {
      return 'Ayer'
    } else if (days < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] p-0 flex flex-col"
      >
        {selectedConversation ? (
          <>
            <SheetHeader className="p-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3 flex-1">
                  {role === 'business_admin' ? (
                    <>
                      {selectedConversation.user_profile
                        ?.profile_picture_url ? (
                        <img
                          src={
                            selectedConversation.user_profile
                              .profile_picture_url
                          }
                          alt="Usuario"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          U
                        </div>
                      )}
                      <div>
                        <SheetTitle className="text-base">
                          {selectedConversation.user_profile?.name || 'Usuario'}
                        </SheetTitle>
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.user_profile?.email ||
                            `ID: ${selectedConversation.user_profile?.user_id?.slice(
                              0,
                              8
                            )}...`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedConversation.business?.logo_url ? (
                        <img
                          src={selectedConversation.business.logo_url}
                          alt="Negocio"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {selectedConversation.business?.name?.[0] || 'N'}
                        </div>
                      )}
                      <div>
                        <SheetTitle className="text-base">
                          {selectedConversation.business?.name || 'Negocio'}
                        </SheetTitle>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </SheetHeader>
            <ChatConversation
              conversation={selectedConversation}
              currentUserRole={
                role === 'business_admin' ? 'business_admin' : 'user'
              }
            />
          </>
        ) : (
          <>
            <SheetHeader className="p-4 border-b flex-shrink-0">
              <SheetTitle>Mensajes</SheetTitle>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar conversaciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </SheetHeader>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loading className="w-8 h-8" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'No se encontraron conversaciones'
                    : 'No tienes conversaciones aún'}
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {filteredConversations.map((conversation) => {
                    const isCustomer = role === 'customer'
                    const displayName = isCustomer
                      ? conversation.business?.name || 'Negocio'
                      : conversation.user_profile?.name || 'Usuario'
                    const displayImage = isCustomer
                      ? conversation.business?.logo_url
                      : conversation.user_profile?.profile_picture_url
                    const displayInitial = displayName[0] || '?'

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleConversationClick(conversation)}
                        className="w-full p-4 hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={displayName || ''}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                              {displayInitial}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate">
                                {displayName || 'Sin nombre'}
                              </h3>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatLastMessageTime(
                                  conversation.last_message_at
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.last_message?.content ||
                                  'Sin mensajes'}
                              </p>
                              {conversation.unread_count &&
                                conversation.unread_count > 0 && (
                                  <Badge
                                    variant="default"
                                    className="h-5 min-w-[20px] px-1.5 text-xs flex-shrink-0"
                                  >
                                    {conversation.unread_count}
                                  </Badge>
                                )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
