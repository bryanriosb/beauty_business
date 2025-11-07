'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { BusinessAccountMemberInsert } from '@/lib/models/business-account/business-account-member'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'
import { toast } from 'sonner'
import { findUserProfileByEmailAction } from '@/lib/actions/business-account'

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  onMemberInvited: () => void
  currentUserId: string
}

interface InviteMemberForm {
  email: string
  role: 'admin' | 'member'
}

export function InviteMemberModal({
  open,
  onOpenChange,
  accountId,
  onMemberInvited,
  currentUserId,
}: InviteMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteMemberForm>({
    defaultValues: {
      email: '',
      role: 'member',
    },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: InviteMemberForm) => {
    setIsSubmitting(true)
    try {
      // Buscar el usuario por email
      const userResult = await findUserProfileByEmailAction(data.email)

      if (userResult.error || !userResult.data) {
        toast.error(userResult.error || 'Usuario no encontrado con ese email')
        setIsSubmitting(false)
        return
      }

      // Crear la membresía
      const memberData: BusinessAccountMemberInsert = {
        business_account_id: accountId,
        user_profile_id: userResult.data.id,
        role: data.role,
        status: 'active', // Cambiado a 'active' directamente, sin proceso de invitación pendiente
        invited_by: currentUserId,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      }

      const service = new BusinessAccountService()
      const result = await service.addMember(memberData)

      if (result.success) {
        toast.success(`${userResult.data.full_name || data.email} fue agregado a la cuenta`)
        onMemberInvited()
        onOpenChange(false)
        reset()
      } else {
        toast.error(result.error || 'Error al agregar el miembro')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar el miembro')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Miembro</DialogTitle>
          <DialogDescription>
            Envía una invitación para que un usuario se una a esta cuenta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email del Usuario <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: 'Este campo es requerido',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email inválido',
                },
              })}
              placeholder="usuario@ejemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Rol <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value: 'admin' | 'member') => setValue('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Miembro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedRole === 'admin'
                ? 'Los administradores pueden gestionar la cuenta y sus miembros'
                : 'Los miembros tienen acceso básico a la cuenta'}
            </p>
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
