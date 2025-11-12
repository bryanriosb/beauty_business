'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Message } from '@/lib/models/chat/message'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: Message
  isOwn: boolean
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'HH:mm', { locale: es })
  }

  return (
    <div
      className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-4 py-2',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={cn(
            'text-xs mt-1',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
