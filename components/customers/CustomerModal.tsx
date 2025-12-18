'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type {
  BusinessCustomer,
  BusinessCustomerUpdate,
  CreateCustomerInput,
  CustomerStatus,
  CustomerSource,
} from '@/lib/models/customer/business-customer'
import type { UserGender } from '@/lib/models/user/users-profile'
import PhoneInput from 'react-phone-number-input'

const IDENTIFICATION_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
]

const GENDER_OPTIONS = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiero no decir' },
]

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'vip', label: 'VIP' },
  { value: 'blocked', label: 'Bloqueado' },
]

const SOURCE_OPTIONS: { value: CustomerSource; label: string }[] = [
  { value: 'walk_in', label: 'Presencial' },
  { value: 'referral', label: 'Referido' },
  { value: 'social_media', label: 'Redes sociales' },
  { value: 'website', label: 'Sitio web' },
  { value: 'other', label: 'Otro' },
  { value: 'ai_agent', label: 'Agente IA' },
]

const formSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().optional(),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'vip', 'blocked']).optional(),
  source: z.enum(['walk_in', 'referral', 'social_media', 'website', 'other', 'ai_agent']).optional(),
  notes: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  identification_type: z.string().optional(),
  identification_number: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof formSchema>

interface CustomerModalProps {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: BusinessCustomer | null
  onSave: (
    data: CreateCustomerInput | BusinessCustomerUpdate,
    customerId?: string
  ) => Promise<void>
}

function CustomerModal({
  businessId,
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  const isEditing = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'active',
      source: 'walk_in',
      notes: '',
      city: 'Cali',
      state: 'Valle del Cauca',
      country: 'CO',
      date_of_birth: '',
      gender: undefined,
      identification_type: '',
      identification_number: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (customer) {
        // Normalizar teléfono para PhoneInput (debe tener prefijo +)
        let normalizedPhone = customer.phone || ''
        if (normalizedPhone && !normalizedPhone.startsWith('+')) {
          normalizedPhone = '+' + normalizedPhone
        }

        form.reset({
          first_name: customer.first_name,
          last_name: customer.last_name || '',
          email: customer.email || '',
          phone: normalizedPhone,
          status: customer.status,
          source: customer.source || 'walk_in',
          notes: customer.notes || '',
          city: 'Cali',
          state: 'Valle del Cauca',
          country: 'CO',
          date_of_birth: customer.birthday || '',
          gender: undefined,
          identification_type: '',
          identification_number: '',
        })
      } else {
        form.reset({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          status: 'active',
          source: 'walk_in',
          notes: '',
          city: 'Cali',
          state: 'Valle del Cauca',
          country: 'CO',
          date_of_birth: '',
          gender: undefined,
          identification_type: '',
          identification_number: '',
        })
      }
      setShowOptionalFields(false)
    }
  }, [open, customer, form])

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEditing && customer) {
        const updateData: BusinessCustomerUpdate = {
          first_name: data.first_name.trim(),
          last_name: data.last_name?.trim() || null,
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          status: data.status,
          source: data.source || null,
          notes: data.notes?.trim() || null,
          birthday: data.date_of_birth || null,
          // Los campos de ubicación (city, state, country) van en user_profile
          // Los campos de identificación (gender, identification_type, identification_number) van en user_profile
        }
        await onSave(updateData, customer.id)
      } else {
        const createData: CreateCustomerInput = {
          business_id: businessId,
          first_name: data.first_name.trim(),
          last_name: data.last_name?.trim() || undefined,
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
          city: data.city || 'Cali',
          state: data.state || 'Valle del Cauca',
          country: data.country || 'CO',
          date_of_birth: data.date_of_birth || undefined,
          gender: data.gender || undefined,
          identification_type: data.identification_type || undefined,
          identification_number: data.identification_number || undefined,
          source: data.source,
          notes: data.notes?.trim() || undefined,
        }
        await onSave(createData)
      }
      onOpenChange(false)
    } catch (error: any) {
      const errorMessage = error?.message || 'Error al guardar el cliente'
      console.error('Error saving customer:', error)
      // Aquí podrías mostrar un toast o notificación de error
      // Por ejemplo: toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden"
        // Permitir cierre del modal para evitar trampas de usuario
        // onInteractOutside={(e) => e.preventDefault()}
        // onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la información del cliente'
              : 'Ingresa los datos del nuevo cliente'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col min-h-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nombre <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="María"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="García"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Correo electrónico{' '}
                        {!isEditing && (
                          <span className="text-destructive">*</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="maria@ejemplo.com"
                          disabled={isSubmitting || isEditing}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <PhoneInput
                          defaultCountry="CO"
                          countries={['CO']}
                          international
                          countryCallingCodeEditable={false}
                          countrySelectProps={{ disabled: true }}
                          placeholder="300 123 4567"
                          limitMaxLength={true}
                          value={field.value}
                          onChange={field.onChange}
                          className="phone-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origen</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOURCE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionales sobre el cliente..."
                          rows={3}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isEditing && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                className="bg-muted"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                className="bg-muted"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>País</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                className="bg-muted"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex w-full items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                        >
                          <span className="text-sm font-medium">
                            Datos adicionales (facturación)
                          </span>
                          {showOptionalFields ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="identification_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de documento</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={isSubmitting}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {IDENTIFICATION_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="identification_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Número de documento</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="123456789"
                                    disabled={isSubmitting}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="date_of_birth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fecha de nacimiento</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    disabled={isSubmitting}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Género</FormLabel>
                                <Select
                                  onValueChange={(value) =>
                                    field.onChange(value as 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_TO_SAY')
                                  }
                                  value={field.value}
                                  disabled={isSubmitting}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {GENDER_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </div>

              <DialogFooter className="shrink-0 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting
                    ? 'Guardando'
                    : isEditing
                    ? 'Actualizar'
                    : 'Crear Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { CustomerModal }