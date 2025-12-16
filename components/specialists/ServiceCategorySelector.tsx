'use client'

import { useMemo, useCallback, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import type { ServiceCategory } from '@/lib/models/service/service'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'

interface ServiceCategorySelectorProps {
  categories: ServiceCategory[]
  selectedCategoryIds: string[]
  onChange: (categoryIds: string[]) => void
  disabled?: boolean
  className?: string
}

export function ServiceCategorySelector({
  categories,
  selectedCategoryIds,
  onChange,
  disabled = false,
  className,
}: ServiceCategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds]
  )

  const filteredCategories = useMemo(() => {
    if (!search) return categories
    const searchLower = search.toLowerCase()
    return categories.filter((opt) => {
      return opt.name.toLowerCase().includes(searchLower)
    })
  }, [categories, search])

  const selectedCategories = useMemo(() => {
    return categories.filter((c) => selectedSet.has(c.id))
  }, [categories, selectedSet])

  const handleSelect = useCallback(
    (categoryIds: string[]) => {
      onChange(categoryIds)
    },
    [onChange]
  )

  const handleRemove = useCallback(
    (categoryId: string) => {
      const newIds = selectedCategoryIds.filter((id) => id !== categoryId)
      onChange(newIds)
    },
    [selectedCategoryIds, onChange]
  )

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay categorías de servicio disponibles
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Combobox de selección múltiple */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between font-normal', className)}
            data-tutorial="specialist-category-select"
            disabled={disabled}
          >
            {selectedCategories.length > 0
              ? `${selectedCategories.length} seleccionados`
              : 'Seleccionar categorías'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-h-48 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No se encontraron resultados</CommandEmpty>

              <CommandGroup>
                {filteredCategories.map((category) => {
                  const isSelected = selectedSet.has(category.id)
                  return (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => {
                        if (isSelected) {
                          // Deseleccionar
                          handleRemove(category.id)
                        } else {
                          // Seleccionar
                          handleSelect([...selectedCategoryIds, category.id])
                        }
                      }}
                      disabled={disabled}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="flex-1">{category.name}</span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Badges de categorías seleccionadas */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <Badge
              key={category.id}
              variant="secondary"
              className="pr-1 py-1 text-xs"
            >
              {category.name}
              <button
                type="button"
                onClick={() => handleRemove(category.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {selectedCategoryIds.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Selecciona las categorías de servicio que este especialista puede
          realizar
        </p>
      )}
    </div>
  )
}
