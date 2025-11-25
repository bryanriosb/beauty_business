'use client'

import { GoalCard } from './GoalCard'
import type { Specialist } from '@/lib/models/specialist/specialist'
import type { SpecialistGoal } from '@/lib/models/specialist/specialist-goal'

interface GoalGridProps {
  specialists: Specialist[]
  goals: Map<string, SpecialistGoal>
  onCreateGoal: (specialist: Specialist) => void
  onEditGoal: (goal: SpecialistGoal, specialist: Specialist) => void
  onDeleteGoal: (goalId: string) => void
  isLoading?: boolean
}

export function GoalGrid({
  specialists,
  goals,
  onCreateGoal,
  onEditGoal,
  onDeleteGoal,
  isLoading,
}: GoalGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[180px] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (specialists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No se encontraron especialistas</p>
        <p className="text-sm text-muted-foreground mt-1">
          Primero agrega especialistas a tu equipo
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {specialists.map((specialist) => (
        <GoalCard
          key={specialist.id}
          specialist={specialist}
          goal={goals.get(specialist.id)}
          onCreateGoal={onCreateGoal}
          onEditGoal={onEditGoal}
          onDeleteGoal={onDeleteGoal}
        />
      ))}
    </div>
  )
}
