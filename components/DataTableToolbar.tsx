'use client'

import { Table } from '@tanstack/react-table'
import { FunnelX } from 'lucide-react'
import { Input } from './ui/input'
import { DataTableFacetedFilter } from './DataTableFacetedFilter'
import { Button } from './ui/button'
import { DataTableViewOptions } from './DataTableViewOptions'
import React, { useState, useEffect, useCallback } from 'react'

interface FilterConfig {
  column: string
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

interface SearchConfig {
  column: string
  placeholder: string
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  filters?: FilterConfig[]
  searchConfig?: SearchConfig
}

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function DataTableToolbar<TData>({
  table,
  filters,
  searchConfig,
}: DataTableToolbarProps<TData>) {
  // Obtener el valor actual del filtro de la tabla
  const currentFilterValue = searchConfig
    ? (table.getColumn(searchConfig.column)?.getFilterValue() as string) ?? ''
    : ''

  const [searchValue, setSearchValue] = useState(currentFilterValue)
  const debouncedSearchValue = useDebounce(searchValue, 300) // 300ms debounce
  const isFiltered =
    table.getState().columnFilters.length > 0 || searchValue.length > 0

  // Aplicar el filtro cuando el valor debounced cambie
  useEffect(() => {
    if (searchConfig) {
      const column = table.getColumn(searchConfig.column)
      if (column) {
        column.setFilterValue(debouncedSearchValue || undefined)
      }
    }
  }, [debouncedSearchValue, searchConfig, table])

  // Sincronizar el estado local con el filtro de la tabla cuando cambie externamente
  useEffect(() => {
    setSearchValue(currentFilterValue)
  }, [currentFilterValue])

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchConfig && (
          <Input
            placeholder={searchConfig.placeholder}
            value={searchValue}
            onChange={(event) => {
              const newValue = event.target.value
              setSearchValue(newValue)
              // El filtro se aplicará automáticamente con debounce
            }}
            className="h-8 w-[200px] lg:w-[250px]"
          />
        )}

        {filters?.map((filter) => {
          const column = table.getColumn(filter.column)
          return column ? (
            <DataTableFacetedFilter
              key={filter.column}
              column={column}
              title={filter.title}
              options={filter.options}
            />
          ) : null
        })}

        {isFiltered && (
          <Button
            variant="outline"
            onClick={() => {
              console.log('Resetting all filters')
              table.resetColumnFilters()
              setSearchValue('')
              // También limpiar específicamente el filtro de búsqueda
              if (searchConfig) {
                const column = table.getColumn(searchConfig.column)
                column?.setFilterValue(undefined)
              }
            }}
            className="h-8 px-2 border-dashed border-destructive"
          >
            <FunnelX className="text-destructive" size={20} />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
