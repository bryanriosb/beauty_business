'use client'

import { useMemo, useState } from 'react'
import { format, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Building2,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AppointmentsFilters,
  type AppointmentsFiltersState,
} from './AppointmentsFilters'

interface Specialist {
  id: string
  first_name: string
  last_name: string | null
}

interface AppointmentsTableViewProps {
  appointments: any[]
  currentDate: Date
  viewMode: 'day' | 'week' | 'month'
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void
  onNavigate: (date: Date) => void
  onSelectAppointment: (id: string) => void
  specialists?: Specialist[]
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendiente',
    bg: 'bg-[#fde68a]',
    text: 'text-[#1e293b]',
  },
  CONFIRMED: {
    label: 'Confirmada',
    bg: 'bg-[#a3b4f7]',
    text: 'text-[#1e293b]',
  },
  COMPLETED: {
    label: 'Completada',
    bg: 'bg-[#86efac]',
    text: 'text-[#1e293b]',
  },
  CANCELLED: {
    label: 'Cancelada',
    bg: 'bg-[#e2e8f0]',
    text: 'text-[#475569]',
  },
  NO_SHOW: {
    label: 'No asistió',
    bg: 'bg-[#c4b5fd]',
    text: 'text-[#1e293b]',
  },
}

const DEFAULT_FILTERS: AppointmentsFiltersState = {
  search: '',
  status: 'all',
  paymentStatus: 'all',
  specialistId: 'all',
}

