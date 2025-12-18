'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { X, Clock } from 'lucide-react'
import type { SpecialistWithAvailability } from '@/lib/models/specialist/specialist'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import { useIsMobile } from '@/hooks/use-mobile'
import Loading from '../ui/loading'

interface SpecialistDetailPanelProps {
  specialistId: string | null
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  hasPrev?: boolean
  hasNext?: boolean
}

const DAYS_MAP: Record<string, string> = {
  '0': 'Dom',
  '1': 'Lun',
  '2': 'Mar',
  '3': 'Mié',
  '4': 'Jue',
  '5': 'Vie',
  '6': 'Sáb',
}

const DAYS_ORDER = ['1', '2', '3', '4', '5', '6', '0']

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  CONFIRMED: { label: 'Confirmada', variant: 'default' },
  COMPLETED: { label: 'Completada', variant: 'outline' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
  NO_SHOW: { label: 'No asistió', variant: 'destructive' },
}

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
  const isMobile = useIsMobile()

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
      acc[String(avail.day_of_week)] = {
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

  const detailContent = (
    <>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loading className="w-8 h-8 text-primary" />
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
                {specialist.phone && (
                  <p className="text-sm text-muted-foreground">
                    {specialist.phone}
                  </p>
                )}
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
                <h3 className="text-sm font-medium">
                  Citas de hoy confirmadas
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {
                    todayAppointments.filter(
                      (apt) => apt.status !== 'CANCELLED'
                    ).length
                  }
                </Badge>
              </div>

              {todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin citas programadas para hoy
                </p>
              ) : (
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                  {todayAppointments.map((apt) => {
                    const isNow = currentAppointment?.id === apt.id
                    const isCancelled = apt.status === 'CANCELLED'
                    const statusConfig =
                      STATUS_CONFIG[apt.status] || STATUS_CONFIG.PENDING
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
                        className={`flex items-center justify-between gap-3 py-2 ${
                          isCancelled ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span
                              className={`${
                                isNow ? 'font-medium text-foreground' : ''
                              } ${isCancelled ? 'line-through' : ''}`}
                            >
                              {isNow && '(Ahora) '}
                              {startTime} - {endTime}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end shrink-0">
                          <Badge
                            variant={statusConfig.variant}
                            className="text-xs"
                          >
                            {statusConfig.label}
                          </Badge>
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
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-primary font-medium">
                    Semana:
                  </span>
                  <span className="text-sm text-primary font-medium">
                    {formatDateRange()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {DAYS_ORDER.map((day) => {
                  const schedule = availabilityByDay?.[day]
                  const todayNumber = new Date().getDay()
                  const isToday = String(todayNumber) === day

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
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={!!specialistId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <div className="flex flex-col h-full">{detailContent}</div>
        </SheetContent>
      </Sheet>
    )
  }

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
      {detailContent}
    </div>
  )
}
