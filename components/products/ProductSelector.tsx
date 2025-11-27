'use client'

import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronsUpDown, AlertTriangle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import ProductService from '@/lib/services/product/product-service'
import type { ProductWithDetails } from '@/lib/models/product'

interface ProductSelectorProps {
  businessId: string
  type?: 'SUPPLY' | 'RETAIL'
  value?: string
  onChange: (productId: string, product: ProductWithDetails | null) => void
  disabled?: boolean
  placeholder?: string
  excludeIds?: string[]
}

export function ProductSelector({
  businessId,
  type,
  value,
  onChange,
  disabled = false,
  placeholder = 'Seleccionar producto...',
  excludeIds = [],
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [loading, setLoading] = useState(false)

  const productService = useMemo(() => new ProductService(), [])

  useEffect(() => {
    const loadProducts = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const response = await productService.fetchItems({
          business_id: businessId,
          type,
          is_active: true,
          page_size: 100,
        })
        setProducts(response.data)
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [businessId, type, productService])

  const availableProducts = useMemo(() => {
    return products.filter((p) => !excludeIds.includes(p.id))
  }, [products, excludeIds])

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === value)
  }, [products, value])

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedProduct.name}</span>
              {selectedProduct.current_stock <= selectedProduct.min_stock && (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar producto..." />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Cargando...' : 'No se encontraron productos.'}
            </CommandEmpty>
            <CommandGroup>
              {availableProducts.map((product) => {
                const isLowStock =
                  product.current_stock <= product.min_stock
                const unitAbbr =
                  product.unit_of_measure?.abbreviation || 'und'

                return (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => {
                      onChange(product.id, product)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === product.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {product.name}
                        </span>
                        {isLowStock && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatPrice(product.cost_price_cents)}/{unitAbbr}
                        </span>
                        <span>•</span>
                        <span
                          className={cn(
                            isLowStock && 'text-amber-600 font-medium'
                          )}
                        >
                          Stock: {product.current_stock} {unitAbbr}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
