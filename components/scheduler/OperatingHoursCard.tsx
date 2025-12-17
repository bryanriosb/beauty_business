'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessHours } from '@/lib/models/business/business-hours'
import type { DayOfWeek } from '@/lib/types/enums'
import {
  fetchBusinessHoursAction,
  updateBusinessHoursAction,
} from '@/lib/actions/business-hours'

interface OperatingHoursCardProps {
  businessId: string | null
}

interface DaySchedule {
  day: DayOfWeek
  shifts: Array<{
    shift_number: number
    open_time: string
    close_time: string
  }>
  is_closed: boolean
}

const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
]

const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '18:00'

function getEmptySchedule(): DaySchedule[] {
  return DAYS_OF_WEEK.map(({ value }) => ({
    day: value,
    shifts: [],
    is_closed: true,
  }))
}

function getDefaultSchedule(): DaySchedule[] {
  return DAYS_OF_WEEK.map(({ value }) => ({
    day: value,
    shifts: [
      { shift_number: 1, open_time: DEFAULT_OPEN, close_time: DEFAULT_CLOSE },
    ],
    is_closed: value === '0',
  }))
}

function businessHoursToSchedule(hours: BusinessHours[]): DaySchedule[] {
  const schedule = getDefaultSchedule()

  hours.forEach((h) => {
    const dayIdx = schedule.findIndex((s) => s.day === h.day)
    if (dayIdx === -1) return

    if (h.is_closed) {
      schedule[dayIdx].is_closed = true
      schedule[dayIdx].shifts = []
    } else {
      schedule[dayIdx].is_closed = false
      const shiftIdx = schedule[dayIdx].shifts.findIndex(
        (s) => s.shift_number === h.shift_number
      )
      if (shiftIdx === -1) {
        schedule[dayIdx].shifts.push({
          shift_number: h.shift_number,
          open_time: h.open_time || DEFAULT_OPEN,
          close_time: h.close_time || DEFAULT_CLOSE,
        })
      } else {
        schedule[dayIdx].shifts[shiftIdx] = {
          shift_number: h.shift_number,
          open_time: h.open_time || DEFAULT_OPEN,
          close_time: h.close_time || DEFAULT_CLOSE,
        }
      }
    }
  })

  schedule.forEach((day) => {
    day.shifts.sort((a, b) => a.shift_number - b.shift_number)
  })

  return schedule
}

