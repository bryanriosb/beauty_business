'use client'

import { useState, useEffect } from 'react'
import BigCalendar from './BigCalendar'
import { Event } from 'react-big-calendar'
import { useCurrentUser } from '@/hooks/use-current-user'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import type { Appointment } from '@/lib/models/appointment/appointment'

export default function Appointments() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, role, businessAccountId } = useCurrentUser()
  const appointmentService = new AppointmentService()

  useEffect(() => {
    if (!user || !role) return

    const fetchAppointments = async () => {
      try {
        setIsLoading(true)
        const params = {
          user_role: role,
          business_account_id: businessAccountId || undefined,
        }

        const response = await appointmentService.fetchItems(params)

        const formattedEvents: Event[] = response.data.map((appointment: Appointment) => ({
          title: `Cita - ${appointment.status}`,
          start: new Date(appointment.start_time),
          end: new Date(appointment.end_time),
          resource: appointment,
        }))

        setEvents(formattedEvents)
      } catch (error) {
        console.error('Error fetching appointments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [user, role, businessAccountId])

  const handleSelectEvent = (event: Event) => {
    console.log('Evento seleccionado:', event)
  }

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    console.log('Slot seleccionado:', slotInfo)
  }

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Citas</h1>
        </div>
        <div className="bg-card rounded-lg border p-4 h-96 flex items-center justify-center">
          <p>Cargando citas...</p>
        </div>
      </div>
    )
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
