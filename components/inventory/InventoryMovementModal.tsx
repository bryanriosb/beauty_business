'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductSelector } from '@/components/products/ProductSelector'
import { Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw, Trash2, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { inventoryService } from '@/lib/services/product/inventory-service'
import { dispatchInventoryUpdated } from '@/lib/events/inventory-events'
import type { InventoryMovementType } from '@/lib/types/enums'

const movementTypes: { value: InventoryMovementType; label: string; icon: any; color: string }[] = [
  { value: 'ENTRY', label: 'Entrada', icon: ArrowUpCircle, color: 'text-green-600' },
  { value: 'CONSUMPTION', label: 'Consumo', icon: ArrowDownCircle, color: 'text-blue-600' },
  { value: 'SALE', label: 'Venta', icon: ArrowDownCircle, color: 'text-purple-600' },
  { value: 'ADJUSTMENT', label: 'Ajuste', icon: RefreshCw, color: 'text-orange-600' },
  { value: 'WASTE', label: 'Merma/Desperdicio', icon: Trash2, color: 'text-red-600' },
  { value: 'TRANSFER', label: 'Transferencia', icon: ArrowRightLeft, color: 'text-cyan-600' },
]

const formSchema = z.object({
  product_id: z.string().min(1, 'Selecciona un producto'),
  movement_type: z.enum(['ENTRY', 'CONSUMPTION', 'SALE', 'ADJUSTMENT', 'WASTE', 'TRANSFER']),
  quantity: z.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  unit_cost_cents: z.number().optional(),
  notes: z.string().optional(),
})

type MovementFormValues = z.infer<typeof formSchema>

interface InventoryMovementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  onSuccess?: () => void
  defaultProductId?: string
  defaultType?: InventoryMovementType
}

export function InventoryMovementModal({
  open,
  onOpenChange,
  businessId,
  onSuccess,
  defaultProductId,
  defaultType = 'ENTRY',
}: InventoryMovementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: defaultProductId || '',
      movement_type: defaultType,
      quantity: 0,
      unit_cost_cents: undefined,
      notes: '',
    },
  })

  const movementType = form.watch('movement_type')

  const handleProductSelect = (productId: string, product: any) => {
    form.setValue('product_id', productId)
    setSelectedProduct(product)
  }

  const onSubmit = async (data: MovementFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await inventoryService.createMovement({
        product_id: data.product_id,
        business_id: businessId,
        movement_type: data.movement_type,
        quantity: data.quantity,
        unit_cost_cents: data.unit_cost_cents ? Math.round(data.unit_cost_cents * 100) : undefined,
        notes: data.notes || undefined,
      })

      if (result.success) {
        const typeLabel = movementTypes.find((t) => t.value === data.movement_type)?.label
        toast.success(`${typeLabel} registrada correctamente`)
        dispatchInventoryUpdated() // Notify sidebar badge to refresh
        onOpenChange(false)
        form.reset()
        setSelectedProduct(null)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Error al registrar movimiento')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al registrar movimiento')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getQuantityLabel = () => {
    switch (movementType) {
      case 'ENTRY':
        return 'Cantidad a ingresar'
      case 'ADJUSTMENT':
        return 'Nuevo stock (valor absoluto)'
      default:
        return 'Cantidad'
    }
  }

  const getQuantityDescription = () => {
    if (movementType === 'ADJUSTMENT' && selectedProduct) {
      return `Stock actual: ${selectedProduct.current_stock} ${selectedProduct.unit_of_measure?.abbreviation || 'und'}`
    }
    return undefined
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento</DialogTitle>
          <DialogDescription>
            Registra una entrada, salida o ajuste de inventario
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Movimiento</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {movementTypes.map((type) => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${type.color}`} />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  <ProductSelector
                    businessId={businessId}
                    value={field.value}
                    onChange={handleProductSelect}
                    placeholder="Buscar producto..."
                    disabled={isSubmitting}
                  />
                  {selectedProduct && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Stock actual: {selectedProduct.current_stock}{' '}
                      {selectedProduct.unit_of_measure?.abbreviation || 'und'}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getQuantityLabel()}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.001}
                      step={0.001}
                      placeholder="0"
                      disabled={isSubmitting}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    />
                  </FormControl>
                  {getQuantityDescription() && (
                    <FormDescription>{getQuantityDescription()}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {movementType === 'ENTRY' && (
              <FormField
                control={form.control}
                name="unit_cost_cents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Unitario (COP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        placeholder="Opcional"
                        disabled={isSubmitting}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Costo de compra por unidad (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notas {movementType === 'WASTE' && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        movementType === 'WASTE'
                          ? 'Describe el motivo de la merma...'
                          : 'Notas adicionales (opcional)...'
                      }
                      rows={2}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
