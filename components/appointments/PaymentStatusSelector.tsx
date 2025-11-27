'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PaymentStatus } from '@/lib/types/enums'

interface PaymentStatusOption {
  value: PaymentStatus
  label: string
  bgColor: string
  textColor: string
}

const PAYMENT_STATUS_OPTIONS: PaymentStatusOption[] = [
  {
    value: 'UNPAID',
    label: 'Sin Pagar',
    bgColor: 'bg-[#fecaca]',
    textColor: 'text-[#7f1d1d]',
  },
  {
    value: 'PARTIAL',
    label: 'Abonado',
    bgColor: 'bg-[#fde68a]',
    textColor: 'text-[#78350f]',
  },
  {
    value: 'PAID',
    label: 'Pagado',
    bgColor: 'bg-[#86efac]',
    textColor: 'text-[#14532d]',
  },
  {
    value: 'REFUNDED',
    label: 'Reembolsado',
    bgColor: 'bg-[#e2e8f0]',
    textColor: 'text-[#475569]',
  },
]

interface PaymentStatusSelectorProps {
  value: PaymentStatus
  onChange: (status: PaymentStatus) => void
  disabled?: boolean
  size?: 'sm' | 'default'
}

export default function PaymentStatusSelector({
  value,
  onChange,
  disabled = false,
  size = 'default',
}: PaymentStatusSelectorProps) {
  const currentOption =
    PAYMENT_STATUS_OPTIONS.find((opt) => opt.value === value) ||
    PAYMENT_STATUS_OPTIONS[0]

  const isSmall = size === 'sm'

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as PaymentStatus)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'w-auto border-0 font-medium',
          isSmall
            ? 'min-w-[90px] text-xs !h-7 px-2.5'
            : 'min-w-[120px] text-sm !h-8',
          currentOption.bgColor,
          currentOption.textColor
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_STATUS_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', option.bgColor)} />
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
