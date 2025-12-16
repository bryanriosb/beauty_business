'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'
import BusinessCustomerService from '@/lib/services/customer/business-customer-service'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import type { UserGender } from '@/lib/models/user/users-profile'
import PhoneInput from 'react-phone-number-input'

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

interface CustomerFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
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

const DEFAULT_FORM_DATA: CustomerFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  city: 'Cali',
  state: 'Valle del Cauca',
  country: 'CO',
  date_of_birth: '',
  gender: '',
  identification_type: '',
  identification_number: '',
}

export default function CreateCustomerDialog({
  businessId,
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomerDialogProps) {
  const [showOptionalFields, setShowOptionalFields] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>(DEFAULT_FORM_DATA)

  const customerService = new BusinessCustomerService()

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA)
    setShowOptionalFields(false)
  }

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) resetForm()
  }

  const updateField = <K extends keyof CustomerFormData>(
    field: K,
    value: CustomerFormData[K]
  ) => {
    console.log(`🔄 Update ${field}:`, value, 'prev:', formData[field])
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.first_name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!formData.email.trim()) {
      toast.error('El correo electrónico es requerido')
      return
    }

    setIsCreating(true)
    try {
      const result = await customerService.createFullCustomer({
        business_id: businessId,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city || 'Cali',
        state: formData.state || 'Valle del Cauca',
        country: formData.country || 'CO',
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        identification_type: formData.identification_type || undefined,
        identification_number: formData.identification_number || undefined,
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
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombres *</Label>
              <Input
                id="first_name"
                data-tutorial="customer-first-name"
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos *</Label>
              <Input
                id="last_name"
                data-tutorial="customer-last-name"
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                placeholder="Apellido"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico *</Label>
            <Input
              id="email"
              data-tutorial="customer-email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <div className="flex">
              <PhoneInput
                defaultCountry="CO"
                international
                countryCallingCodeEditable={false}
                placeholder="300 123 4567"
                limitMaxLength={true}
                value={formData.phone}
                onChange={(e) => updateField('phone', e?.toString() ?? '')}
                data-tutorial="customer-phone"
                className="phone-input"
              />
            </div>
          </div>

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
                  <Label htmlFor="identification_type">Tipo de documento</Label>
                  <Select
                    value={formData.identification_type}
                    onValueChange={(value) =>
                      updateField('identification_type', value)
                    }
                  >
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            data-tutorial="customer-create-button"
            onClick={handleSubmit}
            disabled={
              isCreating ||
              !formData.first_name.trim() ||
              !formData.email.trim()
            }
          >
            {isCreating && <Loading className="mr-2 h-4 w-4" />}
            {isCreating ? 'Creando' : 'Crear Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
