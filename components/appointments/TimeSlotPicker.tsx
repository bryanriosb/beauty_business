'use client'

import { useState, useEffect } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { getAvailableSlotsForServiceAction, type TimeSlot } from '@/lib/actions/availability'

interface TimeSlotPickerProps {
  businessId: string
  serviceId: string
  date: string
  value?: string
  onChange: (time: string, availableSpecialistIds: string[]) => void
  disabled?: boolean
  excludeAppointmentId?: string
  initialSpecialistId?: string
}

export default function TimeSlotPicker({
  businessId,
  serviceId,
  date,
  value,
  onChange,
  disabled = false,
  excludeAppointmentId,
  initialSpecialistId,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessOpen, setBusinessOpen] = useState(true)
  const [serviceDuration, setServiceDuration] = useState(0)

  useEffect(() => {
    async function loadAvailability() {
      if (!businessId || !serviceId || !date) {
        setSlots([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await getAvailableSlotsForServiceAction({
          businessId,
          serviceId,
          date,
          excludeAppointmentId,
        })

        if (result.success) {
          setSlots(result.slots)
          setBusinessOpen(result.businessOpen)
          setServiceDuration(result.serviceDurationMinutes)
        } else {
          setError(result.error || 'Error al cargar disponibilidad')
          setSlots([])
        }
      } catch (err) {
        console.error('Error loading availability:', err)
        setError('Error al cargar disponibilidad')
        setSlots([])
      } finally {
        setIsLoading(false)
      }
    }

    loadAvailability()
  }, [businessId, serviceId, date, excludeAppointmentId])

  const handleSelectSlot = (slot: TimeSlot) => {
    if (!slot.available || disabled) return
    onChange(slot.time, slot.availableSpecialistIds)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const availableSlots = slots.filter((s) => s.available)
  const hasAvailableSlots = availableSlots.length > 0

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Cargando horarios disponibles...</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-20 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!businessId || !serviceId || !date) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Clock className="h-4 w-4" />
        <span>Selecciona servicio y fecha para ver horarios</span>
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

  if (!businessOpen) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 py-4 bg-amber-50 dark:bg-amber-950/20 px-3 rounded-lg">
        <AlertCircle className="h-4 w-4" />
        <span>El negocio está cerrado en esta fecha</span>
      </div>
    )
  }


  if (!hasAvailableSlots) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 py-4 bg-amber-50 dark:bg-amber-950/20 px-3 rounded-lg">
        <AlertCircle className="h-4 w-4" />
        <span>No hay horarios disponibles para esta fecha</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {availableSlots.length} horario{availableSlots.length !== 1 ? 's' : ''} disponible
          {availableSlots.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {availableSlots.map((slot, index) => {
          const isSelected = value === slot.time

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectSlot(slot)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all text-center',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                !isSelected && [
                  'bg-secondary text-secondary-foreground',
                  'hover:bg-primary hover:text-primary-foreground',
                ],
                isSelected && [
                  'bg-primary text-primary-foreground',
                  'shadow-md',
                ],
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {formatTime(slot.time)}
            </button>
          )
        })}
      </div>

      {value && (
        <p className="text-sm text-muted-foreground">
          Horario seleccionado: <span className="font-medium text-foreground">{formatTime(value)}</span>
        </p>
      )}
    </div>
  )
}
