'use client'

import { useTutorialStore } from '@/lib/store/tutorial-store'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride'
import { TUTORIALS, type TutorialStep } from '@/const/tutorials'
import { setClientCookie } from '@/lib/utils/cookies'
import { WelcomeModal } from './WelcomeModal'
import { useTutorial } from '@/hooks/use-tutorial'
import { useBusinessAccount } from '@/hooks/use-business-account'
import { useCurrentUser } from '@/hooks/use-current-user'

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
  const { tutorialStarted } = useBusinessAccount()
  const { businessAccountId } = useCurrentUser()

  const [shouldRun, setShouldRun] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalShownThisSession, setModalShownThisSession] = useState(false)

  // Obtener los pasos del tutorial actual
  const getJoyrideSteps = () => {
    if (!tutorialId || !isActive) return []

    const tutorial = TUTORIALS[tutorialId]
    if (!tutorial) return []

    console.log('🎯 Processing steps for tutorial:', tutorialId)

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

      // console.log(`🎯 Step ${index}:`, {
      //   originalTarget: step.target,
      //   selector: targetSelector,
      //   elementFound: !!element,
      //   finalTarget,
      //   stepContent: step.content.substring(0, 50) + '...'
      // })

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

      console.log('🚀 Executing trigger action:', { type, selector })

      // Pausar momentáneamente el tutorial mientras se ejecuta la acción
      setIsReady(false)

      setTimeout(() => {
        if (type === 'click' || type === 'open-modal') {
          const element = selector ? document.querySelector(selector) : null
          if (element && 'click' in element) {
            ;(element as HTMLElement).click()
            console.log('✅ Clicked element:', selector)
          }
        }

        // Si debemos esperar por un modal, verificar su visibilidad
        if (waitForModal) {
          const checkModal = () => {
            const modal = document.querySelector('[role="dialog"]')
            if (modal && (modal as HTMLElement).offsetParent !== null) {
              console.log('✅ Modal is visible, setting isReady = true')
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

  // Manejar callback de Joyride
  const handleCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data

    // Manejar tutorial finalizado
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      if (tutorialId) {
        // Marcar tutorial como completado
        setClientCookie(`tutorial_completed_${tutorialId}`, 'true', {
          maxAge: 365 * 24 * 60 * 60, // 1 year
        })

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
        nextStep()
      } else if (action === ACTIONS.PREV) {
        previousStep()
      } else if (action === ACTIONS.CLOSE) {
        stopTutorial()
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

    console.log('🎯 Step check:', {
      target: currentStep.target,
      selector: targetSelector,
      elementFound: !!element,
      isInput:
        element &&
        (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA'),
      pathname,
      stepPage: currentStep.page,
      hasTriggerAction: !!currentStep.triggerAction,
    })

    // Si el elemento no está visible, buscar dentro de modales
    if (!element) {
      console.log(
        '🔍 Element not found in main document, searching in modals...'
      )

      // Buscar en todos los modales abiertos
      const modals = document.querySelectorAll('[role="dialog"]')
      for (const modal of modals) {
        const foundInModal = modal.querySelector(targetSelector)
        if (foundInModal) {
          element = foundInModal
          console.log('✅ Found element in modal:', modal)
          break
        }
      }
    }

    // Si el elemento aún no está visible pero hay triggerAction, marcar como listo de todos modos
    if (!element && currentStep.triggerAction) {
      console.log(
        '⏳ Element not found but has triggerAction, setting isReady = true'
      )
      setIsReady(true)
      return
    }

    // Si el elemento aún no está visible, esperar un poco más
    if (!element) {
      const timer = setTimeout(() => {
        console.log('⏳ Element still not found, setting isReady = true anyway')
        setIsReady(true)
      }, 1000)
      return () => clearTimeout(timer)
    }

    // Si es un input, desactivar temporalmente el spotlight para permitir interacción normal
    // if (
    //   element &&
    //   (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
    // ) {
    //   console.log('📝 Target is input, adjusting Joyride for input interaction')

    //   // Solo marcar como listo, Joyride se encargará del resto
    //   setIsReady(true)
    //   return
    // }

    console.log('✅ Element found, setting isReady = true')
    setIsReady(true)
  }, [isActive, isPaused, pathname, getCurrentStep, router, stepIndex])

  // Efecto para mostrar modal de bienvenida a usuarios trial nuevos
  useEffect(() => {
    console.log('🔍 Modal check:', {
      pathname,
      tutorialStarted,
      isActive,
      showModal,
      modalShownThisSession,
      businessAccountId,
    })

    // Permitir mostrar modal en dashboard o services para usuarios trial que no han empezado
    const isOnValidPage =
      pathname === '/admin' ||
      pathname === '/admin/dashboard' ||
      pathname === '/admin/services'

    // Simplificar temporalmente: si está en página válida y no hay tutorial activo, mostrar modal
    if (
      isOnValidPage &&
      !tutorialStarted &&
      !isActive &&
      !showModal &&
      businessAccountId
    ) {
      const timer = setTimeout(() => {
        console.log('📋 Showing welcome modal (simplified)')
        setShowModal(true)
        setModalShownThisSession(true)
      }, 1000) // Reducir delay para debugging
      return () => clearTimeout(timer)
    }
  }, [
    pathname,
    tutorialStarted,
    isActive,
    showModal,
    modalShownThisSession,
    businessAccountId,
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
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement

      // Crear un estilo dinámico para permitir la interacción con inputs
      const styleId = 'joyride-input-fix'
      let styleElement = document.getElementById(styleId)

      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        document.head.appendChild(styleElement)
      }

      // Estilos CSS para permitir interacción con inputs durante el tutorial
      styleElement.textContent = `
        .react-joyride__tooltip button {
          pointer-events: auto !important;
        }
        .react-joyride__overlay {
          pointer-events: none !important;
        }
        .react-joyride__beacon {
          pointer-events: none !important;
        }
      `

      // Agregar clase específica al input para asegurar interacción
      inputElement.classList.add('joyride-interactive-input')

      // Función para prevenir selección de texto no deseada
      const preventTextSelection = (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement
        if (target && target.value) {
          // Colocar el cursor al final del texto para evitar la selección
          target.setSelectionRange(target.value.length, target.value.length)
        }
      }

      // Función para manejar el input del teclado
      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement
        if (target) {
          // Asegurar que el cursor se mantenga en la posición correcta después de escribir
          setTimeout(() => {
            target.setSelectionRange(target.value.length, target.value.length)
          }, 0)
        }
      }

      // Agregar event listeners para manejar interacción del usuario
      inputElement.addEventListener('focus', preventTextSelection)
      inputElement.addEventListener('input', handleInput)

      return () => {
        const style = document.getElementById(styleId)
        if (style) {
          style.remove()
        }
        inputElement.classList.remove('joyride-interactive-input')
        inputElement.removeEventListener('focus', preventTextSelection)
        inputElement.removeEventListener('input', handleInput)
      }
    }
  }, [isActive, isReady, shouldRun, getCurrentStep])

  // Efecto para prevenir selección automática de texto en inputs durante tutoriales
  useEffect(() => {
    if (!isActive) return

    const currentStep = getCurrentStep()
    if (!currentStep) return

    // Solo procesar si el paso actual es un input
    const selector = currentStep.target.startsWith('[')
      ? currentStep.target
      : `[data-tutorial="${currentStep.target}"]`
    const element = document.querySelector(selector)

    if (
      element &&
      (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
    ) {
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement

      // Solución directa: prevenir selección automática inmediatamente
      const preventSelection = () => {
        if (
          inputElement.selectionStart !== inputElement.selectionEnd &&
          inputElement.value
        ) {
          const length = inputElement.value.length
          inputElement.setSelectionRange(length, length)
          console.log(
            '🔍 Prevented automatic text selection in input during tutorial'
          )
        }
      }

      // Ejecutar inmediatamente y después de un pequeño delay
      preventSelection()
      const timeout1 = setTimeout(preventSelection, 10)
      const timeout2 = setTimeout(preventSelection, 50)

      // Limpiar timeouts al finalizar el efecto
      return () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
      }
    }
  }, [isActive, stepIndex, getCurrentStep])

  // Efecto para iniciar/parar Joyride
  useEffect(() => {
    console.log('🎮 Tutorial state:', {
      isActive,
      isPaused,
      isReady,
      tutorialId,
    })
    if (isActive && !isPaused && isReady) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        console.log('✅ Starting Joyride with tutorial:', tutorialId)

        // Antes de iniciar Joyride, verificar si hay un modal abierto y cerrarlo
        const modal = document.querySelector('[role="dialog"]')
        if (modal && modal.getAttribute('aria-expanded') === 'true') {
          console.log('🔐 Modal detectado, esperando que se cierre...')
          return // No iniciar Joyride mientras haya un modal abierto
        }

        setShouldRun(true)
      }, 500) // Aumentar delay para dar tiempo a que el modal se cierre
      return () => clearTimeout(timer)
    } else {
      setShouldRun(false)
    }
  }, [isActive, isPaused, isReady, tutorialId])

  const handleStartTutorial = () => {
    console.log('🚀 Starting tutorial from welcome modal')
    console.log('📞 Calling startTutorialAfterWelcome...')
    const result = startTutorialAfterWelcome()
    console.log('📞 startTutorialAfterWelcome result:', result)
    setShowModal(false)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  // Determinar si el paso actual es un input para ajustar configuración
  const getIsCurrentStepInput = () => {
    const currentStep = getCurrentStep()
    if (!currentStep) return false

    const selector = currentStep.target.startsWith('[')
      ? currentStep.target
      : `[data-tutorial="${currentStep.target}"]`
    const element = document.querySelector(selector)
    return (
      element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
    )
  }

  const isCurrentStepInput = getIsCurrentStepInput()

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
        scrollToFirstStep={true}
        disableOverlay={isCurrentStepInput ? true : false} // Desactivar overlay solo para inputs
        disableScrolling={false}
        debug={true}
        spotlightPadding={0}
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            primaryColor: '#0ea5e9',
            textColor: '#333',
            zIndex: 10000,
            overlayColor: 'rgba(0, 0, 0, 0.1)',
            // Permitir interacción con elementos debajo del overlay
            ...(isCurrentStepInput && {
              overlayColor: 'rgba(0, 0, 0, 0)',
            }),
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
          overlay: {
            // Overlay transparente para no bloquear interacción cuando está habilitado
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            ...(isCurrentStepInput && {
              backgroundColor: 'rgba(0, 0, 0, 0)',
              pointerEvents: 'none',
            }),
          },
        }}
        locale={{
          back: 'Anterior',
          close: 'Cerrar',
          last: 'Finalizar',
          next: 'Siguiente',
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
