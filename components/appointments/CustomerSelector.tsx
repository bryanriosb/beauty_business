'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import BusinessCustomerService from '@/lib/services/customer/business-customer-service'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import CreateCustomerDialog from '@/components/customers/CreateCustomerDialog'

interface CustomerSelectorProps {
  businessId: string
  value?: string
  onSelect: (userProfileId: string, customer?: BusinessCustomer) => void
  disabled?: boolean
}

export default function CustomerSelector({
  businessId,
  value,
  onSelect,
  disabled = false,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [customers, setCustomers] = useState<BusinessCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] =
    useState<BusinessCustomer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const customerService = new BusinessCustomerService()

  const loadCustomers = useCallback(
    async (query: string = '') => {
      if (!businessId) return
      setIsLoading(true)
      try {
        if (query) {
          const results = await customerService.search(businessId, query)
          setCustomers(results)
        } else {
          const response = await customerService.fetchItems({
            business_id: businessId,
            page_size: 20,
          })
          setCustomers(response.data)
        }
      } catch (error) {
        console.error('Error loading customers:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [businessId]
  )

  useEffect(() => {
    if (businessId) {
      loadCustomers()
    }
  }, [businessId, loadCustomers])

  useEffect(() => {
    if (value && customers.length > 0) {
      const customer = customers.find((c) => c.user_profile_id === value)
      if (customer) {
        setSelectedCustomer(customer)
      }
    }
  }, [value, customers])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    loadCustomers(query)
  }

  const handleSelectCustomer = (customer: BusinessCustomer) => {
    setSelectedCustomer(customer)
    onSelect(customer.user_profile_id, customer)
    setOpen(false)
  }

  const handleCustomerCreated = (
    customer: BusinessCustomer,
    userProfileId: string
  ) => {
    setSelectedCustomer(customer)
    onSelect(userProfileId, customer)
    setCustomers((prev) => [customer, ...prev])
  }

  const getCustomerDisplayName = (customer: BusinessCustomer) => {
    const name = `${customer.first_name} ${customer.last_name || ''}`.trim()
    if (customer.phone) return `${name} - ${customer.phone}`
    if (customer.email) return `${name} - ${customer.email}`
    return name
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            data-tutorial="appointment-customer-select"
            className="w-full justify-between"
            disabled={disabled || !businessId}
          >
            {selectedCustomer ? (
              <span className="flex items-center gap-2 truncate">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {getCustomerDisplayName(selectedCustomer)}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Seleccionar cliente...
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar cliente..."
              value={searchQuery}
              onValueChange={handleSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Buscando...
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="flex flex-col items-center gap-2 py-4">
                      <p className="text-muted-foreground">
                        No se encontraron clientes
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOpen(false)
                          setCreateDialogOpen(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Crear nuevo cliente
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup heading="Clientes">
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id}
                        onSelect={() => handleSelectCustomer(customer)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedCustomer?.id === customer.id
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">
                            {`${customer.first_name} ${
                              customer.last_name || ''
                            }`}
                          </span>
                          {(customer.phone || customer.email) && (
                            <span className="text-xs text-muted-foreground truncate">
                              {customer.phone || customer.email}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setCreateDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear nuevo cliente
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateCustomerDialog
        businessId={businessId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCustomerCreated}
      />
    </>
  )
}
