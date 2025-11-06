'use client'

import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from '@tanstack/react-table'

// Extender tipos de TanStack Table
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    hidden?: boolean
  }
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import DataTablePagination from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import Loading from './ui/loading'

export interface FilterConfig {
  column: string
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export interface SearchConfig {
  column: string
  placeholder: string
  serverField?: string // Campo que se enviará al servidor
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  service?: {
    fetchItems: (params: any) => Promise<any>
  }
  defaultQueryParams?: Record<string, any>
  filters?: FilterConfig[]
  searchConfig?: SearchConfig
  data?: TData[]
  pagination?: {
    pageIndex: number
    pageSize: number
    pageCount: number
    total: number
  }
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onFiltersChange?: (filters: Record<string, any>) => void
  filterState?: any[]
}

export interface DataTableRef {
  refreshData: () => void
}

export const DataTable = forwardRef<DataTableRef, DataTableProps<any, any>>(function DataTable<TData, TValue>({
  columns,
  service,
  defaultQueryParams = {},
  filters,
  searchConfig,
  data: externalData,
  pagination: externalPagination,
  onPageChange: externalOnPageChange,
  onPageSizeChange: externalOnPageSizeChange,
  onFiltersChange: externalOnFiltersChange,
  filterState: externalFilterState,
}: DataTableProps<TData, TValue>, ref: React.Ref<DataTableRef>) {
  // Determinar si usar estado interno o externo
  const isAutonomous = !!service

  // Estado interno para manejo autónomo
  const [internalData, setInternalData] = useState<TData[]>([])
  const [internalPagination, setInternalPagination] = useState({
    pageIndex: 0,
    pageSize: 7,
    pageCount: 0,
    total: 0,
  })
  const [internalFilters, setInternalFilters] = useState<Record<string, any>>({})
  const [internalFilterState, setInternalFilterState] = useState<any[]>([])
  const [loading, setLoading] = useState(isAutonomous) // Iniciar loading si es autónomo
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    // Configurar visibilidad inicial de columnas
    const visibility: Record<string, boolean> = {}
    columns.forEach((column) => {
      if (column.meta?.hidden) {
        // Para columnas con accessorKey
        if ('accessorKey' in column) {
          visibility[column.accessorKey as string] = false
        }
        // Para columnas con id (como las que usan accessorFn)
        else if ('id' in column && column.id) {
          visibility[column.id] = false
        }
      }
    })
    return visibility
  })
  const data = isAutonomous ? internalData : (externalData || [])
  const pagination = isAutonomous ? internalPagination : externalPagination
  const filterState = isAutonomous ? internalFilterState : (externalFilterState || [])

  // Función para fetch de datos
  const fetchData = useCallback(async () => {
    if (!service) return

    setLoading(true)
    try {
      // Convertir filtros a arrays para QueryParser de Fiber v2
      const arrayFilters: Record<string, string[]> = {}
      Object.entries(internalFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          arrayFilters[key] = value
        } else if (value) {
          arrayFilters[key] = [value]
        }
      })

      const baseParams = {
        page: internalPagination.pageIndex + 1,
        page_size: internalPagination.pageSize,
      }

      // Combinar parámetros por defecto con filtros
      let queryParams: Record<string, any> = { ...baseParams, ...defaultQueryParams }

      if (Object.keys(arrayFilters).length > 0) {
        queryParams = { ...queryParams, ...arrayFilters }
      }

      const response = await service.fetchItems(queryParams)

      setInternalData(response.data)
      setInternalPagination(prev => ({
        ...prev,
        pageCount: response.total_pages,
        total: response.total,
      }))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [service, internalPagination.pageIndex, internalPagination.pageSize, internalFilters, defaultQueryParams])

  // Efectos para fetch automático
  useEffect(() => {
    if (isAutonomous) {
      fetchData()
    }
  }, [fetchData, isAutonomous])

  // Exponer función de refresh mediante ref
  useImperativeHandle(ref, () => ({
    refreshData: fetchData
  }), [fetchData])

  // Manejadores internos
  const handlePageChange = useCallback((pageIndex: number) => {
    if (isAutonomous) {
      setInternalPagination(prev => ({ ...prev, pageIndex }))
    } else {
      externalOnPageChange?.(pageIndex)
    }
  }, [isAutonomous, externalOnPageChange])

  const handlePageSizeChange = useCallback((pageSize: number) => {
    if (isAutonomous) {
      setInternalPagination(prev => ({ ...prev, pageIndex: 0, pageSize }))
    } else {
      externalOnPageSizeChange?.(pageSize)
    }
  }, [isAutonomous, externalOnPageSizeChange])

  const handleFiltersChange = useCallback((newFilters: Record<string, any>) => {
    if (isAutonomous) {
      // Mapear nombres de columna a campos del servidor si es necesario
      const mappedFilters: Record<string, any> = {}
      Object.entries(newFilters).forEach(([columnName, value]) => {
        // Si es un filtro de búsqueda, usar el serverField si está definido
        if (searchConfig?.column === columnName && searchConfig.serverField) {
          mappedFilters[searchConfig.serverField] = value
        } else {
          mappedFilters[columnName] = value
        }
      })

      const filtersChanged = JSON.stringify(internalFilters) !== JSON.stringify(mappedFilters)
      if (filtersChanged) {
        setInternalFilters(mappedFilters)

        const newFilterState = Object.entries(newFilters).map(([id, value]) => ({
          id,
          value,
        }))
        setInternalFilterState(newFilterState)

        setInternalPagination(prev => ({ ...prev, pageIndex: 0 }))
      }
    } else {
      externalOnFiltersChange?.(newFilters)
    }
  }, [isAutonomous, internalFilters, externalOnFiltersChange, searchConfig])

  // Configurar el callback de filtros
  const handleColumnFiltersChange = React.useCallback(
    (updaterOrValue: any) => {
      const currentFilters =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(filterState || [])
          : updaterOrValue

      const filterObject: Record<string, any> = {}
      currentFilters.forEach((filter: any) => {
        if (filter.value) {
          // Manejar filtros de array (facetados)
          if (Array.isArray(filter.value) && filter.value.length > 0) {
            filterObject[filter.id] = filter.value
          }
          // Manejar filtros de texto (búsqueda)
          else if (typeof filter.value === 'string' && filter.value.trim().length > 0) {
            filterObject[filter.id] = filter.value.trim()
          }
        }
      })

      handleFiltersChange(filterObject)
    },
    [filterState, handleFiltersChange]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: !!pagination,
    manualFiltering: isAutonomous || !!externalOnFiltersChange,
    pageCount: pagination?.pageCount ?? -1,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      pagination: pagination
        ? {
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }
        : undefined,
      columnFilters: filterState || [],
      columnVisibility,
    },
  })

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        filters={filters}
        searchConfig={searchConfig}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="text-[0.75rem] bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Loading className="w-5 h-5" />
                    <span>Cargando datos...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg
                      className="w-12 h-12 text-muted-foreground/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="font-medium">No hay resultados disponibles</span>
                    <span className="text-sm">Intenta ajustar los filtros de búsqueda</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end">
        <DataTablePagination
          table={table}
          total={pagination?.total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  )
})
