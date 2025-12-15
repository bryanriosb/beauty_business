'use client'

import { useTutorialStore } from '@/lib/store/tutorial-store'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride'
import { TUTORIALS } from '@/const/tutorials'
import { setClientCookie } from '@/lib/utils/cookies'
import { WelcomeModal } from './WelcomeModal'
import { useTutorial } from '@/hooks/use-tutorial'
import { useBusinessAccount } from '@/hooks/use-business-account'
import { useCurrentUser } from '@/hooks/use-current-user'

const TUTORIAL_COOKIE_PREFIX = 'tutorial_completed_'

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

    return tutorial.steps.map((step) => {
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

  // Manejar callback de Joyride
  const handleCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data

    // Manejar tutorial finalizado
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      if (tutorialId) {
        // Marcar tutorial como completado
        setClientCookie(`${TUTORIAL_COOKIE_PREFIX}${tutorialId}`, 'true', {
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

  // Manejar navegación automática entre páginas
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

    // Si estamos en la página correcta, verificar si el elemento está disponible
    const targetSelector = currentStep.target.startsWith('[')
      ? currentStep.target
      : `[data-tutorial="${currentStep.target}"]`

    const element = document.querySelector(targetSelector)

    console.log('🎯 Step check:', {
      target: currentStep.target,
      selector: targetSelector,
      elementFound: !!element,
      pathname,
      stepPage: currentStep.page,
    })

    // Si el elemento no está visible, esperar un poco más
    if (!element) {
      const timer = setTimeout(() => {
        console.log('⏳ Element not found, setting isReady = true anyway')
        setIsReady(true)
      }, 1000)
      return () => clearTimeout(timer)
    }

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
      businessAccountId: businessAccountId,
    })

    // Solo en el dashboard para usuarios trial que no han empezado el tutorial y no se ha mostrado esta sesión
    if (
      pathname === '/admin/dashboard' &&
      !tutorialStarted &&
      !isActive &&
      !showModal &&
      !modalShownThisSession &&
      businessAccountId
    ) {
      const timer = setTimeout(() => {
        console.log('📋 Showing welcome modal')
        setShowModal(true)
        setModalShownThisSession(true)
      }, 1500) // 1.5 segundos después de cargar
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
        setShouldRun(true)
      }, 300)
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
        disableOverlayClose={true}
        debug={false}
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            primaryColor: '#0ea5e9',
            textColor: '#333',
            zIndex: 10000,
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
