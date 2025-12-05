'use client'

import { Badge } from '@/components/ui/badge'
import {
  COMMISSION_STATUS_LABELS,
  type CommissionStatus,
} from '@/lib/models/commission'

interface CommissionStatusBadgeProps {
  status: CommissionStatus
}

export function CommissionStatusBadge({ status }: CommissionStatusBadgeProps) {
  const variants: Record<CommissionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    pending: 'secondary',
    approved: 'default',
    paid: 'outline',
    cancelled: 'destructive',
  }

  return (
    <Badge variant={variants[status]}>
      {COMMISSION_STATUS_LABELS[status]}
    </Badge>
  )
}
