'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ProductSelector } from '@/components/products/ProductSelector'
import { Plus, Trash2, AlertTriangle, Syringe } from 'lucide-react'
import type { ServiceSupplyWithProduct } from '@/lib/models/product'
import { FeatureGate } from '../plan/feature-gate'

interface SupplyItem {
  id?: string
  product_id: string
  product_name: string
  default_quantity: number
  is_required: boolean
  unit_abbreviation: string
  cost_price_cents: number
  current_stock: number
}

interface ServiceSuppliesSectionProps {
  businessId: string
  supplies: SupplyItem[]
  onChange: (supplies: SupplyItem[]) => void
  disabled?: boolean
}

export function ServiceSuppliesSection({
  businessId,
  supplies,
  onChange,
  disabled = false,
}: ServiceSuppliesSectionProps) {
  const [showAddSupply, setShowAddSupply] = useState(false)

  const excludeIds = useMemo(
    () => supplies.map((s) => s.product_id),
    [supplies]
  )

  const handleAddSupply = (productId: string, product: any) => {
    if (!product) return

    const newSupply: SupplyItem = {
      product_id: productId,
      product_name: product.name,
      default_quantity: 1,
      is_required: true,
      unit_abbreviation: product.unit_of_measure?.abbreviation || 'und',
      cost_price_cents: product.cost_price_cents,
      current_stock: product.current_stock,
    }

    onChange([...supplies, newSupply])
    setShowAddSupply(false)
  }

  const handleRemoveSupply = (index: number) => {
    const updated = [...supplies]
    updated.splice(index, 1)
    onChange(updated)
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...supplies]
    updated[index] = { ...updated[index], default_quantity: quantity }
    onChange(updated)
  }

  const handleRequiredChange = (index: number, isRequired: boolean) => {
    const updated = [...supplies]
    updated[index] = { ...updated[index], is_required: isRequired }
    onChange(updated)
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const totalCost = useMemo(() => {
    return supplies.reduce((sum, s) => {
      return sum + s.cost_price_cents * s.default_quantity
    }, 0)
  }, [supplies])

  return (
    <FeatureGate
      module="services"
      feature="supply_management"
      mode="overlay"
      fallback={
        <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
          La asociación de insumos a servicios se encuentra desactivada.
          Actualiza tu plan para poder habilitar esta funcionalidad.
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Syringe className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Insumos Asociados</Label>
          </div>
          {supplies.length > 0 && (
            <Badge variant="secondary">
              Costo base: {formatPrice(totalCost)}
            </Badge>
          )}
        </div>

        {supplies.length === 0 && !showAddSupply && (
          <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-md">
            Este servicio no tiene insumos asociados.
            <br />
            Los insumos permiten cobrar por cantidad usada.
          </div>
        )}

        {supplies.length > 0 && (
          <div className="space-y-2">
            {supplies.map((supply, index) => (
              <div
                key={supply.product_id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {supply.product_name}
                    </span>
                    {supply.current_stock <= 0 && (
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(supply.cost_price_cents)}/
                    {supply.unit_abbreviation}
                    {' • Stock: '}
                    <span
                      className={
                        supply.current_stock <= 0
                          ? 'text-amber-600 font-medium'
                          : ''
                      }
                    >
                      {supply.current_stock} {supply.unit_abbreviation}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={supply.default_quantity}
                    onChange={(e) =>
                      handleQuantityChange(index, Number(e.target.value) || 0)
                    }
                    className="w-20 h-8 text-sm"
                    disabled={disabled}
                  />
                  <span className="text-xs text-muted-foreground w-8">
                    {supply.unit_abbreviation}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Switch
                    checked={supply.is_required}
                    onCheckedChange={(checked) =>
                      handleRequiredChange(index, checked)
                    }
                    disabled={disabled}
                  />
                  <span className="text-xs text-muted-foreground">
                    {supply.is_required ? 'Req.' : 'Opc.'}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveSupply(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showAddSupply ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ProductSelector
                businessId={businessId}
                type="SUPPLY"
                onChange={handleAddSupply}
                placeholder="Buscar insumo..."
                excludeIds={excludeIds}
                disabled={disabled}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddSupply(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddSupply(true)}
            disabled={disabled || !businessId}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Insumo
          </Button>
        )}

        {!businessId && (
          <p className="text-xs text-muted-foreground">
            Selecciona una sucursal para agregar insumos
          </p>
        )}
      </div>
    </FeatureGate>
  )
}

export function mapServiceSuppliesToItems(
  supplies: ServiceSupplyWithProduct[]
): SupplyItem[] {
  return supplies.map((s) => ({
    id: s.id,
    product_id: s.product_id,
    product_name: s.product.name,
    default_quantity: s.default_quantity,
    is_required: s.is_required,
    unit_abbreviation: s.product.unit_of_measure?.abbreviation || 'und',
    cost_price_cents: s.product.cost_price_cents,
    current_stock: s.product.current_stock,
  }))
}

export type { SupplyItem }
