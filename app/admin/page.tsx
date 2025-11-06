'use client'

import { useState } from 'react'
import BigCalendar from '@/components/BigCalendar'
import { Event } from 'react-big-calendar'

export default function AppointmentsPage() {
  const [events, setEvents] = useState<Event[]>([
    {
      title: 'Corte de Cabello - María López',
      start: new Date(2025, 10, 6, 10, 0),
      end: new Date(2025, 10, 6, 11, 0),
    },
    {
      title: 'Manicure - Ana García',
      start: new Date(2025, 10, 6, 14, 0),
      end: new Date(2025, 10, 6, 15, 0),
    },
    {
      title: 'Tinte - Carlos Ruiz',
      start: new Date(2025, 10, 7, 9, 0),
      end: new Date(2025, 10, 7, 11, 0),
    },
  ])

  const handleSelectEvent = (event: Event) => {
    console.log('Evento seleccionado:', event)
    // Aquí puedes agregar lógica para mostrar detalles del evento
  }

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    console.log('Slot seleccionado:', slotInfo)
    // Aquí puedes agregar lógica para crear una nueva cita
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Citas</h1>
      </div>
      <div className="bg-card rounded-lg border p-4">
        <BigCalendar
          events={events}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
        />
      </div>
    </div>
  )
}
