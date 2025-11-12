'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import MessageService from '@/lib/services/chat/message-service'
import ConversationService from '@/lib/services/chat/conversation-service'
import type { ConversationWithDetails } from '@/lib/models/chat/conversation'
import type { Message, MessageInsert } from '@/lib/models/chat/message'
import ChatMessage from './ChatMessage'
import Loading from '@/components/ui/loading'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createBrowserClient } from '@supabase/ssr'

interface ChatConversationProps {
  conversation: ConversationWithDetails
  currentUserRole: 'user' | 'business_admin'
}

export default function ChatConversation({
  conversation,
  currentUserRole,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { user, businesses, businessId } = useCurrentUser()

  const messageServiceRef = useRef(new MessageService())
  const conversationServiceRef = useRef(new ConversationService())

  const senderId = useMemo(
    () =>
      currentUserRole === 'business_admin'
        ? businessId || businesses?.[0]?.id || ''
        : conversation.users_profile_id,
    [currentUserRole, businessId, businesses, conversation.users_profile_id]
  )

  useEffect(() => {
    if (!conversation.id) return

    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const response = await messageServiceRef.current.fetchItems({
          conversation_id: conversation.id,
          page_size: 100,
        })
        setMessages(response.data.reverse())
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()

    const markAsRead = async () => {
      await conversationServiceRef.current.markAsRead(
        conversation.id,
        currentUserRole === 'business_admin' ? 'BUSINESS' : 'USER'
      )
    }

    markAsRead()
  }, [conversation.id, currentUserRole])

  useEffect(() => {
    if (!conversation.id) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const subscription = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])

          conversationServiceRef.current.markAsRead(
            conversation.id,
            currentUserRole === 'business_admin' ? 'BUSINESS' : 'USER'
          )
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversation.id, currentUserRole])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || isSending || !senderId) return

    try {
      setIsSending(true)

      const messageData: MessageInsert = {
        conversation_id: conversation.id,
        content: newMessage.trim(),
        sender_type: currentUserRole === 'business_admin' ? 'BUSINESS' : 'USER',
        sender_id: senderId,
      }

      const result = await messageServiceRef.current.createItem(messageData)

      if (result.success) {
        setNewMessage('')
      } else {
        console.error('Error sending message:', result.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loading className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No hay mensajes aún</p>
              <p className="text-sm mt-1">Envía un mensaje para iniciar la conversación</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={
                  currentUserRole === 'business_admin'
                    ? message.sender_type === 'BUSINESS'
                    : message.sender_type === 'USER'
                }
              />
            ))
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t flex items-center gap-2 flex-shrink-0"
      >
        <Input
          type="text"
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <Loading className="w-4 h-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