export function OperatingHoursCard({ businessId }: OperatingHoursCardProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(getEmptySchedule())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [applyAllOpen, setApplyAllOpen] = useState(DEFAULT_OPEN)
  const [applyAllClose, setApplyAllClose] = useState(DEFAULT_CLOSE)

  const loadHours = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const hours = await fetchBusinessHoursAction(businessId)
    if (hours.length > 0) {
      setSchedule(businessHoursToSchedule(hours))
    } else {
      setSchedule(getEmptySchedule())
    }
    setIsLoading(false)
  }, [businessId])

  useEffect(() => {
    loadHours()
  }, [loadHours])

  const handleToggleDay = (dayIdx: number) => {
    setSchedule((prev) => {
      const updated = [...prev]
      updated[dayIdx] = {
        ...updated[dayIdx],
        is_closed: !updated[dayIdx].is_closed,
        shifts: !updated[dayIdx].is_closed
          ? []
          : [
              {
                shift_number: 1,
                open_time: DEFAULT_OPEN,
                close_time: DEFAULT_CLOSE,
              },
            ],
      }
      return updated
    })
  }

  const handleTimeChange = (
    dayIdx: number,
    shiftIdx: number,
    field: 'open_time' | 'close_time',
    value: string
  ) => {
    setSchedule((prev) => {
      const updated = [...prev]
      updated[dayIdx].shifts[shiftIdx] = {
        ...updated[dayIdx].shifts[shiftIdx],
        [field]: value,
      }
      return updated
    })
  }

  const handleAddShift = (dayIdx: number) => {
    setSchedule((prev) => {
      const updated = [...prev]
      const maxShift = Math.max(
        ...updated[dayIdx].shifts.map((s) => s.shift_number),
        0
      )
      updated[dayIdx].shifts.push({
        shift_number: maxShift + 1,
        open_time: '14:00',
        close_time: '20:00',
      })
      return updated
    })
  }

  const handleRemoveShift = (dayIdx: number, shiftIdx: number) => {
    setSchedule((prev) => {
      const updated = [...prev]
      updated[dayIdx].shifts.splice(shiftIdx, 1)
      if (updated[dayIdx].shifts.length === 0) {
        updated[dayIdx].is_closed = true
      }
      return updated
    })
  }

  const handleApplyToAll = () => {
    setSchedule((prev) =>
      prev.map((day) => ({
        ...day,
        is_closed: false,
        shifts: [
          {
            shift_number: 1,
            open_time: applyAllOpen,
            close_time: applyAllClose,
          },
        ],
      }))
    )
    toast.success('Horario aplicado a todos los días')
  }

  const handleApplyToWeekdays = () => {
    setSchedule((prev) =>
      prev.map((day) => ({
        ...day,
        is_closed: day.day === '0' || day.day === '6',
        shifts:
          day.day === '0' || day.day === '6'
            ? []
            : [
                {
                  shift_number: 1,
                  open_time: applyAllOpen,
                  close_time: applyAllClose,
                },
              ],
      }))
    )
    toast.success('Horario aplicado a días laborales')
  }

  const handleSave = async () => {
    if (!businessId) {
      toast.error('No hay sucursal seleccionada')
      return
    }

    setIsSaving(true)

    const hoursToSave: Omit<
      BusinessHours,
      'id' | 'business_id' | 'created_at' | 'updated_at'
    >[] = []

    schedule.forEach((day) => {
      if (day.is_closed) {
        hoursToSave.push({
          day: day.day,
          shift_number: 1,
          open_time: null,
          close_time: null,
          is_closed: true,
        })
      } else {
        day.shifts.forEach((shift) => {
          hoursToSave.push({
            day: day.day,
            shift_number: shift.shift_number,
            open_time: shift.open_time,
            close_time: shift.close_time,
            is_closed: false,
          })
        })
      }
    })

    const result = await updateBusinessHoursAction(businessId, hoursToSave)

    if (result.success) {
      toast.success('Horarios guardados correctamente')
    } else {
      toast.error(result.error || 'Error al guardar horarios')
    }

    setIsSaving(false)
  }

  if (!businessId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecciona una sucursal para configurar los horarios
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between mb-4">
        <CardTitle>Horarios de Atención</CardTitle>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          data-tutorial="business-hours-save-button"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <Label className="text-sm font-medium">Aplicar horario rápido</Label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Desde</Label>
              <Input
                type="time"
                value={applyAllOpen}
                onChange={(e) => setApplyAllOpen(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Hasta</Label>
              <Input
                type="time"
                value={applyAllClose}
                onChange={(e) => setApplyAllClose(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleApplyToWeekdays}
              >
                Lun - Vie
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleApplyToAll}
                data-tutorial="business-hours-apply-all-button"
              >
                Todos
              </Button>
            </div>
          </div>
        </div>

        {schedule.map((day, dayIdx) => (
          <DayRow
            key={day.day}
            day={day}
            dayLabel={
              DAYS_OF_WEEK.find((d) => d.value === day.day)?.label || ''
            }
            onToggle={() => handleToggleDay(dayIdx)}
            onTimeChange={(shiftIdx, field, value) =>
              handleTimeChange(dayIdx, shiftIdx, field, value)
            }
            onAddShift={() => handleAddShift(dayIdx)}
            onRemoveShift={(shiftIdx) => handleRemoveShift(dayIdx, shiftIdx)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface DayRowProps {
  day: DaySchedule
  dayLabel: string
  onToggle: () => void
  onTimeChange: (
    shiftIdx: number,
    field: 'open_time' | 'close_time',
    value: string
  ) => void
  onAddShift: () => void
  onRemoveShift: (shiftIdx: number) => void
}

function DayRow({
  day,
  dayLabel,
  onToggle,
  onTimeChange,
  onAddShift,
  onRemoveShift,
}: DayRowProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={!day.is_closed} onCheckedChange={onToggle} />
          <Label className="font-medium min-w-20">{dayLabel}</Label>
        </div>
        {!day.is_closed && (
          <Button variant="outline" size="sm" onClick={onAddShift}>
            <Plus className="h-4 w-4 mr-1" />
            Turno
          </Button>
        )}
      </div>

      {day.is_closed ? (
        <p className="text-sm text-muted-foreground pl-12">Cerrado</p>
      ) : (
        <div className="space-y-2 pl-12">
          {day.shifts.map((shift, shiftIdx) => (
            <div
              key={shift.shift_number}
              className="flex items-center gap-3 flex-wrap"
            >
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Desde</Label>
                <Input
                  type="time"
                  value={shift.open_time}
                  onChange={(e) =>
                    onTimeChange(shiftIdx, 'open_time', e.target.value)
                  }
                  className="w-28"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Hasta</Label>
                <Input
                  type="time"
                  value={shift.close_time}
                  onChange={(e) =>
                    onTimeChange(shiftIdx, 'close_time', e.target.value)
                  }
                  className="w-28"
                />
              </div>
              {day.shifts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveShift(shiftIdx)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
