'use client'

import { useMemo } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MobileAppointmentsListProps {
  appointments: any[]
  currentDate: Date
  onNavigate: (date: Date) => void
  onSelectAppointment: (id: string) => void
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendiente',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  CONFIRMED: {
    label: 'Confirmada',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-200 dark:border-blue-800',
  },
  COMPLETED: {
    label: 'Completada',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-200 dark:border-green-800',
  },
  CANCELLED: {
    label: 'Cancelada',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  NO_SHOW: {
    label: 'No asistió',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-200 dark:border-purple-800',
  },
}

export default function MobileAppointmentsList({
  appointments,
  currentDate,
  onNavigate,
  onSelectAppointment,
}: MobileAppointmentsListProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: es })
    const end = endOfWeek(currentDate, { locale: es })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const appointmentsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    weekDays.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd')
      grouped[key] = appointments.filter((apt) =>
        isSameDay(new Date(apt.start_time), day)
      ).sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    })
    return grouped
  }, [appointments, weekDays])

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    onNavigate(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    onNavigate(newDate)
  }

  const handleToday = () => {
    onNavigate(new Date())
  }

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: es })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 bg-card rounded-lg border p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevWeek}
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 text-center">
          <p className="font-semibold text-sm">
            {format(weekDays[0], 'd MMM', { locale: es })} - {format(weekDays[6], 'd MMM yyyy', { locale: es })}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextWeek}
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="text-xs"
        >
          Hoy
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-4 pr-4">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayAppointments = appointmentsByDay[key] || []
            const isToday = isSameDay(day, new Date())

            return (
              <div key={key} className="space-y-2">
                <div
                  className={`sticky top-0 z-10 flex items-center gap-2 py-2 px-3 rounded-lg border ${
                    isToday
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${isToday ? '' : 'text-foreground'}`}>
                      {format(day, 'EEEE', { locale: es }).charAt(0).toUpperCase() +
                       format(day, 'EEEE', { locale: es }).slice(1)}
                    </p>
                    <p className={`text-xs ${isToday ? 'opacity-90' : 'text-muted-foreground'}`}>
                      {format(day, 'd MMMM', { locale: es })}
                    </p>
                  </div>
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      isToday
                        ? 'bg-primary-foreground/20'
                        : 'bg-muted'
                    }`}
                  >
                    {dayAppointments.length} {dayAppointments.length === 1 ? 'cita' : 'citas'}
                  </div>
                </div>

                {dayAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {dayAppointments.map((appointment) => {
                      const status = appointment.status || 'PENDING'
                      const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING
                      const startTime = new Date(appointment.start_time)
                      const endTime = new Date(appointment.end_time)
                      const specialistName = appointment.specialist?.first_name || 'Especialista'
                      const specialistLastName = appointment.specialist?.last_name || ''
                      const clientName = appointment.client?.first_name || 'Cliente'
                      const clientLastName = appointment.client?.last_name || ''
                      const totalServices = appointment.appointment_services?.length || 0

                      return (
                        <button
                          key={appointment.id}
                          onClick={() => onSelectAppointment(appointment.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${statusConfig.bg} ${statusConfig.border}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Clock className={`h-4 w-4 flex-shrink-0 ${statusConfig.text}`} />
                              <span className={`font-semibold text-sm ${statusConfig.text}`}>
                                {formatTime(startTime)} - {formatTime(endTime)}
                              </span>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              <User className={`h-4 w-4 flex-shrink-0 mt-0.5 ${statusConfig.text}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium ${statusConfig.text}`}>
                                  {specialistName} {specialistLastName}
                                </p>
                                <p className={`text-xs opacity-75 ${statusConfig.text}`}>
                                  Especialista
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <User className={`h-4 w-4 flex-shrink-0 mt-0.5 ${statusConfig.text}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium ${statusConfig.text}`}>
                                  {clientName} {clientLastName}
                                </p>
                                <p className={`text-xs opacity-75 ${statusConfig.text}`}>
                                  Cliente
                                </p>
                              </div>
                            </div>

                            {totalServices > 0 && (
                              <p className={`text-xs mt-2 ${statusConfig.text} opacity-75`}>
                                {totalServices} {totalServices === 1 ? 'servicio' : 'servicios'}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg border border-dashed">
                    No hay citas programadas
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
