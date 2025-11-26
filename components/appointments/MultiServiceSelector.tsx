'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, X, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import type { Service } from '@/lib/models/service/service'

export interface SelectedService {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
}

interface MultiServiceSelectorProps {
  services: Service[]
  selectedServices: SelectedService[]
  onChange: (services: SelectedService[]) => void
  disabled?: boolean
  isLoading?: boolean
}

export function MultiServiceSelector({
  services,
  selectedServices,
  onChange,
  disabled = false,
  isLoading = false,
}: MultiServiceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredServices = useMemo(() => {
    if (!search) return services
    const searchLower = search.toLowerCase()
    return services.filter((service) =>
      service.name.toLowerCase().includes(searchLower)
    )
  }, [services, search])

  const selectedIds = useMemo(
    () => new Set(selectedServices.map((s) => s.id)),
    [selectedServices]
  )

  const totals = useMemo(() => {
    return selectedServices.reduce(
      (acc, service) => ({
        duration: acc.duration + service.duration_minutes,
        price: acc.price + service.price_cents,
      }),
      { duration: 0, price: 0 }
    )
  }, [selectedServices])

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const handleSelect = (service: Service) => {
    if (selectedIds.has(service.id)) {
      onChange(selectedServices.filter((s) => s.id !== service.id))
    } else {
      onChange([
        ...selectedServices,
        {
          id: service.id,
          name: service.name,
          price_cents: service.price_cents,
          duration_minutes: service.duration_minutes,
        },
      ])
    }
  }

  const handleRemove = (serviceId: string) => {
    onChange(selectedServices.filter((s) => s.id !== serviceId))
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              selectedServices.length === 0 && 'text-muted-foreground'
            )}
            disabled={disabled || isLoading}
          >
            {isLoading
              ? 'Cargando servicios...'
              : selectedServices.length > 0
              ? `${selectedServices.length} servicio${selectedServices.length > 1 ? 's' : ''} seleccionado${selectedServices.length > 1 ? 's' : ''}`
              : 'Seleccionar servicios...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar servicio..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No se encontraron servicios</CommandEmpty>
              <CommandGroup>
                {filteredServices.map((service) => {
                  const isSelected = selectedIds.has(service.id)
                  return (
                    <CommandItem
                      key={service.id}
                      value={service.id}
                      onSelect={() => handleSelect(service)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <span className={cn(isSelected && 'font-medium')}>
                          {service.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {service.duration_minutes} min • {formatPrice(service.price_cents)}
                        </span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedServices.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedServices.map((service) => (
              <Badge
                key={service.id}
                variant="secondary"
                className="pr-1 text-sm"
              >
                {service.name}
                <button
                  type="button"
                  onClick={() => handleRemove(service.id)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Total: {totals.duration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>{formatPrice(totals.price)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
