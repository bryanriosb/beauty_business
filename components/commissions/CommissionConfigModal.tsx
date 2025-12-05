'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import type { Specialist } from '@/lib/models/specialist/specialist'
import {
  COMMISSION_TYPE_LABELS,
  COMMISSION_BASIS_LABELS,
  type CommissionType,
  type CommissionBasis,
  type CommissionConfigWithSpecialist,
  type CommissionConfigInsert,
  type CommissionConfigUpdate,
} from '@/lib/models/commission'
import { NumericInput } from '../ui/numeric-input'

interface CommissionConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: CommissionConfigWithSpecialist | null
  businessId: string
  onSave: (
    data: CommissionConfigInsert | CommissionConfigUpdate,
    isEdit: boolean
  ) => Promise<void>
}

interface FormValues {
  name: string
  commission_type: CommissionType
  commission_value: number
  commission_basis: CommissionBasis
  specialist_id: string
  is_default: boolean
  is_active: boolean
}

export function CommissionConfigModal({
  open,
  onOpenChange,
  config,
  businessId,
  onSave,
}: CommissionConfigModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const specialistService = useMemo(() => new SpecialistService(), [])

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      commission_type: 'percentage',
      commission_value: 0,
      commission_basis: 'service_total',
      specialist_id: '_all',
      is_default: false,
      is_active: true,
    },
  })

  const isEdit = !!config

  useEffect(() => {
    if (open && businessId) {
      specialistService
        .fetchItems({ business_id: businessId, page_size: 100 })
        .then((result) => setSpecialists(result.data))
    }
  }, [open, businessId, specialistService])

  useEffect(() => {
    if (open) {
      if (config) {
        form.reset({
          name: config.name,
          commission_type: config.commission_type,
          commission_value: config.commission_value,
          commission_basis: config.commission_basis,
          specialist_id: config.specialist_id || '_all',
          is_default: config.is_default,
          is_active: config.is_active,
        })
      } else {
        form.reset({
          name: '',
          commission_type: 'percentage',
          commission_value: 0,
          commission_basis: 'service_total',
          specialist_id: '_all',
          is_default: false,
          is_active: true,
        })
      }
    }
  }, [open, config, form])

  const handleSubmit = async (values: FormValues) => {
    setIsSaving(true)
    try {
      const data = {
        ...values,
        business_id: businessId,
        specialist_id:
          values.specialist_id === '_all' ? null : values.specialist_id,
      }
      await onSave(data, isEdit)
    } finally {
      setIsSaving(false)
    }
  }

  const commissionType = form.watch('commission_type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Configuración' : 'Nueva Configuración'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'El nombre es requerido' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Comisión estándar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commission_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(COMMISSION_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commission_value"
                rules={{
                  required: 'El valor es requerido',
                  min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                  max:
                    commissionType === 'percentage'
                      ? { value: 100, message: 'Máximo 100%' }
                      : undefined,
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor {commissionType === 'percentage' ? '(%)' : '($)'}
                    </FormLabel>
                    <FormControl>
                      <NumericInput
                        step={commissionType === 'percentage' ? '0.1' : '1'}
                        min={0}
                        max={commissionType === 'percentage' ? 100 : undefined}
                        {...field}
                      />
                      {/* <Input
                        type="number"
                        step={commissionType === 'percentage' ? '0.1' : '1'}
                        min={0}
                        max={commissionType === 'percentage' ? 100 : undefined}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      /> */}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="commission_basis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base de Cálculo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(COMMISSION_BASIS_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Define sobre qué monto se calcula la comisión
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialist_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialista (Opcional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Aplica a todos los especialistas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_all">
                        Todos los especialistas
                      </SelectItem>
                      {specialists.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Si seleccionas un especialista, esta configuración solo
                    aplica para él
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Por defecto</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Activa</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
