'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import type { InvoiceItem } from '@/lib/models/invoice/invoice'

interface InvoiceItemsEditorProps {
  items: InvoiceItem[]
  onChange: (items: InvoiceItem[]) => void
  disabled?: boolean
}

export default function InvoiceItemsEditor({
  items,
  onChange,
  disabled = false,
}: InvoiceItemsEditorProps) {
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice) return

    const priceCents = Math.round(parseFloat(newItemPrice) * 100)
    const newItem: InvoiceItem = {
      service_id: null,
      name: newItemName.trim(),
      quantity: 1,
      unit_price_cents: priceCents,
      total_cents: priceCents,
    }

    onChange([...items, newItem])
    setNewItemName('')
    setNewItemPrice('')
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      quantity,
      total_cents: newItems[index].unit_price_cents * quantity,
    }
    onChange(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + item.total_cents, 0)

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Servicios / Items</div>

      {items.length > 0 && (
        <div className="border rounded-md divide-y">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(item.unit_price_cents / 100)} c/u
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                  className="w-16 h-8 text-center"
                  disabled={disabled}
                />
                <div className="w-24 text-right font-medium">
                  {formatCurrency(item.total_cents / 100)}
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder="Nombre del servicio"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Precio"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            className="w-28"
            min={0}
            step={100}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddItem}
            disabled={!newItemName.trim() || !newItemPrice}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Subtotal: </span>
            <span className="font-medium">{formatCurrency(subtotal / 100)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
