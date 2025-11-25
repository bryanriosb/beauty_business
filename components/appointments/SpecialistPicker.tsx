'use client'

import { useState, useEffect } from 'react'
import { Check, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { getAvailableSpecialistsForSlotAction, type AvailableSpecialist } from '@/lib/actions/availability'

interface SpecialistPickerProps {
  businessId: string
  serviceId: string
  date: string
  time: string
  availableSpecialistIds?: string[]
  value?: string
  onChange: (specialistId: string, specialist?: AvailableSpecialist) => void
  disabled?: boolean
}

export default function SpecialistPicker({
  businessId,
  serviceId,
  date,
  time,
  availableSpecialistIds,
  value,
  onChange,
  disabled = false,
}: SpecialistPickerProps) {
  const [specialists, setSpecialists] = useState<AvailableSpecialist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSpecialists() {
      if (!businessId || !serviceId || !date || !time) {
        setSpecialists([])
        return
      }

      // Si ya tenemos los IDs disponibles, podemos cargar directamente
      if (availableSpecialistIds && availableSpecialistIds.length === 0) {
        setSpecialists([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await getAvailableSpecialistsForSlotAction(
          businessId,
          serviceId,
          date,
          time
        )

        if (result.success) {
          setSpecialists(result.specialists)
        } else {
          setError(result.error || 'Error al cargar especialistas')
          setSpecialists([])
        }
      } catch (err) {
        console.error('Error loading specialists:', err)
        setError('Error al cargar especialistas')
        setSpecialists([])
      } finally {
        setIsLoading(false)
      }
    }

    loadSpecialists()
  }, [businessId, serviceId, date, time, availableSpecialistIds])

  const handleSelectSpecialist = (spec: AvailableSpecialist) => {
    if (disabled) return
    onChange(spec.id, spec)
  }

  const getSpecialistInitials = (specialist: AvailableSpecialist) => {
    const first = specialist.first_name?.[0] || ''
    const last = specialist.last_name?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Cargando especialistas...</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!businessId || !serviceId || !date || !time) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <User className="h-4 w-4" />
        <span>Selecciona horario para ver especialistas disponibles</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive py-4">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (specialists.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 py-4 bg-amber-50 dark:bg-amber-950/20 px-3 rounded-lg">
        <AlertCircle className="h-4 w-4" />
        <span>No hay especialistas disponibles para este horario</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>
          {specialists.length} especialista{specialists.length !== 1 ? 's' : ''} disponible
          {specialists.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {specialists.map((specialist) => {
          const isSelected = value === specialist.id

          return (
            <button
              key={specialist.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectSpecialist(specialist)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                !isSelected && [
                  'bg-card hover:bg-accent/50',
                  'border-border hover:border-primary/30',
                ],
                isSelected && [
                  'bg-primary/10 border-primary',
                  'shadow-sm',
                ],
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {specialist.profile_picture_url ? (
                  <img
                    src={specialist.profile_picture_url}
                    alt={specialist.first_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getSpecialistInitials(specialist)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {specialist.first_name} {specialist.last_name || ''}
                </p>
                {specialist.specialty && (
                  <p className="text-xs text-muted-foreground truncate">
                    {specialist.specialty}
                  </p>
                )}
              </div>

              {/* Check icon */}
              {isSelected && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
