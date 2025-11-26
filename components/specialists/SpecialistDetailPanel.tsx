'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { X, Clock } from 'lucide-react'
import type { SpecialistWithAvailability } from '@/lib/models/specialist/specialist'
import SpecialistService from '@/lib/services/specialist/specialist-service'

interface SpecialistDetailPanelProps {
  specialistId: string | null
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  hasPrev?: boolean
  hasNext?: boolean
}

const DAYS_MAP: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom',
}

const DAYS_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function formatTime(time: string) {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function formatDateRange() {
  const now = new Date()
  const startOfWeek = new Date(now)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startOfWeek.setDate(now.getDate() + mondayOffset)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const formatDate = (date: Date) =>
    `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`

  return `${formatDate(startOfWeek)} → ${formatDate(endOfWeek)}`
}

export function SpecialistDetailPanel({
  specialistId,
  onClose,
}: SpecialistDetailPanelProps) {
  const [specialist, setSpecialist] =
    useState<SpecialistWithAvailability | null>(null)
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!specialistId) {
      setSpecialist(null)
      setTodayAppointments([])
      return
    }

    const loadSpecialist = async () => {
      setIsLoading(true)
      try {
        const service = new SpecialistService()
        const [data, appointments] = await Promise.all([
          service.getById(specialistId),
          service.getTodayAppointments(specialistId),
        ])
        setSpecialist(data)
        setTodayAppointments(appointments)
      } catch (error) {
        console.error('Error loading specialist:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSpecialist()
  }, [specialistId])

  if (!specialistId) return null

  const initials = specialist
    ? `${specialist.first_name[0]}${
        specialist.last_name?.[0] || ''
      }`.toUpperCase()
    : ''
  const fullName = specialist
    ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
    : ''
  const username =
    specialist?.username || specialist?.first_name.toLowerCase() || ''

  const availabilityByDay = specialist?.availability?.reduce((acc, avail) => {
    if (avail.is_available) {
      acc[avail.day_of_week] = {
        start: formatTime(avail.start_time),
        end: formatTime(avail.end_time),
      }
    }
    return acc
  }, {} as Record<string, { start: string; end: string }>)

  const currentAppointment = todayAppointments.find((apt) => {
    const now = new Date()
    const start = new Date(apt.start_time)
    const end = new Date(apt.end_time)
    return now >= start && now <= end
  })

  return (
    <div className="w-[400px] border-l bg-card flex flex-col h-full">
      <div className="flex items-center justify-end p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : specialist ? (
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={specialist.profile_picture_url || undefined}
                    alt={fullName}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {currentAppointment && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-lg">{fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  {specialist.specialty || 'Especialista'}
                </p>
                <p className="text-sm text-muted-foreground/70">@{username}</p>
              </div>
            </div>

            {/* Bio */}
            {specialist.bio && (
              <>
                <div>
                  <h3 className="text-sm font-medium mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {specialist.bio}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Today's Events */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-medium">Citas de hoy</h3>
                <Badge variant="secondary" className="text-xs">
                  {todayAppointments.length}
                </Badge>
              </div>

              {todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin citas programadas para hoy
                </p>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt, index) => {
                    const isNow = currentAppointment?.id === apt.id
                    const startTime = new Date(
                      apt.start_time
                    ).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                    const endTime = new Date(apt.end_time).toLocaleTimeString(
                      'es-CO',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      }
                    )

                    return (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span
                              className={
                                isNow ? 'font-medium text-foreground' : ''
                              }
                            >
                              {isNow && '(Ahora) '}
                              {startTime} - {endTime}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {apt.services?.name && (
                            <Badge variant="outline" className="text-xs">
                              {apt.services.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Working Hours */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Horario de trabajo</h3>
                <span className="text-xs text-primary font-medium">
                  {formatDateRange()}
                </span>
              </div>

              <div className="space-y-2">
                {DAYS_ORDER.map((day) => {
                  const schedule = availabilityByDay?.[day]
                  const dayNumber = new Date().getDay()
                  const dayIndex = DAYS_ORDER.indexOf(day)
                  const adjustedDayIndex = dayIndex === 6 ? 0 : dayIndex + 1
                  const isToday = adjustedDayIndex === dayNumber

                  return (
                    <div
                      key={day}
                      className={`flex items-center justify-between text-sm py-1 px-2 rounded ${
                        isToday ? 'bg-primary/5' : ''
                      }`}
                    >
                      <span
                        className={`w-12 ${
                          isToday ? 'font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {DAYS_MAP[day]}
                      </span>
                      {schedule ? (
                        <span className={isToday ? 'font-medium' : ''}>
                          {schedule.start} → {schedule.end}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Cerrado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No se encontró el especialista
        </div>
      )}
    </div>
  )
}
