'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, Download, QrCode, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import Loading from '@/components/ui/loading'

interface SignatureLinkShareProps {
  medicalRecordId: string
  children?: React.ReactNode
  onLinkGenerated?: (signatureUrl: string, token: string) => void
}

export function SignatureLinkShare({
  medicalRecordId,
  children,
  onLinkGenerated,
}: SignatureLinkShareProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const generateSignatureLink = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        '/api/medical-records/generate-signature-link',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            medicalRecordId,
            expiresDays: 7,
          }),
        }
      )

      const result = await response.json()

      console.log('Result from API:', result)

      if (result.success) {
        setSignatureUrl(result.signature_url)
        setToken(result.token)

        // Abrir el modal inmediatamente después de setear los estados
        setTimeout(() => {
          console.log('Opening modal with URL:', result.signature_url)
          setIsOpen(true)
          // No llamar a onLinkGenerated aquí para evitar recarga
        }, 100)

        toast.success('Enlace de firma generado exitosamente')
      } else {
        toast.error(result.error || 'Error al generar el enlace')
      }
    } catch (error) {
      console.error('Error generating signature link:', error)
      toast.error('Error al generar el enlace')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(signatureUrl)
      setCopied(true)
      toast.success('Enlace copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Error al copiar el enlace')
    }
  }

  const downloadQRCode = () => {
    const svgElement = document.getElementById('qr-code-svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)

      const pngFile = canvas.toDataURL('image/png')

      const downloadLink = document.createElement('a')
      downloadLink.download = `firma-medical-record-${token.substring(
        0,
        8
      )}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <>
      {/* Trigger para dropdown - estilo de menuItem */}
      <div 
        onClick={generateSignatureLink}
        className="relative flex cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full"
      >
        <QrCode className="mr-2 h-4 w-4" />
        Generar Enlace
        {isLoading && <Loading className="ml-2 h-4 w-4" />}
      </div>

      {/* Modal con el enlace generado - forzar renderizado */}
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <QrCode className="w-5 h-5" />
                Enlace de Firma Digital
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4 max-w-full">
                {signatureUrl ? (
                  <>
                    <div className="p-4 bg-white rounded-lg border flex-shrink-0">
                      <QRCodeSVG
                        id="qr-code-svg"
                        value={signatureUrl}
                        size={200}
                        level="H"
                        marginSize={2}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>

                    <p className="text-sm text-gray-600 text-center">
                      Escanea este código QR para acceder al formulario de firma
                    </p>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <Loading className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Generando enlace...</p>
                  </div>
                )}
              </div>

              {/* Enlace */}
              {signatureUrl && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Enlace de firma
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-full">
                      <div className="p-2 border rounded text-sm break-all">
                        {signatureUrl}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="hidden sm:inline">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="hidden sm:inline">Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Acciones */}
              {signatureUrl && (
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={downloadQRCode}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar QR
                  </Button>

                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false)
                        // Recargar la tabla solo cuando el usuario cierra el modal
                        setTimeout(() => {
                          onLinkGenerated?.(signatureUrl, token)
                        }, 100)
                      }}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}

              {/* Información adicional */}
              {signatureUrl && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Este enlace expirará en 7 días</p>
                  <p>• El enlace solo se puede usar una vez para firmar</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
