'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getAvailableSlotsForServiceAction, type TimeSlot } from '@/lib/actions/availability'

interface TimeSlotPickerProps {
  businessId: string
  serviceId: string
  date: string
  value?: string
  onChange: (time: string, availableSpecialistIds: string[]) => void
  disabled?: boolean
}

export default function TimeSlotPicker({
  businessId,
  serviceId,
  date,
  value,
  onChange,
  disabled = false,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessOpen, setBusinessOpen] = useState(true)
  const [serviceDuration, setServiceDuration] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
  }, [businessId, serviceId, date])

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

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
        <Clock className="h-4 w-4" />
        <span>
          {availableSlots.length} horario{availableSlots.length !== 1 ? 's' : ''} disponible
          {availableSlots.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative group">
        {/* Botón scroll izquierda */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md bg-background"
          onClick={() => handleScroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Container de slots con scroll horizontal */}
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {slots.map((slot, index) => {
            const isSelected = value === slot.time
            const isAvailable = slot.available

            return (
              <button
                key={index}
                type="button"
                disabled={!isAvailable || disabled}
                onClick={() => handleSelectSlot(slot)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isAvailable && !isSelected && [
                    'bg-secondary text-secondary-foreground',
                    'hover:bg-primary/10 hover:text-primary',
                    'border border-transparent hover:border-primary/20',
                  ],
                  isSelected && [
                    'bg-primary text-primary-foreground',
                    'shadow-md',
                  ],
                  !isAvailable && [
                    'bg-muted text-muted-foreground/50',
                    'cursor-not-allowed line-through',
                  ],
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {formatTime(slot.time)}
              </button>
            )
          })}
        </div>

        {/* Botón scroll derecha */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md bg-background"
          onClick={() => handleScroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Gradientes de fade en los bordes */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {value && (
        <p className="text-sm text-muted-foreground">
          Horario seleccionado: <span className="font-medium text-foreground">{formatTime(value)}</span>
        </p>
      )}
    </div>
  )
}
