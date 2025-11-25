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
import { MoreVertical, Pencil, Trash2, Target } from 'lucide-react'
import type { Specialist } from '@/lib/models/specialist/specialist'
import type { SpecialistGoal } from '@/lib/models/specialist/specialist-goal'
import { GOAL_TYPE_LABELS, GOAL_PERIOD_LABELS, calculateGoalProgress } from '@/lib/models/specialist/specialist-goal'

interface GoalCardProps {
  specialist: Specialist
  goal?: SpecialistGoal | null
  onCreateGoal: (specialist: Specialist) => void
  onEditGoal: (goal: SpecialistGoal, specialist: Specialist) => void
  onDeleteGoal: (goalId: string) => void
}

export function GoalCard({
  specialist,
  goal,
  onCreateGoal,
  onEditGoal,
  onDeleteGoal,
}: GoalCardProps) {
  const initials = `${specialist.first_name[0]}${specialist.last_name?.[0] || ''}`.toUpperCase()
  const fullName = `${specialist.first_name} ${specialist.last_name || ''}`.trim()
  const username = specialist.username || specialist.first_name.toLowerCase()

  const progress = goal ? calculateGoalProgress(goal) : 0

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-primary'
  }

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={specialist.profile_picture_url || undefined} alt={fullName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{fullName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {specialist.specialty || 'Especialista'}
            </p>
            <p className="text-xs text-muted-foreground/70">@{username}</p>
          </div>

          {goal && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditGoal(goal, specialist)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteGoal(goal.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-4 pt-3 border-t">
          {goal ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {GOAL_TYPE_LABELS[goal.goal_type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {GOAL_PERIOD_LABELS[goal.period_type]}
                  </span>
                </div>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress
                value={progress}
                className="h-2"
                indicatorClassName={getProgressColor(progress)}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {goal.current_value} / {goal.target_value}
                </span>
                <span>
                  {goal.goal_type === 'revenue' ? '$' : ''}
                  {goal.target_value - goal.current_value} restante
                </span>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onCreateGoal(specialist)}
            >
              <Target className="h-4 w-4 mr-2" />
              Definir meta
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
