'use client'

import { useState } from 'react'
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
import { StateComboBox } from '@/components/ui/state-combobox'
import { CityComboBox } from '@/components/ui/city-combobox'
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
import { toast } from 'sonner'
import BusinessCustomerService from '@/lib/services/customer/business-customer-service'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import PhoneInput from 'react-phone-number-input'
import Loading from '../ui/loading'

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

const formSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().optional(),
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'El correo electrónico es requerido'),
  phone: z.string().optional(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  identification_type: z.string().optional(),
  identification_number: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof formSchema>

interface CreateCustomerDialogProps {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (
    customer: BusinessCustomer,
    userProfileId: string,
    isNew: boolean
  ) => void
}

export function CreateCustomerDialog({
  businessId,
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      city: 'Cali',
      state: 'Valle del Cauca',
      country: 'CO',
      date_of_birth: '',
      identification_type: '',
      identification_number: '',
    },
  })

  const customerService = new BusinessCustomerService()

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      form.reset()
      setShowOptionalFields(false)
    }
  }

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await customerService.createFullCustomer({
        business_id: businessId,
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || undefined,
        email: data.email.trim(),
        phone: data.phone?.trim() || '',
        city: data.city || 'Cali',
        state: data.state || 'Valle del Cauca',
        country: data.country || 'CO',
        date_of_birth: data.date_of_birth || undefined,
        gender: data.gender || undefined,
        identification_type: data.identification_type || undefined,
        identification_number: data.identification_number || undefined,
        source: 'walk_in',
      })

      if (result.success && result.data && result.userProfileId) {
        if (result.isNew) {
          toast.success('Cliente creado exitosamente')
        } else {
          toast.info('Cliente existente encontrado')
        }
        onSuccess?.(result.data, result.userProfileId, result.isNew ?? false)
        handleOpenChange(false)
      } else {
        toast.error(result.error || 'Error al crear el cliente')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Error al crear el cliente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo cliente para registrarlo en el sistema
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
                          Nombres <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="María"
                            disabled={isSubmitting}
                            data-tutorial="customer-first-name"
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
                        <FormLabel>Apellidos</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="García"
                            disabled={isSubmitting}
                            data-tutorial="customer-last-name"
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
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="maria@ejemplo.com"
                          disabled={isSubmitting}
                          data-tutorial="customer-email"
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
                          data-tutorial="customer-phone"
                          className="phone-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl>
                          <StateComboBox
                            value={field.value}
                            onChange={(value, selectedState) => {
                              field.onChange(value)
                              // Reset city when state changes
                              form.setValue('city', '')
                            }}
                            disabled={isSubmitting}
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <CityComboBox
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> */}
                </div>

                <Collapsible
                  open={showOptionalFields}
                  onOpenChange={setShowOptionalFields}
                >
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
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
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
                                field.onChange(
                                  value as
                                    | 'FEMALE'
                                    | 'MALE'
                                    | 'OTHER'
                                    | 'PREFER_NOT_TO_SAY'
                                )
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
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
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
              </div>

              <DialogFooter className="shrink-0 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-tutorial="customer-create-button"
                >
                  {isSubmitting && <Loading />}
                  {isSubmitting ? 'Creando' : 'Crear Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