export default function AppointmentsTableView({
  appointments,
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigate,
  onSelectAppointment,
  specialists = [],
}: AppointmentsTableViewProps) {
  const [sortField, setSortField] = useState<
    'date' | 'client' | 'specialist' | 'status'
  >('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<AppointmentsFiltersState>(DEFAULT_FILTERS)

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.start_time)

      // Filtro por rango de fecha según viewMode
      let dateMatch = true
      switch (viewMode) {
        case 'day':
          dateMatch = isSameDay(appointmentDate, currentDate)
          break
        case 'week':
          const weekStart = startOfWeek(currentDate, { locale: es })
          const weekEnd = endOfWeek(currentDate, { locale: es })
          dateMatch = appointmentDate >= weekStart && appointmentDate <= weekEnd
          break
        case 'month':
          dateMatch =
            appointmentDate.getMonth() === currentDate.getMonth() &&
            appointmentDate.getFullYear() === currentDate.getFullYear()
          break
      }
      if (!dateMatch) return false

      // Filtro por búsqueda de texto
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const clientName = `${appointment.client?.first_name || ''} ${appointment.client?.last_name || ''}`.toLowerCase()
        const specialistName = `${appointment.specialist?.first_name || ''} ${appointment.specialist?.last_name || ''}`.toLowerCase()
        const services = (appointment.appointment_services || [])
          .map((s: any) => s.service?.name || '')
          .join(' ')
          .toLowerCase()
        const clientPhone = appointment.client?.phone_number?.toLowerCase() || ''

        const matchesSearch =
          clientName.includes(searchLower) ||
          specialistName.includes(searchLower) ||
          services.includes(searchLower) ||
          clientPhone.includes(searchLower)

        if (!matchesSearch) return false
      }

      // Filtro por estado de cita
      if (filters.status !== 'all' && appointment.status !== filters.status) {
        return false
      }

      // Filtro por estado de pago
      if (filters.paymentStatus !== 'all' && appointment.payment_status !== filters.paymentStatus) {
        return false
      }

      // Filtro por especialista
      if (filters.specialistId !== 'all' && appointment.specialist_id !== filters.specialistId) {
        return false
      }

      return true
    })
  }, [appointments, currentDate, viewMode, filters])

  const sortedAppointments = useMemo(() => {
    const sorted = [...filteredAppointments].sort((a, b) => {
      let compareA: any
      let compareB: any

      switch (sortField) {
        case 'date':
          compareA = new Date(a.start_time).getTime()
          compareB = new Date(b.start_time).getTime()
          break
        case 'client':
          compareA = `${a.client?.first_name || ''} ${
            a.client?.last_name || ''
          }`.toLowerCase()
          compareB = `${b.client?.first_name || ''} ${
            b.client?.last_name || ''
          }`.toLowerCase()
          break
        case 'specialist':
          compareA = `${a.specialist?.first_name || ''} ${
            a.specialist?.last_name || ''
          }`.toLowerCase()
          compareB = `${b.specialist?.first_name || ''} ${
            b.specialist?.last_name || ''
          }`.toLowerCase()
          break
        case 'status':
          compareA = a.status || ''
          compareB = b.status || ''
          break
        default:
          return 0
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredAppointments, sortField, sortDirection])

  const handleSort = (field: 'date' | 'client' | 'specialist' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
    }
    onNavigate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    onNavigate(newDate)
  }


  const getDateLabel = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, "d 'de' MMMM yyyy", { locale: es })
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: es })
        const weekEnd = endOfWeek(currentDate, { locale: es })
        return `${format(weekStart, 'd MMM', { locale: es })} - ${format(
          weekEnd,
          'd MMM yyyy',
          { locale: es }
        )}`
      case 'month':
        return (
          format(currentDate, 'MMMM yyyy', { locale: es })
            .charAt(0)
            .toUpperCase() +
          format(currentDate, 'MMMM yyyy', { locale: es }).slice(1)
        )
    }
  }

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: es })
  }

  const formatDate = (date: Date) => {
    return format(date, 'd MMM yyyy', { locale: es })
  }

  return (
    <div className="flex flex-col gap-4">
      <AppointmentsFilters
        filters={filters}
        onFiltersChange={setFilters}
        specialists={specialists}
      />

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            className="h-9"
          >
            <ChevronLeft className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Anterior</span>
          </Button>

          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm md:text-base min-w-[180px] text-center">
              {getDateLabel()}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-9"
          >
            <span className="hidden md:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4 md:ml-1" />
          </Button>
        </div>

        <ButtonGroup>
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('day')}
            title="Vista por día"
          >
            Día
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('week')}
            title="Vista por semana"
          >
            Semana
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('month')}
            title="Vista por mes"
          >
            Mes
          </Button>
        </ButtonGroup>
      </div>

      {sortedAppointments.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            No hay citas{' '}
            {viewMode === 'day'
              ? 'en este día'
              : viewMode === 'week'
              ? 'en esta semana'
              : 'en este mes'}
          </p>
        </div>
      ) : (
        <>
          {/* Vista de tarjetas para móvil */}
          <div className="md:hidden">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-3 pr-4">
                {sortedAppointments.map((appointment) => {
                  const status = appointment.status || 'PENDING'
                  const statusConfig =
                    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
                    STATUS_CONFIG.PENDING
                  const startTime = new Date(appointment.start_time)
                  const endTime = new Date(appointment.end_time)
                  const specialistName =
                    `${appointment.specialist?.first_name || ''} ${
                      appointment.specialist?.last_name || ''
                    }`.trim() || 'Sin asignar'
                  const clientName =
                    `${appointment.client?.first_name || ''} ${
                      appointment.client?.last_name || ''
                    }`.trim() || '-'
                  const services = appointment.appointment_services || []

                  return (
                    <button
                      key={appointment.id}
                      onClick={() => onSelectAppointment(appointment.id)}
                      className="w-full bg-card rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm mb-1">
                            {formatDate(startTime)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(startTime)} - {formatTime(endTime)}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-medium text-xs ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {clientName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Cliente</p>
                            <p className="text-sm font-medium truncate">{clientName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {appointment.specialist?.profile_picture_url ? (
                            <img
                              src={appointment.specialist.profile_picture_url}
                              alt={specialistName}
                              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold">
                                {specialistName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Especialista</p>
                            <p className="text-sm truncate">{specialistName}</p>
                          </div>
                        </div>

                        {services.length > 0 && (
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Vista de tabla para tablet y desktop */}
          <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <table className="w-full">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr className="border-b">
                    <th
                      className="text-left p-2 md:p-3 font-semibold text-xs md:text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        <CalendarIcon className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Fecha y Hora</span>
                        <span className="sm:hidden">Fecha</span>
                        {sortField === 'date' && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="text-left p-2 md:p-3 font-semibold text-xs md:text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('client')}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        <User className="h-3 w-3 md:h-4 md:w-4" />
                        Cliente
                        {sortField === 'client' && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="text-left p-2 md:p-3 font-semibold text-xs md:text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('specialist')}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        <User className="h-3 w-3 md:h-4 md:w-4" />
                        Especialista
                        {sortField === 'specialist' && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="text-left p-2 md:p-3 font-semibold text-xs md:text-sm hidden lg:table-cell">
                      <div className="flex items-center gap-1 md:gap-2">
                        <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                        Sucursal
                      </div>
                    </th>
                    <th className="text-left p-2 md:p-3 font-semibold text-xs md:text-sm hidden md:table-cell">
                      Servicios
                    </th>
                    <th
                      className="text-left p-2 md:p-3 font-semibold text-xs md:text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Estado
                        {sortField === 'status' && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
              <tbody>
                {sortedAppointments.map((appointment) => {
                  const status = appointment.status || 'PENDING'
                  const statusConfig =
                    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
                    STATUS_CONFIG.PENDING
                  const startTime = new Date(appointment.start_time)
                  const endTime = new Date(appointment.end_time)
                  const specialistName =
                    `${appointment.specialist?.first_name || ''} ${
                      appointment.specialist?.last_name || ''
                    }`.trim() || 'Sin asignar'
                  const clientName =
                    `${appointment.client?.first_name || ''} ${
                      appointment.client?.last_name || ''
                    }`.trim() || '-'
                  const businessName =
                    appointment.business?.name || 'Sin sucursal'
                  const services = appointment.appointment_services || []

                  return (
                    <tr
                      key={appointment.id}
                      onClick={() => onSelectAppointment(appointment.id)}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="p-2 md:p-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs md:text-sm">
                            {formatDate(startTime)}
                          </span>
                          <span className="text-[0.65rem] md:text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            {formatTime(startTime)} - {formatTime(endTime)}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 md:p-3">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[0.65rem] md:text-xs font-semibold text-primary">
                              {clientName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs md:text-sm font-medium truncate max-w-[120px] md:max-w-none">
                            {clientName}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 md:p-3">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          {appointment.specialist?.profile_picture_url ? (
                            <img
                              src={appointment.specialist.profile_picture_url}
                              alt={specialistName}
                              className="h-6 w-6 md:h-8 md:w-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-[0.65rem] md:text-xs font-semibold">
                                {specialistName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-xs md:text-sm truncate max-w-[120px] md:max-w-none">{specialistName}</span>
                        </div>
                      </td>
                      <td className="p-2 md:p-3 hidden lg:table-cell">
                        <span className="text-xs md:text-sm text-muted-foreground">
                          {businessName}
                        </span>
                      </td>
                      <td className="p-2 md:p-3 hidden md:table-cell">
                        <div className="text-xs md:text-sm">
                          {services.length > 0 ? (
                            <span className="text-muted-foreground">
                              {services.length}{' '}
                              {services.length === 1 ? 'servicio' : 'servicios'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 md:p-3">
                        <span
                          className={`block w-full text-center px-2 py-0.5 rounded font-medium text-xs ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollArea>
          </div>
          </div>
        </>
      )}
    </div>
  )
}
