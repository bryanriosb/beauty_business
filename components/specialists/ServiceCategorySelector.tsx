'use client'

import { useMemo, useCallback } from 'react'
import { X, Check } from 'lucide-react'
import { cn, translateCategory } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ServiceCategory } from '@/lib/models/service/service'

interface ServiceCategorySelectorProps {
  categories: ServiceCategory[]
  selectedCategoryIds: string[]
  onChange: (categoryIds: string[]) => void
  disabled?: boolean
}

export function ServiceCategorySelector({
  categories,
  selectedCategoryIds,
  onChange,
  disabled = false,
}: ServiceCategorySelectorProps) {
  const selectedSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds]
  )

  const handleToggle = useCallback(
    (categoryId: string) => {
      if (disabled) return
      const newIds = selectedSet.has(categoryId)
        ? selectedCategoryIds.filter((id) => id !== categoryId)
        : [...selectedCategoryIds, categoryId]
      onChange(newIds)
    },
    [disabled, selectedSet, selectedCategoryIds, onChange]
  )

  const handleRemove = useCallback(
    (categoryId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(selectedCategoryIds.filter((id) => id !== categoryId))
    },
    [selectedCategoryIds, onChange]
  )

  const selectedCategories = useMemo(() => {
    return categories.filter((c) => selectedSet.has(c.id))
  }, [categories, selectedSet])

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay categorías de servicio disponibles
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const isSelected = selectedSet.has(category.id)
          const displayName = translateCategory(category.name)
          return (
            <button
              key={category.id}
              type="button"
              disabled={disabled}
              onClick={() => handleToggle(category.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2 text-left transition-colors',
                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
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
              <span className="text-sm flex-1">{displayName}</span>
            </button>
          )
        })}
      </div>

      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map((category) => (
            <Badge key={category.id} variant="secondary" className="pr-1">
              {translateCategory(category.name)}
              <button
                type="button"
                onClick={(e) => handleRemove(category.id, e)}
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
          Selecciona las categorías de servicio que este especialista puede realizar
        </p>
      )}
    </div>
  )
}
