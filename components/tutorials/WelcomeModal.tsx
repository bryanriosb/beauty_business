'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  BookOpen,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { updateTutorialStartedAction } from '@/lib/actions/business-account'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useBusinessAccount } from '@/hooks/use-business-account'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTutorial: () => void
}

const WELCOME_MODAL_COOKIE = 'welcome_modal_shown'

export function WelcomeModal({
  isOpen,
  onClose,
  onStartTutorial,
}: WelcomeModalProps) {
  const { businessAccountId } = useCurrentUser()
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    // Marcar que ya se mostró
    if (isOpen) {
      setClientCookie(WELCOME_MODAL_COOKIE, 'true', {
        maxAge: 365 * 24 * 60 * 60, // 1 year
      })
    }
  }, [isOpen])

  const handleStartTutorial = async () => {
    // Marcar tutorial como iniciado en la DB
    if (businessAccountId) {
      const result = await updateTutorialStartedAction(businessAccountId, true)
      if (!result.success) {
        console.error('Error al marcar tutorial como iniciado:', result.error)
        return
      }
    }

    if (dontShowAgain) {
      setClientCookie(WELCOME_MODAL_COOKIE, 'true', {
        maxAge: 365 * 24 * 60 * 60, // 1 year
      })
    }
    onStartTutorial()
    onClose()
  }

  const handleSkipTutorial = async () => {
    // Marcar tutorial como iniciado (aunque se saltó) en la DB
    if (businessAccountId) {
      const result = await updateTutorialStartedAction(businessAccountId, true)
      if (!result.success) {
        console.error('Error al marcar tutorial como iniciado:', result.error)
        return
      }
    }

    // Guardar en sessionStorage para prevenir reaparición en la misma sesión
    sessionStorage.setItem('not_show_welcome', 'true')

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl overflow-hidden border-0 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header con gradiente usando colores de la marca */}
        <div className="relative bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] p-8 text-white">
          <div className="absolute top-4 right-4">
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-white/30"
            >
              NUEVO USUARIO
            </Badge>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-1">
                ¡Bienvenido a tu Gestor de Belleza!
              </DialogTitle>
              <p className="text-white/90 text-base">
                Estamos emocionados de acompañarte en este nuevo viaje
              </p>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-[var(--foreground)]">
              ¿Listo para configurar tu negocio?
            </h3>
            <p className="text-[var(--muted-foreground)]">
              Te guiaremos paso a paso en la configuración inicial
            </p>
          </div>

          {/* Sección de beneficios del tutorial */}
          <div className="bg-gradient-to-r from-[var(--muted)]/50 to-[var(--secondary)]/10 rounded-xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-[var(--secondary)]" />
              <h4 className="font-semibold text-[var(--foreground)]">
                ¿Qué aprenderás en el tutorial?
              </h4>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)] text-sm">
                    Crear tus primeros servicios
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Configura tu catálogo de tratamientos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)] text-sm">
                    Registrar a tus especialistas
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Añade los profesionales de tu equipo
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)] text-sm">
                    Gestionar tu primer cita
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Programa atendimientos para clientes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5">
                  <Clock className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)] text-sm">
                    Solo 5 minutos
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Configuración rápida y sencilla
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Checkbox para no volver a mostrar */}
          <div className="flex items-center gap-2 p-3 bg-[var(--muted)]/30 rounded-lg">
            <input
              type="checkbox"
              id="dont-show"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <label
              htmlFor="dont-show"
              className="text-sm text-[var(--muted-foreground)]"
            >
              No volver a mostrar este mensaje
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSkipTutorial}
              className="flex-1 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Saltar tutorial
            </Button>
            <Button
              onClick={handleStartTutorial}
              className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary)]/90 hover:to-[var(--secondary)]/90 text-white border-0 font-medium"
            >
              Comenzar tutorial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook para controlar si mostrar el modal
export function useWelcomeModal() {
  const [shouldShow, setShouldShow] = useState(false)

  const checkShouldShow = () => {
    const wasShown = getClientCookie(WELCOME_MODAL_COOKIE) === 'true'
    return !wasShown
  }

  const showModal = () => setShouldShow(true)
  const hideModal = () => setShouldShow(false)

  return {
    shouldShow,
    checkShouldShow,
    showModal,
    hideModal,
  }
}
