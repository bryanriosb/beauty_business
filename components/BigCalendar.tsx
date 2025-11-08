'use client'

import { Calendar, dateFnsLocalizer, Event, Components } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const locales = {
  es: es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface BigCalendarProps {
  events: Event[]
  onSelectEvent?: (event: Event) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  onNavigate?: (date: Date) => void
  onView?: (view: string) => void
  onDrillDown?: (date: Date) => void
  defaultView?: 'month' | 'week' | 'day'
  defaultDate?: Date
}

const CustomDateHeader = ({ date, label, drilldownView, onDrillDown }: any) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            className="w-full h-full text-center font-semibold hover:text-primary hover:bg-primary/10 hover:border hover:border-primary transition-all rounded-sm py-1 border border-transparent"
            onClick={() => onDrillDown && onDrillDown(date)}
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ver todas las citas del día</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const CustomEvent = ({ event }: { event: Event }) => {
  const appointment = event.resource as any

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const specialistName = appointment?.specialist?.first_name || 'Especialista'
  const specialistPhoto = appointment?.specialist?.profile_picture_url
  const specialistInitial = appointment?.specialist?.first_name?.[0] || 'E'
  const totalServices = appointment?.appointment_services?.length || 0

  return (
    <div className="flex gap-2 h-full overflow-hidden p-0.5">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[0.6rem] font-semibold overflow-hidden">
        {specialistPhoto ? (
          <img
            src={specialistPhoto}
            alt={specialistInitial}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{specialistInitial}</span>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="font-semibold truncate text-xs leading-tight">{specialistName}</div>
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[0.7rem] leading-tight opacity-90">
            {formatTime(event.start as Date)}
          </div>
          {totalServices > 0 && (
            <div className="flex-shrink-0 text-[0.65rem] leading-tight opacity-75 font-medium">
              {totalServices}/{totalServices}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BigCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onNavigate,
  onView,
  onDrillDown,
  defaultView = 'month',
  defaultDate = new Date(),
}: BigCalendarProps) {
  const eventStyleGetter = (event: Event) => {
    const appointment = event.resource as any
    let backgroundColor = '#a3b4f7'
    let textColor = '#1e293b'
    let borderColor = 'transparent'

    if (appointment?.status === 'CANCELLED') {
      backgroundColor = '#e2e8f0'
      textColor = '#475569'
      borderColor = 'transparent'
    } else if (appointment?.status === 'CONFIRMED') {
      backgroundColor = '#a3b4f7'
      textColor = '#1e293b'
      borderColor = 'transparent'
    } else if (appointment?.status === 'COMPLETED') {
      backgroundColor = '#86efac'
      textColor = '#1e293b'
      borderColor = 'transparent'
    } else if (appointment?.status === 'PENDING') {
      backgroundColor = '#fde68a'
      textColor = '#1e293b'
      borderColor = 'transparent'
    } else if (appointment?.status === 'NO_SHOW') {
      backgroundColor = '#c4b5fd'
      textColor = '#1e293b'
      borderColor = 'transparent'
    }

    return {
      style: {
        backgroundColor,
        color: textColor,
        borderColor,
        borderWidth: '0px',
        borderStyle: 'solid',
        borderRadius: '8px',
        padding: '6px',
        fontSize: '0.875rem',
        fontWeight: '500',
        display: 'block',
        overflow: 'hidden',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
    }
  }

  const components: Components<Event> = {
    event: CustomEvent,
    month: {
      dateHeader: (props: any) => (
        <CustomDateHeader {...props} onDrillDown={onDrillDown} />
      ),
    },
  }

  return (
    <div className="h-[calc(100vh-12rem)] w-full [&_.rbc-toolbar]:dark:text-white [&_.rbc-toolbar_button]:dark:text-white [&_.rbc-toolbar_button]:dark:border-white/20 [&_.rbc-toolbar_button:hover]:!bg-primary/90 [&_.rbc-toolbar_button:hover]:!text-primary-foreground [&_.rbc-toolbar_button.rbc-active]:!bg-primary [&_.rbc-toolbar_button.rbc-active]:!text-primary-foreground [&_.rbc-toolbar_button.rbc-active]:!border-primary [&_.rbc-event]:!p-1 [&_.rbc-show-more]:!text-primary [&_.rbc-show-more]:!font-bold [&_.rbc-show-more:hover]:!underline [&_.rbc-date-cell]:cursor-pointer [&_.rbc-date-cell:hover]:bg-accent [&_.rbc-date-cell]:transition-colors [&_.rbc-date-cell]:rounded-sm [&_.rbc-button-link]:font-semibold [&_.rbc-button-link:hover]:text-primary [&_.rbc-button-link]:transition-colors">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="es"
        defaultView={defaultView}
        defaultDate={defaultDate}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        onNavigate={onNavigate}
        onView={onView}
        onDrillDown={(date) => {
          if (onDrillDown) {
            onDrillDown(date)
          }
        }}
        selectable
        eventPropGetter={eventStyleGetter}
        components={components}
        messages={{
          next: 'Siguiente',
          previous: 'Anterior',
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          agenda: 'Agenda',
          date: 'Fecha',
          time: 'Hora',
          event: 'Cita',
          noEventsInRange: 'No hay citas en este rango',
          showMore: (total) => `+ Ver más (${total})`,
        }}
      />
    </div>
  )
}
