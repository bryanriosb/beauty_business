'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, User } from 'lucide-react'

interface Appointment {
  id: string
  start_time: string
  end_time: string
  status: string
  specialist?: {
    first_name: string
    last_name: string | null
    profile_picture_url: string | null
  }
  user_profile?: {
    user?: {
      name?: string
    }
  }
  appointment_services?: Array<{
    service: {
      name: string
    }
  }>
}

interface DayAppointmentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  appointments: Appointment[]
  onSelectAppointment: (appointmentId: string) => void
}

const statusTranslations: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No Asistió',
}

const getStatusStyles = (status: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    CANCELLED: { bg: 'bg-[#e2e8f0]', text: 'text-[#475569]' },
    CONFIRMED: { bg: 'bg-[#a3b4f7]', text: 'text-[#1e293b]' },
    COMPLETED: { bg: 'bg-[#86efac]', text: 'text-[#1e293b]' },
    PENDING: { bg: 'bg-[#fde68a]', text: 'text-[#1e293b]' },
    NO_SHOW: { bg: 'bg-[#c4b5fd]', text: 'text-[#1e293b]' },
  }
  return styles[status] || { bg: 'bg-[#a3b4f7]', text: 'text-[#1e293b]' }
}

export default function DayAppointmentsModal({
  open,
  onOpenChange,
  date,
  appointments,
  onSelectAppointment,
}: DayAppointmentsModalProps) {
  if (!date) return null

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{formatDate(date)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {sortedAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay citas programadas para este día
            </p>
          ) : (
            <div className="space-y-2">
              {sortedAppointments.map((appointment) => {
                const statusStyle = getStatusStyles(appointment.status)
                const statusText = statusTranslations[appointment.status] || appointment.status

                return (
                  <div
                    key={appointment.id}
                    onClick={() => {
                      onSelectAppointment(appointment.id)
                      onOpenChange(false)
                    }}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {appointment.specialist?.profile_picture_url ? (
                        <img
                          src={appointment.specialist.profile_picture_url}
                          alt={appointment.specialist.first_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {appointment.specialist?.first_name?.[0] || 'E'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {appointment.user_profile?.user?.name || 'Cliente'}
                        </span>
                        {appointment.appointment_services && appointment.appointment_services.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">
                              {appointment.appointment_services[0].service.name}
                              {appointment.appointment_services.length > 1 &&
                                ` +${appointment.appointment_services.length - 1}`
                              }
                            </span>
                          </>
                        )}
                      </div>
                      {appointment.specialist && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Especialista: {appointment.specialist.first_name} {appointment.specialist.last_name}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
