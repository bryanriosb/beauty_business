'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  company_name: z.string().min(1, 'El nombre de la empresa es requerido'),
  tax_id: z.string().optional().or(z.literal('')),
  legal_name: z.string().optional().or(z.literal('')),
  billing_address: z.string().optional().or(z.literal('')),
  billing_city: z.string().optional().or(z.literal('')),
  billing_state: z.string().optional().or(z.literal('')),
  billing_postal_code: z.string().optional().or(z.literal('')),
  billing_country: z.string().min(1),
  contact_name: z.string().min(1, 'El nombre del contacto es requerido'),
  contact_email: z
    .string()
    .min(1, 'El email es requerido')
    .email({ message: 'Ingresa un correo electrónico válido' }),
  contact_phone: z.string().optional().or(z.literal('')),
  created_by: z.string(),
})

type BusinessAccountFormValues = z.infer<typeof formSchema>

interface BusinessAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: BusinessAccount | null
  onSave: (data: BusinessAccountInsert | BusinessAccountUpdate) => Promise<void>
}

export function BusinessAccountModal({
  open,
  onOpenChange,
  account,
  onSave,
}: BusinessAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!account

  const form = useForm<BusinessAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: '',
      tax_id: '',
      legal_name: '',
      billing_address: '',
      billing_city: '',
      billing_state: '',
      billing_postal_code: '',
      billing_country: 'CO',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      created_by: '',
    },
  })

  useEffect(() => {
    if (account) {
      form.reset({
        company_name: account.company_name,
        tax_id: account.tax_id || '',
        legal_name: account.legal_name || '',
        billing_address: account.billing_address || '',
        billing_city: account.billing_city || '',
        billing_state: account.billing_state || '',
        billing_postal_code: account.billing_postal_code || '',
        billing_country: account.billing_country,
        contact_name: account.contact_name,
        contact_email: account.contact_email,
        contact_phone: account.contact_phone || '',
        created_by: account.created_by,
      })
    } else {
      form.reset({
        company_name: '',
        tax_id: '',
        legal_name: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_postal_code: '',
        billing_country: 'CO',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        created_by: '',
      })
    }
  }, [account, form])

  const onSubmit = async (data: BusinessAccountFormValues) => {
    setIsSubmitting(true)
    try {
      await onSave(data)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving account:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Cuenta de Negocio' : 'Crear Cuenta de Negocio'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información de la cuenta'
              : 'Ingresa los datos de la nueva cuenta de negocio'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información de la Empresa */}
            <div className="space-y-4">
              <h3 className="font-bold">Información de la Empresa</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre de la Empresa{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Salón de Belleza XYZ"
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
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIT</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="900123456-7"
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
                name="legal_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón Social</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Salón de Belleza XYZ S.A.S"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4">
              <h3 className="font-bold">Información de Contacto</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre del Contacto{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Juan Pérez"
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
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email de Contacto{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contacto@ejemplo.com"
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
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de Contacto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+57 300 123 4567"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información de Facturación */}
            <div className="space-y-4">
              <h3 className="font-bold">Información de Facturación</h3>

              <FormField
                control={form.control}
                name="billing_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección de Facturación</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Calle 123 #45-67"
                        rows={2}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="billing_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bogotá"
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
                  name="billing_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cundinamarca"
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
                  name="billing_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="110111"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? 'Actualizar' : 'Crear'} Cuenta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
