'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignaturePadProps {
  onSignatureChange?: (signatureData: string | null) => void
  width?: number
  height?: number
  lineColor?: string
  lineWidth?: number
  backgroundColor?: string
  className?: string
  disabled?: boolean
  initialValue?: string | null
}

export default function SignaturePad({
  onSignatureChange,
  width = 400,
  height = 200,
  lineColor = '#000000',
  lineWidth = 2,
  backgroundColor = '#ffffff',
  className,
  disabled = false,
  initialValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignatureChange?.(null)
  }, [backgroundColor, getContext, onSignatureChange])

  const loadInitialValue = useCallback(() => {
    if (!initialValue) return

    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      setHasSignature(true)
    }
    img.src = initialValue
  }, [initialValue, backgroundColor, getContext])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return

    // Configurar el canvas
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Cargar valor inicial si existe
    loadInitialValue()
  }, [backgroundColor, lineColor, lineWidth, getContext, loadInitialValue])

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (disabled) return

    const coords = getCoordinates(e)
    if (!coords) return

    setIsDrawing(true)
    lastPointRef.current = coords
  }

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || disabled) return

    const ctx = getContext()
    if (!ctx) return

    const coords = getCoordinates(e)
    if (!coords || !lastPointRef.current) return

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()

    lastPointRef.current = coords
    setHasSignature(true)
  }

  const stopDrawing = () => {
    if (isDrawing && hasSignature) {
      const canvas = canvasRef.current
      if (canvas) {
        const signatureData = canvas.toDataURL('image/png')
        onSignatureChange?.(signatureData)
      }
    }
    setIsDrawing(false)
    lastPointRef.current = null
  }

  const handleClear = () => {
    clearCanvas()
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden',
          disabled ? 'opacity-50 cursor-not-allowed' : 'border-muted-foreground/25',
          hasSignature && 'border-solid border-primary/50'
        )}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            'touch-none w-full',
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair'
          )}
          style={{ maxWidth: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground text-sm">
              Firme aquí con el dedo o mouse
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || !hasSignature}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      </div>
    </div>
  )
}
