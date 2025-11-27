'use client'

import { useState, useEffect, useMemo } from 'react'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Syringe } from 'lucide-react'
import { getSuppliesForServicesAction } from '@/lib/actions/service-supply'
import type { SelectedSupply } from '@/lib/models/product'

interface AppointmentSuppliesSectionProps {
  serviceIds: string[]
  supplies: SelectedSupply[]
  onChange: (supplies: SelectedSupply[]) => void
  disabled?: boolean
}

export function AppointmentSuppliesSection({
  serviceIds,
  supplies,
  onChange,
  disabled = false,
}: AppointmentSuppliesSectionProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadSupplies = async () => {
      if (serviceIds.length === 0) {
        onChange([])
        return
      }

      setLoading(true)
      try {
        const serviceSupplies = await getSuppliesForServicesAction(serviceIds)

        // Convertir a SelectedSupply manteniendo cantidades existentes
        const existingMap = new Map(supplies.map((s) => [s.product_id, s]))

        const newSupplies: SelectedSupply[] = serviceSupplies.map((ss) => {
          const existing = existingMap.get(ss.product_id)
          return {
            product_id: ss.product_id,
            name: ss.product.name,
            quantity: existing?.quantity ?? ss.default_quantity,
            unit_price_cents: ss.product.cost_price_cents,
            unit_abbreviation: ss.product.unit_of_measure?.abbreviation || 'und',
            current_stock: ss.product.current_stock,
          }
        })

        onChange(newSupplies)
      } catch (error) {
        console.error('Error loading supplies:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSupplies()
  }, [serviceIds.join(',')]) // Solo recargar cuando cambian los IDs de servicios

  const handleQuantityChange = (productId: string, quantity: number) => {
    const updated = supplies.map((s) =>
      s.product_id === productId ? { ...s, quantity } : s
    )
    onChange(updated)
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const totalSuppliesCost = useMemo(() => {
    return supplies.reduce((sum, s) => sum + s.unit_price_cents * s.quantity, 0)
  }, [supplies])

  if (serviceIds.length === 0) return null
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Cargando insumos...
      </div>
    )
  }
  if (supplies.length === 0) return null

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Insumos</Label>
        </div>
        <Badge variant="secondary">
          Total: {formatPrice(totalSuppliesCost)}
        </Badge>
      </div>

      <div className="space-y-2">
        {supplies.map((supply) => {
          const isLowStock = supply.current_stock < supply.quantity
          const totalCost = supply.unit_price_cents * supply.quantity

          return (
            <div
              key={supply.product_id}
              className="flex items-center gap-3 py-2 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {supply.name}
                  </span>
                  {isLowStock && (
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(supply.unit_price_cents)}/{supply.unit_abbreviation}
                  {' • Stock: '}
                  <span className={isLowStock ? 'text-amber-600' : ''}>
                    {supply.current_stock} {supply.unit_abbreviation}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NumericInput
                  min={0}
                  value={supply.quantity}
                  onChange={(val) =>
                    handleQuantityChange(supply.product_id, val ?? 0)
                  }
                  className="w-20 h-8 text-sm text-right"
                  disabled={disabled}
                  allowDecimals={true}
                  decimalPlaces={2}
                />
                <span className="text-xs text-muted-foreground w-8">
                  {supply.unit_abbreviation}
                </span>
              </div>

              <div className="text-sm font-medium w-24 text-right">
                {formatPrice(totalCost)}
              </div>
            </div>
          )
        })}
      </div>

      {supplies.some((s) => s.current_stock < s.quantity) && (
        <p className="text-xs text-destructive font-medium">
          No se puede agendar: stock insuficiente en algunos insumos
        </p>
      )}
    </div>
  )
}

export function calculateSuppliesTotal(supplies: SelectedSupply[]): number {
  return supplies.reduce((sum, s) => sum + s.unit_price_cents * s.quantity, 0)
}

export function hasInsufficientStock(supplies: SelectedSupply[]): boolean {
  return supplies.some((s) => s.current_stock < s.quantity)
}
