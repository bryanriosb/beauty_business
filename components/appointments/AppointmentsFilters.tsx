'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Check, PlusCircle, FunnelX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppointmentStatus, PaymentStatus } from '@/lib/types/enums'

export interface AppointmentsFiltersState {
  search: string
  status: AppointmentStatus | 'all'
  paymentStatus: PaymentStatus | 'all'
  specialistId: string
}

interface Specialist {
  id: string
  first_name: string
  last_name: string | null
}

interface AppointmentsFiltersProps {
  filters: AppointmentsFiltersState
  onFiltersChange: (filters: AppointmentsFiltersState) => void
  specialists: Specialist[]
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'NO_SHOW', label: 'No asistió' },
]

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'UNPAID', label: 'Sin pagar' },
  { value: 'PARTIAL', label: 'Pago parcial' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'REFUNDED', label: 'Reembolsado' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

interface FacetedFilterProps {
  title: string
  options: { value: string; label: string }[]
  selectedValue: string
  onSelect: (value: string) => void
}

function FacetedFilter({ title, options, selectedValue, onSelect }: FacetedFilterProps) {
  const hasSelection = selectedValue !== 'all'
  const selectedOption = options.find((o) => o.value === selectedValue)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {hasSelection && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selectedOption?.label}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValue === option.value
                return (
                  <CommandItem
                    key={option.value}
                    className={cn(
                      'command-item-hover',
                      isSelected && 'command-item-selected'
                    )}
                    onSelect={() => onSelect(isSelected ? 'all' : option.value)}
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'checkbox-selected'
                          : 'checkbox-unselected [&_svg]:invisible'
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {hasSelection && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onSelect('all')}
                    className="justify-center text-center command-item-hover"
                  >
                    Limpiar
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function AppointmentsFilters({
  filters,
  onFiltersChange,
  specialists,
}: AppointmentsFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search)
  const debouncedSearch = useDebounce(searchValue, 300)

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch })
    }
  }, [debouncedSearch])

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.paymentStatus !== 'all' ||
    filters.specialistId !== 'all'

  const clearFilters = () => {
    setSearchValue('')
    onFiltersChange({
      search: '',
      status: 'all',
      paymentStatus: 'all',
      specialistId: 'all',
    })
  }

  const specialistOptions = specialists.map((s) => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name || ''}`.trim(),
  }))

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar cliente, servicio, teléfono..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-8 w-[200px] lg:w-[280px]"
        />

        <FacetedFilter
          title="Estado"
          options={STATUS_OPTIONS}
          selectedValue={filters.status}
          onSelect={(value) =>
            onFiltersChange({
              ...filters,
              status: value as AppointmentStatus | 'all',
            })
          }
        />

        <FacetedFilter
          title="Pago"
          options={PAYMENT_STATUS_OPTIONS}
          selectedValue={filters.paymentStatus}
          onSelect={(value) =>
            onFiltersChange({
              ...filters,
              paymentStatus: value as PaymentStatus | 'all',
            })
          }
        />

        {specialists.length > 0 && (
          <FacetedFilter
            title="Especialista"
            options={specialistOptions}
            selectedValue={filters.specialistId}
            onSelect={(value) =>
              onFiltersChange({ ...filters, specialistId: value })
            }
          />
        )}

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="h-8 px-2 border-dashed border-destructive"
          >
            <FunnelX className="text-destructive" size={20} />
          </Button>
        )}
      </div>
    </div>
  )
}
