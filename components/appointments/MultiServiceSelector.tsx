'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, X, Clock, DollarSign, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  original_price_cents: number
  duration_minutes: number
  has_custom_price?: boolean
}

interface MultiServiceSelectorProps {
  services: Service[]
  selectedServices: SelectedService[]
  onChange: (services: SelectedService[]) => void
  disabled?: boolean
  isLoading?: boolean
  allowPriceEdit?: boolean
}

export function MultiServiceSelector({
  services,
  selectedServices,
  onChange,
  disabled = false,
  isLoading = false,
  allowPriceEdit = true,
}: MultiServiceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState<number>(0)

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
          original_price_cents: service.price_cents,
          duration_minutes: service.duration_minutes,
          has_custom_price: false,
        },
      ])
    }
  }

  const handlePriceEdit = (serviceId: string) => {
    const service = selectedServices.find((s) => s.id === serviceId)
    if (service) {
      setEditingServiceId(serviceId)
      setEditPrice(service.price_cents / 100)
    }
  }

  const handlePriceChange = (serviceId: string, newPrice: number) => {
    const newPriceCents = Math.round(newPrice * 100)
    const service = selectedServices.find((s) => s.id === serviceId)
    if (!service) return

    onChange(
      selectedServices.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              price_cents: newPriceCents,
              has_custom_price: newPriceCents !== s.original_price_cents,
            }
          : s
      )
    )
    setEditPrice(newPrice)
  }

  const handlePriceSave = () => {
    setEditingServiceId(null)
  }

  const handlePriceReset = (serviceId: string) => {
    onChange(
      selectedServices.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              price_cents: s.original_price_cents,
              has_custom_price: false,
            }
          : s
      )
    )
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
          <div className="space-y-2">
            {selectedServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">
                    {service.name}
                  </span>
                  {service.has_custom_price && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Precio especial
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {editingServiceId === service.id ? (
                    <>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={editPrice}
                        onChange={(e) => handlePriceChange(service.id, Number(e.target.value) || 0)}
                        className="w-28 h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePriceSave()
                          if (e.key === 'Escape') setEditingServiceId(null)
                        }}
                        onBlur={handlePriceSave}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={handlePriceSave}
                      >
                        OK
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          'text-sm',
                          service.has_custom_price && 'text-blue-600 font-medium'
                        )}
                      >
                        {formatPrice(service.price_cents)}
                      </span>
                      {allowPriceEdit && !disabled && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handlePriceEdit(service.id)}
                          title="Editar precio"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {service.has_custom_price && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => handlePriceReset(service.id)}
                          title="Restaurar precio original"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(service.id)}
                    disabled={disabled}
                    title="Quitar servicio"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
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
