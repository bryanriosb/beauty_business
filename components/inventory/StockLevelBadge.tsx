'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface StockLevelBadgeProps {
  currentStock: number
  minStock: number
  maxStock?: number | null
  unit?: string
  showIcon?: boolean
  className?: string
}

export function StockLevelBadge({
  currentStock,
  minStock,
  maxStock,
  unit = 'und',
  showIcon = true,
  className,
}: StockLevelBadgeProps) {
  const isLow = currentStock <= minStock
  const isOut = currentStock <= 0
  const isOverstock = maxStock && currentStock > maxStock

  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary'
  let Icon = CheckCircle
  let label = `${currentStock} ${unit}`

  if (isOut) {
    variant = 'destructive'
    Icon = XCircle
    label = 'Sin stock'
  } else if (isLow) {
    variant = 'outline'
    Icon = AlertTriangle
    label = `${currentStock} ${unit} (bajo)`
  } else if (isOverstock) {
    variant = 'secondary'
    label = `${currentStock} ${unit} (exceso)`
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        'gap-1',
        isLow && !isOut && 'border-amber-500 text-amber-600 bg-amber-50',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  )
}

interface StockStatusProps {
  currentStock: number
  minStock: number
  unit?: string
}

export function StockStatus({ currentStock, minStock, unit = 'und' }: StockStatusProps) {
  const isLow = currentStock <= minStock
  const isOut = currentStock <= 0

  if (isOut) {
    return (
      <div className="flex items-center gap-1 text-destructive">
        <XCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Sin stock</span>
      </div>
    )
  }

  if (isLow) {
    return (
      <div className="flex items-center gap-1 text-amber-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">
          {currentStock} {unit} <span className="text-xs">(mín: {minStock})</span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <span className="text-sm">
        {currentStock} {unit}
      </span>
    </div>
  )
}
