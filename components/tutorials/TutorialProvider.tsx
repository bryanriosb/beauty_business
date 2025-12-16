'use client'

import { useTutorialStore } from '@/lib/store/tutorial-store'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride'
import { TUTORIALS, type TutorialStep } from '@/const/tutorials'
import { WelcomeModal } from './WelcomeModal'
import { useTutorial } from '@/hooks/use-tutorial'
import { useActiveBusinessAccount } from '@/hooks/use-active-business-account'

export function TutorialProvider() {
  const pathname = usePathname()
  const router = useRouter()

  const {
    isActive,
    tutorialId,
    stepIndex,
    isPaused,
    stopTutorial,
    nextStep,
    previousStep,
    setStepIndex,
    getCurrentStep,
  } = useTutorialStore()

  const { startTutorialAfterWelcome } = useTutorial()
  const { tutorialStarted, isLoading, canUseTutorialStatus, activeBusiness } =
    useActiveBusinessAccount()

  const [shouldRun, setShouldRun] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Obtener los pasos del tutorial actual
  const getJoyrideSteps = () => {
    if (!tutorialId || !isActive) return []

    const tutorial = TUTORIALS[tutorialId]
    if (!tutorial) return []

    return tutorial.steps.map((step, index) => {
      // Intentar selector directo, luego selector data-tutorial
      let targetSelector = step.target
      if (
        step.target &&
        !step.target.startsWith('[') &&
        !step.target.startsWith('#') &&
        !step.target.startsWith('.')
      ) {
        targetSelector = `[data-tutorial="${step.target}"]`
      }

      // Verificar si el elemento existe, fallback a body
      const element = document.querySelector(targetSelector)
      const finalTarget = element ? targetSelector : 'body'

      return {
        ...step,
        target: finalTarget,
        content: step.content,
        // Deshabilitar beacon para elementos modales hasta que sean visibles
        disableBeacon: step.disableBeacon || !element,
      }
    })
  }

  // Función para ejecutar acciones trigger
  const executeTriggerAction = useCallback(
    (triggerAction: NonNullable<TutorialStep['triggerAction']>) => {
      const {
        type,
        selector,
        delay: actionDelay = 500,
        waitForModal,
      } = triggerAction
      // Pausar momentáneamente el tutorial mientras se ejecuta la acción
      setIsReady(false)

      setTimeout(() => {
        if (type === 'click' || type === 'open-modal') {
          const element = selector ? document.querySelector(selector) : null
          if (element && 'click' in element) {
            ;(element as HTMLElement).click()
          }
        }

        // Si debemos esperar por un modal, verificar su visibilidad
        if (waitForModal) {
          const checkModal = () => {
            const modal = document.querySelector('[role="dialog"]')
            if (modal && (modal as HTMLElement).offsetParent !== null) {
              setIsReady(true)
            } else {
              // Reintentar después de un breve delay
              setTimeout(checkModal, 100)
            }
          }
          setTimeout(checkModal, 300) // Dar más tiempo para que el modal aparezca
        } else {
          // Si no esperamos modal, reactivar inmediatamente
          setIsReady(true)
        }
      }, actionDelay)
    },
    []
  )

  // Función para forzar focus en inputs y selects
  const forceFocusOnInput = useCallback(
    (stepIndex: number) => {
      // Obtener el paso objetivo
      const targetStep = tutorialId
        ? TUTORIALS[tutorialId]?.steps[stepIndex]
        : null
      if (!targetStep) return

      // Determinar el selector del target
      let targetSelector = targetStep.target
      if (
        targetSelector &&
        !targetSelector.startsWith('[') &&
        !targetSelector.startsWith('#') &&
        !targetSelector.startsWith('.')
      ) {
        targetSelector = `[data-tutorial="${targetStep.target}"]`
      }

      // Esperar un momento a que Joyride se posicione
      setTimeout(() => {
        let element = document.querySelector(targetSelector)

        // Si no se encuentra directamente, buscar en modales
        if (!element) {
          const modals = Array.from(
            document.querySelectorAll('[role="dialog"]')
          )
          for (const modal of modals) {
            const foundInModal = modal.querySelector(targetSelector)
            if (foundInModal) {
              element = foundInModal
              break
            }
          }
        }

        if (element) {
          // Verificar si es un input, textarea o select
          const isFocusableElement =
            element.tagName === 'INPUT' ||
            element.tagName === 'TEXTAREA' ||
            element.tagName === 'SELECT' ||
            element.getAttribute('role') === 'combobox' // para selects personalizados

          if (isFocusableElement) {
            ;(element as HTMLElement).focus()

            // Para inputs, también colocar cursor al final (solo para tipos que lo soportan)
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
              const inputElement = element as
                | HTMLInputElement
                | HTMLTextAreaElement

              // Verificar si el input soporta setSelectionRange
              if (
                element.tagName === 'TEXTAREA' ||
                (element.tagName === 'INPUT' &&
                  ['text', 'search', 'url', 'tel', 'password'].includes(
                    (inputElement as HTMLInputElement).type
                  ))
              ) {
                inputElement.setSelectionRange(
                  inputElement.value.length,
                  inputElement.value.length
                )
              }
              // Para inputs de tipo number, date, etc., solo hacer focus
            }

            // Hacer scroll suave al elemento
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 300) // Dar tiempo a Joyride para que se posicione
    },
    [tutorialId]
  )

  // Manejar callback de Joyride
  const handleCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data

    // Prevenir cierre inesperado del tutorial (solo permitir cierre explícito)
    if (action === ACTIONS.CLOSE) {
      // Solo permitir cierre si viene del botón de skip/close del tooltip
      // Ignorar cierres por clicks en el overlay
      return // No ejecutar stopTutorial()
    }

    // Manejar tutorial finalizado
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      if (tutorialId) {
        const tutorial = TUTORIALS[tutorialId]
        tutorial?.onComplete?.()
      }
      stopTutorial()
      return
    }

    // Manejar navegación entre pasos
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      if (action === ACTIONS.NEXT) {
        // Ejecutar triggerAction ANTES de avanzar al siguiente paso
        const currentStep = getCurrentStep()
        if (currentStep?.triggerAction) {
          executeTriggerAction(currentStep.triggerAction)
        }

        // Avanzar al siguiente paso
        nextStep()

        // Forzar focus en el input/select del siguiente paso
        setTimeout(() => forceFocusOnInput(index + 1), 100)
      } else if (action === ACTIONS.PREV) {
        previousStep()

        // También forzar focus al ir atrás
        setTimeout(() => forceFocusOnInput(index - 1), 100)
      }
    }

    // Actualizar índice si es necesario
    if (type === EVENTS.STEP_BEFORE) {
      setStepIndex(index)
    }
  }

  // Manejar navegación automática entre páginas y detección de inputs
  useEffect(() => {
    if (!isActive || isPaused) return

    const currentStep = getCurrentStep()
    if (!currentStep?.page) {
      // Si no hay página específica, marcar como listo inmediatamente
      setIsReady(true)
      return
    }

    // Si necesitamos navegar a otra página
    if (currentStep.page !== pathname) {
      setIsReady(false)
      setShouldRun(false)

      // Navegar a la página del paso actual
      const delay = currentStep.navigation?.delay || 500
      const timer = setTimeout(() => {
        router.push(currentStep.page!)
      }, delay)

      return () => clearTimeout(timer)
    }

    // Detectar si el target es un input para manejar interacción especial
    const targetSelector = currentStep.target.startsWith('[')
      ? currentStep.target
      : `[data-tutorial="${currentStep.target}"]`

    let element = document.querySelector(targetSelector)

    // Si el elemento no está visible, buscar dentro de modales
    if (!element) {
      // Buscar en todos los modales abiertos
      const modals = Array.from(document.querySelectorAll('[role="dialog"]'))
      for (const modal of modals) {
        const foundInModal = modal.querySelector(targetSelector)
        if (foundInModal) {
          element = foundInModal
          break
        }
      }
    }

    // Si el elemento aún no está visible pero hay triggerAction, marcar como listo de todos modos
    if (!element && currentStep.triggerAction) {
      setIsReady(true)
      return
    }

    setIsReady(true)
  }, [isActive, isPaused, pathname, getCurrentStep, router, stepIndex])

  // Efecto para mostrar modal de bienvenida a usuarios trial nuevos
  useEffect(() => {
    // Permitir mostrar modal en dashboard o services para usuarios trial que no han empezado
    const isOnValidPage =
      pathname === '/admin' ||
      pathname === '/admin/dashboard' ||
      pathname === '/admin/appointments' ||
      pathname === '/admin/services'

    // Verificar sessionStorage para prevenir reaparición en la misma sesión
    const notShowWelcome = sessionStorage.getItem('not_show_welcome') === 'true'

    // Solo mostrar modal si hay un business activo y tutorial_started es false Y no hay flag de sessionStorage
    if (
      isOnValidPage &&
      !isLoading &&
      canUseTutorialStatus &&
      !tutorialStarted &&
      !isActive &&
      !showModal &&
      !notShowWelcome &&
      activeBusiness
    ) {
      const timer = setTimeout(() => {
        setShowModal(true)
      }, 500) // Delay para evitar choque con otros modales
      return () => clearTimeout(timer)
    }
  }, [
    pathname,
    tutorialStarted,
    isLoading,
    canUseTutorialStatus,
    isActive,
    showModal,
    activeBusiness,
  ])

  // Efecto para manejar la interacción con inputs durante el tutorial
  useEffect(() => {
    if (!isActive || !isReady || !shouldRun) return

    const currentStep = getCurrentStep()
    if (!currentStep) return

    // Detectar si el paso actual apunta a un input
    const selector = currentStep.target.startsWith('[')
      ? currentStep.target
      : `[data-tutorial="${currentStep.target}"]`

    const element = document.querySelector(selector)
    const isInput =
      element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')

    if (isInput && element) {
      // Crear un estilo dinámico para permitir la interacción con inputs
      const styleId = 'joyride-input-fix'
      let styleElement = document.getElementById(styleId)

      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        document.head.appendChild(styleElement)
      }

      // Estilos CSS para permitir interacción con inputs durante el tutorial
      // y mantener el comportamiento de Joyride para otros elementos
      styleElement.textContent = `
        .react-joyride__tooltip button {
          pointer-events: auto !important;
        }

        /* Asegurar que dropdowns de combobox estén por encima de Joyride */
        [data-slot="popover-content"] {
          z-index: 1000 !important;
        }
      `

      return () => {
        const style = document.getElementById(styleId)
        if (style) {
          style.remove()
        }
      }
    }
  }, [isActive, isReady, shouldRun, getCurrentStep])

  // Efecto para prevenir selección automática de texto en inputs durante tutoriales
  useEffect(() => {
    if (!isActive) return

    const currentStep = getCurrentStep()
    if (!currentStep) return
  }, [isActive, stepIndex, getCurrentStep])

  // Efecto para iniciar/parar Joyride
  useEffect(() => {
    if (isActive && !isPaused && isReady) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        // Antes de iniciar Joyride, verificar si hay un modal abierto y cerrarlo
        const modal = document.querySelector('[role="dialog"]')
        if (modal && modal.getAttribute('aria-expanded') === 'true') {
          return // No iniciar Joyride mientras haya un modal abierto
        }

        setShouldRun(true)
      }, 1500) // Aumentar delay para dar tiempo a que los elementos se carguen
      return () => clearTimeout(timer)
    } else {
      setShouldRun(false)
    }
  }, [isActive, isPaused, isReady, tutorialId])

  const handleStartTutorial = () => {
    startTutorialAfterWelcome()
    setShowModal(false)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  // Renderizar Joyride solo si hay tutorial activo
  const tutorialComponent =
    isActive && tutorialId ? (
      <Joyride
        steps={getJoyrideSteps()}
        run={shouldRun}
        stepIndex={stepIndex}
        callback={handleCallback}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        disableScrolling={true} // Evitar scrolling el cual interfiere con FormField focus
        disableOverlayClose={true} // Evitar que el tutorial se cierre con clicks fuera
        debug={false}
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            primaryColor: '#0ea5e9',
            textColor: '#333',
          },
          tooltip: {
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
          },
          buttonNext: {
            backgroundColor: '#0ea5e9',
            color: '#fff',
          },
          buttonBack: {
            color: '#6b7280',
          },
          buttonSkip: {
            color: '#6b7280',
          },
        }}
        locale={{
          back: 'Anterior',
          close: 'Cerrar',
          last: 'Finalizar',
          nextLabelWithProgress: `Siguiente ${stepIndex + 1} de ${
            getJoyrideSteps().length
          }`,
          open: 'Abrir el tutorial',
          skip: 'Omitir tutorial',
        }}
      />
    ) : null

  return (
    <>
      {tutorialComponent}
      <WelcomeModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onStartTutorial={handleStartTutorial}
      />
    </>
  )
}
