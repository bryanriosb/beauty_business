'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { AppointmentStatus } from '@/lib/types/enums'

interface StatusOption {
  value: AppointmentStatus
  label: string
  bgColor: string
  textColor: string
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'PENDING', label: 'Pendiente', bgColor: 'bg-[#fde68a]', textColor: 'text-[#1e293b]' },
  { value: 'CONFIRMED', label: 'Confirmada', bgColor: 'bg-[#a3b4f7]', textColor: 'text-[#1e293b]' },
  { value: 'COMPLETED', label: 'Completada', bgColor: 'bg-[#86efac]', textColor: 'text-[#1e293b]' },
  { value: 'CANCELLED', label: 'Cancelada', bgColor: 'bg-[#e2e8f0]', textColor: 'text-[#475569]' },
  { value: 'NO_SHOW', label: 'No Asistió', bgColor: 'bg-[#c4b5fd]', textColor: 'text-[#1e293b]' },
]

interface StatusSelectorProps {
  value: AppointmentStatus
  onChange: (status: AppointmentStatus) => void
  disabled?: boolean
}

export default function StatusSelector({
  value,
  onChange,
  disabled = false,
}: StatusSelectorProps) {
  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === value) || STATUS_OPTIONS[0]

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as AppointmentStatus)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'w-auto min-w-[140px] border-0 font-medium text-sm h-8',
          currentOption.bgColor,
          currentOption.textColor
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  option.bgColor
                )}
              />
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
