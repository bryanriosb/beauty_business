'use client'

import { SpecialistCard, type CurrentAppointment, type SpecialistGoalProgress } from './SpecialistCard'
import type { Specialist } from '@/lib/models/specialist/specialist'

interface SpecialistGridProps {
  specialists: Specialist[]
  selectedId: string | null
  onSelect: (specialist: Specialist) => void
  onEdit?: (specialist: Specialist) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
  currentAppointments?: Map<string, CurrentAppointment>
  goalProgress?: Map<string, SpecialistGoalProgress>
}

export function SpecialistGrid({
  specialists,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  isLoading,
  currentAppointments,
  goalProgress,
}: SpecialistGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[180px] w-[280px] rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (specialists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No se encontraron especialistas</p>
        <p className="text-sm text-muted-foreground mt-1">
          Agrega un nuevo especialista para comenzar
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-4 p-4">
      {specialists.map((specialist) => {
        const appointment = currentAppointments?.get(specialist.id)
        const goal = goalProgress?.get(specialist.id)
        const isOnline = !!appointment

        return (
          <div key={specialist.id} className="w-[280px]">
            <SpecialistCard
              specialist={specialist}
              isSelected={selectedId === specialist.id}
              onClick={() => onSelect(specialist)}
              onEdit={onEdit}
              onDelete={onDelete}
              currentAppointment={appointment}
              goalProgress={goal}
              isOnline={isOnline}
            />
          </div>
        )
      })}
    </div>
  )
}
