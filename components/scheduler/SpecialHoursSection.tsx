'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { SpecialHoursModal } from './SpecialHoursModal'
import { Loader2, Plus, MoreHorizontal, Pencil, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessSpecialHours } from '@/lib/models/business/business-hours'
import {
  fetchBusinessSpecialHoursAction,
  createBusinessSpecialHoursAction,
  updateBusinessSpecialHoursAction,
  deleteBusinessSpecialHoursAction,
} from '@/lib/actions/business-hours'
import { format, parseISO, isPast } from 'date-fns'
import { es } from 'date-fns/locale'

interface SpecialHoursSectionProps {
  businessId: string | null
}

export function SpecialHoursSection({ businessId }: SpecialHoursSectionProps) {
  const [specialHours, setSpecialHours] = useState<BusinessSpecialHours[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<BusinessSpecialHours | null>(null)
  const [toDelete, setToDelete] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const data = await fetchBusinessSpecialHoursAction(businessId)
    setSpecialHours(data)
    setIsLoading(false)
  }, [businessId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = () => {
    setSelected(null)
    setModalOpen(true)
  }

  const handleEdit = (item: BusinessSpecialHours) => {
    setSelected(item)
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return

    const result = await deleteBusinessSpecialHoursAction(toDelete)
    if (result.success) {
      toast.success('Horario especial eliminado')
      loadData()
    } else {
      toast.error(result.error || 'Error al eliminar')
    }

    setDeleteDialogOpen(false)
    setToDelete(null)
  }

  const handleSave = async (data: {
    special_date: string
    reason?: string
    is_closed: boolean
    open_time?: string
    close_time?: string
  }) => {
    if (!businessId) {
      toast.error('No hay sucursal seleccionada')
      return
    }

    if (selected) {
      const result = await updateBusinessSpecialHoursAction(selected.id, {
        special_date: data.special_date,
        reason: data.reason || null,
        is_closed: data.is_closed,
        open_time: data.is_closed ? null : data.open_time,
        close_time: data.is_closed ? null : data.close_time,
      })

      if (result.success) {
        toast.success('Horario especial actualizado')
        loadData()
      } else {
        toast.error(result.error || 'Error al actualizar')
        throw new Error(result.error)
      }
    } else {
      const result = await createBusinessSpecialHoursAction({
        business_id: businessId,
        special_date: data.special_date,
        reason: data.reason || null,
        is_closed: data.is_closed,
        open_time: data.is_closed ? null : data.open_time,
        close_time: data.is_closed ? null : data.close_time,
      })

      if (result.success) {
        toast.success('Horario especial creado')
        loadData()
      } else {
        toast.error(result.error || 'Error al crear')
        throw new Error(result.error)
      }
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEEE d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return dateStr
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    return time.substring(0, 5)
  }

  if (!businessId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecciona una sucursal para configurar horarios especiales
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Horarios Especiales</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {specialHours.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay horarios especiales configurados</p>
              <p className="text-sm">Agrega feriados o días con horarios diferentes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {specialHours.map((item) => {
                const past = isPast(parseISO(item.special_date))
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      past ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">
                          {formatDate(item.special_date)}
                        </span>
                        {item.is_closed ? (
                          <Badge variant="destructive">Cerrado</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {formatTime(item.open_time)} - {formatTime(item.close_time)}
                          </Badge>
                        )}
                        {past && <Badge variant="outline">Pasado</Badge>}
                      </div>
                      {item.reason && (
                        <p className="text-sm text-muted-foreground">{item.reason}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SpecialHoursModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        specialHour={selected}
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="horario especial"
      />
    </>
  )
}
