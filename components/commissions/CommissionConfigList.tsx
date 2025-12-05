'use client'

import { Settings2, Pencil, Trash2, Star, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  COMMISSION_TYPE_LABELS,
  COMMISSION_BASIS_LABELS,
  type CommissionConfigWithSpecialist,
} from '@/lib/models/commission'
import { formatCurrency } from '@/lib/utils'

interface CommissionConfigListProps {
  configs: CommissionConfigWithSpecialist[]
  isLoading: boolean
  onEdit: (config: CommissionConfigWithSpecialist) => void
  onDelete: (id: string) => void
}

export function CommissionConfigList({
  configs,
  isLoading,
  onEdit,
  onDelete,
}: CommissionConfigListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[180px] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Settings2 className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No hay configuraciones de comisión</p>
        <p className="text-sm text-muted-foreground mt-1">
          Crea una configuración para empezar a calcular comisiones
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {configs.map((config) => (
        <CommissionConfigCard
          key={config.id}
          config={config}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

interface CommissionConfigCardProps {
  config: CommissionConfigWithSpecialist
  onEdit: (config: CommissionConfigWithSpecialist) => void
  onDelete: (id: string) => void
}

function CommissionConfigCard({ config, onEdit, onDelete }: CommissionConfigCardProps) {
  const commissionDisplay =
    config.commission_type === 'percentage'
      ? `${config.commission_value}%`
      : formatCurrency(config.commission_value)

  const specialistName = config.specialist
    ? `${config.specialist.first_name} ${config.specialist.last_name || ''}`.trim()
    : null

  return (
    <Card className={!config.is_active ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{config.name}</h3>
              {config.is_default && (
                <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            {!config.is_active && (
              <Badge variant="secondary" className="mt-1">
                Inactiva
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(config)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(config.id)}
              disabled={config.is_default}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Comisión</span>
            <span className="text-lg font-bold text-primary">{commissionDisplay}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tipo</span>
            <span>{COMMISSION_TYPE_LABELS[config.commission_type]}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base de cálculo</span>
            <span>{COMMISSION_BASIS_LABELS[config.commission_basis]}</span>
          </div>

          <div className="pt-2 border-t">
            {config.specialist ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={config.specialist.profile_picture_url || undefined} />
                  <AvatarFallback>
                    {config.specialist.first_name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{specialistName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm">Aplica a todos</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
