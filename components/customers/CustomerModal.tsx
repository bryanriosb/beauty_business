'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  BusinessCustomer,
  BusinessCustomerUpdate,
  CreateCustomerInput,
  CustomerStatus,
  CustomerSource,
} from '@/lib/models/customer/business-customer'
import type { UserGender } from '@/lib/models/user/users-profile'

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

interface CustomerFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  status: CustomerStatus
  source: CustomerSource | ''
  notes: string
  city: string
  state: string
  country: string
  date_of_birth: string
  gender: UserGender | ''
  identification_type: string
  identification_number: string
}

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
]

const getDefaultFormData = (
  customer?: BusinessCustomer | null
): CustomerFormData => ({
  first_name: customer?.first_name || '',
  last_name: customer?.last_name || '',
  email: customer?.email || '',
  phone: customer?.phone?.replace('+57', '') || '',
  status: customer?.status || 'active',
  source: customer?.source || '',
  notes: customer?.notes || '',
  city: 'Cali',
  state: 'Valle del Cauca',
  country: 'CO',
  date_of_birth: '',
  gender: '',
  identification_type: '',
  identification_number: '',
})

export default function CustomerModal({
  businessId,
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerModalProps) {
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>(
    getDefaultFormData(customer)
  )

  const isEditing = !!customer

  useEffect(() => {
    if (open) {
      setFormData(getDefaultFormData(customer))
      setShowOptionalFields(false)
    }
  }, [open, customer])

  const updateField = <K extends keyof CustomerFormData>(
    field: K,
    value: CustomerFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.first_name.trim()) return
    if (!isEditing && !formData.email.trim()) return

    setIsSaving(true)
    try {
      const phoneNumber = formData.phone.trim()
        ? `+57${formData.phone.trim().replace(/\s/g, '')}`
        : undefined

      if (isEditing) {
        const updateData: BusinessCustomerUpdate = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim() || null,
          email: formData.email.trim() || null,
          phone: phoneNumber || null,
          status: formData.status,
          source: formData.source || null,
          notes: formData.notes.trim() || null,
        }
        await onSave(updateData, customer.id)
      } else {
        const createData: CreateCustomerInput = {
          business_id: businessId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim() || undefined,
          email: formData.email.trim(),
          phone: phoneNumber,
          city: formData.city || 'Cali',
          state: formData.state || 'Valle del Cauca',
          country: formData.country || 'CO',
          date_of_birth: formData.date_of_birth || undefined,
          gender: formData.gender || undefined,
          identification_type: formData.identification_type || undefined,
          identification_number: formData.identification_number || undefined,
          source: (formData.source as CustomerSource) || 'walk_in',
          notes: formData.notes.trim() || undefined,
        }
        await onSave(createData)
      }
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const isValid =
    formData.first_name.trim() && (isEditing || formData.email.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                placeholder="Apellido"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Correo electrónico {!isEditing && '*'}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              disabled={isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                +57
              </span>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="315 218 1292"
                className="rounded-l-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  updateField('status', value as CustomerStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Origen</Label>
              <Select
                value={formData.source}
                onValueChange={(value) =>
                  updateField('source', value as CustomerSource)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notas adicionales sobre el cliente..."
              rows={3}
            />
          </div>

          {!isEditing && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Departamento</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
              >
                <span>Datos adicionales (facturación)</span>
                {showOptionalFields ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showOptionalFields && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="identification_type">
                        Tipo de documento
                      </Label>
                      <Select
                        value={formData.identification_type}
                        onValueChange={(value) =>
                          updateField('identification_type', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {IDENTIFICATION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="identification_number">
                        Número de documento
                      </Label>
                      <Input
                        id="identification_number"
                        value={formData.identification_number}
                        onChange={(e) =>
                          updateField('identification_number', e.target.value)
                        }
                        placeholder="123456789"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) =>
                          updateField('date_of_birth', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Género</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) =>
                          updateField('gender', value as UserGender)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !isValid}>
            {isSaving && <Loading className="mr-2 h-4 w-4" />}
            {isSaving
              ? 'Guardando'
              : isEditing
              ? 'Actualizar'
              : 'Crear Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
