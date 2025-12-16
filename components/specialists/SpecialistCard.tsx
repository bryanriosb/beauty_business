'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { Specialist } from '@/lib/models/specialist/specialist'
import { cn, translateCategory, translateSpecialty } from '@/lib/utils'

export interface CurrentAppointment {
  startTime: string
  endTime: string
  services: string[]
}

export interface SpecialistGoalProgress {
  percentage: number
  label?: string
}

interface SpecialistCardProps {
  specialist: Specialist
  isSelected?: boolean
  onClick?: () => void
  onEdit?: (specialist: Specialist) => void
  onDelete?: (id: string) => void
  currentAppointment?: CurrentAppointment | null
  goalProgress?: SpecialistGoalProgress | null
  isOnline?: boolean
}

export function SpecialistCard({
  specialist,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  currentAppointment,
  goalProgress,
  isOnline = false,
}: SpecialistCardProps) {
  const initials = `${specialist.first_name[0]}${
    specialist.last_name?.[0] || ''
  }`.toUpperCase()
  const fullName = `${specialist.first_name} ${
    specialist.last_name || ''
  }`.trim()
  const username = specialist.username || specialist.first_name.toLowerCase()

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(specialist)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(specialist.id)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-primary'
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative group border',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={specialist.profile_picture_url || undefined}
                alt={fullName}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{fullName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {specialist.specialty ? translateSpecialty(specialist.specialty) : 'Especialista'}
            </p>
            <p className="text-xs text-muted-foreground/70">@{username}</p>
            {specialist.phone && (
              <p className="text-xs text-muted-foreground/70">{specialist.phone}</p>
            )}
          </div>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Divider + Goal Progress */}
        {goalProgress && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {goalProgress.label || 'Meta mensual'}
              </span>
              <span className="text-xs font-medium">
                {goalProgress.percentage}%
              </span>
            </div>
            <Progress
              value={goalProgress.percentage}
              className="h-1.5"
              indicatorClassName={getProgressColor(goalProgress.percentage)}
            />
          </div>
        )}

        {/* Current Status */}
        {currentAppointment && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Estado actual</p>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {currentAppointment.startTime} - {currentAppointment.endTime}
              </span>
            </div>
            {currentAppointment.services.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {currentAppointment.services.map((service, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs px-2 py-0"
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No appointment - show specialty tags */}
        {!currentAppointment && !goalProgress && specialist.specialty && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-1">
              {specialist.specialty
                .split(',')
                .slice(0, 3)
                .map((tag, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-xs px-2 py-0"
                  >
                    {translateCategory(tag.trim())}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
