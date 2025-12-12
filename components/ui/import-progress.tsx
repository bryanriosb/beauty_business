'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { ImportProgress } from '@/lib/services/data-templates/generic-import-service'

interface ImportProgressProps {
  progress: ImportProgress | null
  onCancel?: () => void
  showCancelButton?: boolean
}

export function ImportProgressComponent({
  progress,
  onCancel,
  showCancelButton = false
}: ImportProgressProps) {

  if (!progress) {
    return null
  }

  const progressPercentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'idle':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      case 'processing':
        return 'text-blue-700'
      default:
        return 'text-gray-700'
    }
  }

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className={`font-medium ${getStatusColor()}`}>
            {progress.status === 'idle' && 'Preparando importación...'}
            {progress.status === 'processing' && 'Importando datos...'}
            {progress.status === 'completed' && 'Importación completada'}
            {progress.status === 'error' && 'Error en la importación'}
          </h3>
        </div>

        {showCancelButton && progress.status === 'processing' && onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{progress.message}</span>
          <span>
            {progress.current} de {progress.total} ({progressPercentage}%)
          </span>
        </div>

        <Progress
          value={progressPercentage}
          className="h-2"
        />

        {/* Información adicional */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Duración: {formatDuration(progress.startTime, progress.endTime)}
          </span>
          {progress.status === 'completed' && (
            <span className="text-green-600">
              ✓ {progress.current} elementos procesados
            </span>
          )}
        </div>
      </div>

      {/* Errores */}
      {progress.errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            <div className="font-medium mb-1">Errores encontrados:</div>
            <ul className="list-disc list-inside space-y-1">
              {progress.errors.slice(0, 5).map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
              {progress.errors.length > 5 && (
                <li className="text-sm">
                  ... y {progress.errors.length - 5} errores más
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje de éxito */}
      {progress.status === 'completed' && progress.errors.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            <div className="font-medium">¡Importación exitosa!</div>
            <div className="text-sm mt-1">
              Se procesaron {progress.current} elementos correctamente en{' '}
              {formatDuration(progress.startTime, progress.endTime)}.
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Hook personalizado para manejar SSE
export function useImportProgress(sessionId: string | null) {
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setProgress(null)
      return
    }

    // Crear conexión SSE
    const es = new EventSource(`/api/import/progress/${sessionId}`)

    es.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data)
        setProgress(progressData)
      } catch (error) {
        console.error('Error parsing progress data:', error)
      }
    }

    es.onerror = (error) => {
      console.error('SSE connection error:', error)
      es.close()
    }

    setEventSource(es)

    // Cleanup
    return () => {
      es.close()
    }
  }, [sessionId])

  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
  }

  return { progress, disconnect }
}

export default ImportProgressComponent