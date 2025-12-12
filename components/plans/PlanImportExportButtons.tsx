'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { importPlansWithProgress } from '@/lib/actions/plan-import-export'
import ImportTemplateStorageService from '@/lib/services/data-templates/import-template-storage-service'
import { ImportProgressComponent } from '@/components/ui/import-progress'

interface PlanImportExportButtonsProps {
  onImportComplete?: () => void
}

export function PlanImportExportButtons({
  onImportComplete,
}: PlanImportExportButtonsProps) {
  const templateStorageService = new ImportTemplateStorageService()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<any>(null)
  const [isPolling, setIsPolling] = useState(false)
  const isPollingRef = useRef(false)

  const handleDownloadTemplate = async () => {
    try {
      // Hacer fetch directo a la API route
      const response = await fetch('/api/plans/download-template')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Error al descargar la plantilla')
        return
      }

      // Obtener el nombre del archivo desde el header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'plantilla-planes.xlsx'

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Crear blob desde la respuesta y descargar
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Plantilla descargada correctamente')
    } catch (error: any) {
      console.error('Error downloading template:', error)
      toast.error('Error al descargar la plantilla')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ]

      if (!allowedTypes.includes(file.type)) {
        toast.error('Solo se permiten archivos Excel (.xlsx o .xls)')
        return
      }

      // Validar tamaño (10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('El archivo no debe superar los 10MB')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUploadTemplate = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero')
      return
    }

    setUploadingTemplate(true)
    try {
      const result = await templateStorageService.uploadPlansTemplate(
        selectedFile
      )

      if (result.success) {
        toast.success('Plantilla subida correctamente')
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById(
          'template-file'
        ) as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        toast.error(result.error || 'Error al subir la plantilla')
      }
    } catch (error: any) {
      console.error('Error uploading template:', error)
      toast.error('Error al subir la plantilla')
    } finally {
      setUploadingTemplate(false)
    }
  }

  const handleImportPlans = async () => {
    console.log('handleImportPlans called')
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero')
      return
    }

    // Generar session ID único
    const sessionId = `import_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`
    console.log('Setting currentSessionId to:', sessionId)
    setCurrentSessionId(sessionId)

    try {
      // Crear FormData con archivo y sessionId
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('sessionId', sessionId)

      // Iniciar importación con progreso
      await importPlansWithProgress(formData)
    } catch (error: any) {
      console.error('Error starting import:', error)
      toast.error('Error al iniciar la importación')
      setCurrentSessionId(null)
    }
  }

  // Función de polling para obtener progreso
  const pollProgress = useCallback(
    async (sessionId: string) => {
      console.log(
        'pollProgress called with sessionId:',
        sessionId,
        'isPollingRef:',
        isPollingRef.current
      )
      if (!sessionId || !isPollingRef.current) {
        console.log(
          'pollProgress early return - sessionId:',
          sessionId,
          'isPollingRef:',
          isPollingRef.current
        )
        return
      }

      try {
        console.log(`Polling for sessionId: ${sessionId}`)
        const response = await fetch(`/api/import/progress/${sessionId}`)
        console.log(`Polling response status: ${response.status}`)
        if (response.ok) {
          const progressData = await response.json()
          console.log('progressData:', progressData)

          setImportProgress(progressData)

          // Continuar polling si no terminó y aún estamos polling
          if (
            progressData.status !== 'completed' &&
            progressData.status !== 'error' &&
            isPollingRef.current
          ) {
            console.log(`Continuing polling for ${sessionId}`)
            setTimeout(() => pollProgress(sessionId), 1000)
          } else {
            console.log(
              `Stopping polling for ${sessionId}, status: ${progressData.status}`
            )
            setIsPolling(false)
            isPollingRef.current = false
            // Mostrar resultado final
            if (progressData.status === 'completed') {
              if (progressData.errors.length === 0) {
                toast.success(
                  `Importación completada: ${progressData.current} elementos procesados`
                )
              } else {
                toast.warning(
                  `Importación completada con ${progressData.errors.length} errores`
                )
              }
              onImportComplete?.()
            } else if (progressData.status === 'error') {
              toast.error('Error fatal en la importación')
            }

            // Limpiar estado (mantener archivo seleccionado para reintento)
            console.log(`Clearing currentSessionId for ${sessionId}`)
            setCurrentSessionId(null)
            // No limpiar selectedFile para permitir reintento rápido
            // setSelectedFile(null)
            // const fileInput = document.getElementById('template-file') as HTMLInputElement
            // if (fileInput) fileInput.value = ''
          }
        } else if (response.status === 404) {
          // Sesión no encontrada, reintentar en 2 segundos
          setTimeout(() => pollProgress(sessionId), 2000)
        } else {
          // Otro error, reintentar en 3 segundos
          setTimeout(() => pollProgress(sessionId), 3000)
        }
      } catch (error) {
        console.error('Polling error:', error)
        // Reintentar en caso de error de red
        setTimeout(() => pollProgress(sessionId), 3000)
      }
    },
    [onImportComplete]
  )

  // Efecto para iniciar polling cuando hay sessionId
  useEffect(() => {
    console.log(
      'useEffect triggered - currentSessionId:',
      currentSessionId,
      'isPolling:',
      isPolling
    )
    if (currentSessionId && !isPolling) {
      console.log('Starting polling for sessionId:', currentSessionId)
      setIsPolling(true)
      isPollingRef.current = true
      pollProgress(currentSessionId)
    }
  }, [currentSessionId, isPolling, pollProgress])

  const handleCloseDialog = () => {
    setImportDialogOpen(false)
    setSelectedFile(null)
    setCurrentSessionId(null)
    setImportProgress(null)
    setIsPolling(false)
    // Reset file input
    const fileInput = document.getElementById(
      'template-file'
    ) as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Descargar Plantilla
        </Button>

        <Button
          variant="outline"
          onClick={() => setImportDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Importar Plantillas
        </Button>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Plantillas de Planes
            </DialogTitle>
            <DialogDescription>
              Sube una plantilla Excel para actualizar o crear planes con su
              configuración de módulos y permisos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="template-file">Archivo Excel</Label>
              <Input
                id="template-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="mt-1"
                disabled={!!currentSessionId} // Deshabilitar durante importación
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Archivo seleccionado: {selectedFile.name} (
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Barra de progreso */}
            {importProgress && (
              <ImportProgressComponent
                progress={importProgress}
                showCancelButton={true}
                onCancel={() => {
                  setIsPolling(false)
                  setCurrentSessionId(null)
                  setImportProgress(null)
                  toast.info('Importación cancelada')
                }}
              />
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleUploadTemplate}
              disabled={
                !selectedFile || uploadingTemplate || !!currentSessionId
              }
            >
              {uploadingTemplate ? 'Subiendo...' : 'Guardar como Plantilla'}
            </Button>

            <Button
              onClick={handleImportPlans}
              disabled={!selectedFile || !!currentSessionId}
            >
              {!!currentSessionId ? 'Importando...' : 'Importar Planes'}
            </Button>

            <Button variant="outline" onClick={handleCloseDialog}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
