'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Loading from '@/components/ui/loading'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  searchBusinessCustomersAction,
  getRecentBusinessCustomersAction,
} from '@/lib/actions/business-customer'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'

interface CustomerSearchSelectProps {
  businessId: string
  value: BusinessCustomer | null
  onChange: (customer: BusinessCustomer | null) => void
  disabled?: boolean
}

export default function CustomerSearchSelect({
  businessId,
  value,
  onChange,
  disabled = false,
}: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<BusinessCustomer[]>([])
  const [recentCustomers, setRecentCustomers] = useState<BusinessCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)
  const recentLoaded = useRef(false)

  const loadRecentCustomers = useCallback(async () => {
    if (recentLoaded.current || !businessId) return

    setLoadingRecent(true)
    try {
      const results = await getRecentBusinessCustomersAction(businessId, 10)
      setRecentCustomers(results)
      recentLoaded.current = true
    } catch (error) {
      console.error('Error loading recent customers:', error)
    } finally {
      setLoadingRecent(false)
    }
  }, [businessId])

  useEffect(() => {
    if (open && !recentLoaded.current) {
      loadRecentCustomers()
    }
  }, [open, loadRecentCustomers])

  const searchCustomers = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setCustomers([])
        return
      }

      setLoading(true)
      try {
        const results = await searchBusinessCustomersAction(businessId, query, 10)
        setCustomers(results)
      } catch (error) {
        console.error('Error searching customers:', error)
        setCustomers([])
      } finally {
        setLoading(false)
      }
    },
    [businessId]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, searchCustomers])

  const displayedCustomers = search.length >= 2 ? customers : recentCustomers
  const isSearching = search.length >= 2

  const handleSelect = (customer: BusinessCustomer) => {
    onChange(customer)
    setOpen(false)
    setSearch('')
  }

  const displayValue = value
    ? `${value.first_name} ${value.last_name || ''}`.trim()
    : 'Seleccionar paciente...'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading || loadingRecent ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <Loading className="h-5 w-5" />
                <span className="text-sm text-muted-foreground">
                  {loading ? 'Buscando...' : 'Cargando pacientes...'}
                </span>
              </div>
            ) : displayedCustomers.length === 0 ? (
              isSearching ? (
                <CommandEmpty>No se encontraron pacientes</CommandEmpty>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No hay pacientes registrados
                </div>
              )
            ) : (
              <CommandGroup heading={isSearching ? 'Resultados' : 'Pacientes recientes'}>
                {displayedCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelect(customer)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value?.id === customer.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {customer.email || customer.phone || 'Sin contacto'}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
