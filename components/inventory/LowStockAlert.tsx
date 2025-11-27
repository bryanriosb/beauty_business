'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertTriangle } from 'lucide-react'
import { inventoryService } from '@/lib/services/product/inventory-service'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { onInventoryUpdated } from '@/lib/events/inventory-events'

interface LowStockAlertBadgeProps {
  className?: string
}

export function LowStockAlertBadge({ className }: LowStockAlertBadgeProps) {
  const [count, setCount] = useState(0)
  const { activeBusiness } = useActiveBusinessStore()

  const fetchCount = useCallback(async () => {
    if (!activeBusiness?.id) return
    try {
      const result = await inventoryService.getLowStockProducts(activeBusiness.id)
      setCount(result.count)
    } catch (error) {
      console.error('Error fetching low stock count:', error)
    }
  }, [activeBusiness?.id])

  useEffect(() => {
    fetchCount()
    // Refresh every 5 minutes
    const interval = setInterval(fetchCount, 5 * 60 * 1000)
    // Listen for inventory updates
    const unsubscribe = onInventoryUpdated(fetchCount)
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [fetchCount])

  if (count === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="destructive"
            className={`h-5 min-w-5 p-0 text-xs flex items-center justify-center ${className}`}
          >
            {count > 99 ? '99+' : count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} producto{count !== 1 ? 's' : ''} con stock bajo</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface LowStockIndicatorProps {
  showText?: boolean
  className?: string
}

export function LowStockIndicator({ showText = true, className }: LowStockIndicatorProps) {
  const [count, setCount] = useState(0)
  const [products, setProducts] = useState<any[]>([])
  const { activeBusiness } = useActiveBusinessStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!activeBusiness?.id) return
      try {
        const result = await inventoryService.getLowStockProducts(activeBusiness.id)
        setCount(result.count)
        setProducts(result.data.slice(0, 5)) // Show top 5
      } catch (error) {
        console.error('Error fetching low stock:', error)
      }
    }
    fetchData()
  }, [activeBusiness?.id])

  if (count === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 text-amber-600 ${className}`}>
            <AlertTriangle className="h-4 w-4" />
            {showText && (
              <span className="text-sm">
                {count} producto{count !== 1 ? 's' : ''} con stock bajo
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Productos con stock bajo:</p>
            {products.map((p) => (
              <p key={p.id} className="text-sm">
                {p.name}: {p.current_stock} {p.unit_of_measure?.abbreviation || 'und'}
              </p>
            ))}
            {count > 5 && (
              <p className="text-sm text-muted-foreground">
                y {count - 5} más...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
