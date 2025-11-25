'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import type { BusinessSpecialHours } from '@/lib/models/business/business-hours'

const formSchema = z
  .object({
    special_date: z.string().min(1, 'La fecha es requerida'),
    reason: z.string().optional(),
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.is_closed) {
        return data.open_time && data.close_time
      }
      return true
    },
    {
      message: 'Los horarios son requeridos si el día no está cerrado',
      path: ['open_time'],
    }
  )

type FormValues = z.infer<typeof formSchema>

interface SpecialHoursModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specialHour?: BusinessSpecialHours | null
  onSave: (data: FormValues) => Promise<void>
}

export function SpecialHoursModal({
  open,
  onOpenChange,
  specialHour,
  onSave,
}: SpecialHoursModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!specialHour

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      special_date: '',
      reason: '',
      is_closed: false,
      open_time: '09:00',
      close_time: '18:00',
    },
  })

  const isClosed = form.watch('is_closed')

  useEffect(() => {
    if (open) {
      if (specialHour) {
        form.reset({
          special_date: specialHour.special_date,
          reason: specialHour.reason || '',
          is_closed: specialHour.is_closed,
          open_time: specialHour.open_time || '09:00',
          close_time: specialHour.close_time || '18:00',
        })
      } else {
        form.reset({
          special_date: '',
          reason: '',
          is_closed: false,
          open_time: '09:00',
          close_time: '18:00',
        })
      }
    }
  }, [open, specialHour, form])

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      await onSave(data)
      onOpenChange(false)
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Horario Especial' : 'Crear Horario Especial'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="special_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Navidad, Feriado..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_closed"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <Label>Cerrado este día</Label>
                </FormItem>
              )}
            />

            {!isClosed && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="open_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Apertura</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="close_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Cierre</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEditing ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
