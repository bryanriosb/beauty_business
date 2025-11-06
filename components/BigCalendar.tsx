'use client'

import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

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
}

export default function BigCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
}: BigCalendarProps) {
  return (
    <div className="h-[calc(100vh-12rem)] w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="es"
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
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
