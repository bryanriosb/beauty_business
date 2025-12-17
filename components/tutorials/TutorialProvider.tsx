'use client'

import { useTutorialStore } from '@/lib/store/tutorial-store'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride'
import {
  TUTORIALS,
  type TutorialStep,
  type TutorialSubStep,
} from '@/const/tutorials'
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
    isInSubSteps,
    subStepIndex,
    stopTutorial,
    nextStep,
    previousStep,
    setStepIndex,
    getCurrentStep,
    getCurrentSubStep,
    enterSubSteps,
    exitSubSteps,
    nextSubStep,
    previousSubStep,
    getTotalSubSteps,
  } = useTutorialStore()

  const { startTutorialAfterWelcome } = useTutorial()
  const { tutorialStarted, isLoading, canUseTutorialStatus, activeBusiness } =
    useActiveBusinessAccount()

  const [shouldRun, setShouldRun] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Helper para convertir target a selector
  const getTargetSelector = (target: string) => {
    if (
      target &&
      !target.startsWith('[') &&
      !target.startsWith('#') &&
      !target.startsWith('.')
    ) {
      return `[data-tutorial="${target}"]`
    }
    return target
  }

  // Obtener los pasos del tutorial actual (incluyendo sub-pasos si estamos en ellos)
  const getJoyrideSteps = () => {
    if (!tutorialId || !isActive) return []

    const tutorial = TUTORIALS[tutorialId]
    if (!tutorial) return []

    // Si estamos en sub-pasos, retornar solo los sub-pasos del paso actual
    if (isInSubSteps) {
      const currentStep = getCurrentStep()
      if (!currentStep?.subSteps?.steps) return []

      return currentStep.subSteps.steps.map((subStep) => {
        const targetSelector = getTargetSelector(subStep.target)
        const element = document.querySelector(targetSelector)
        const finalTarget = element ? targetSelector : 'body'

        return {
          ...subStep,
          target: finalTarget,
          content: subStep.content,
          disableBeacon: subStep.disableBeacon || !element,
        }
      })
    }

    // Si no estamos en sub-pasos, retornar los pasos principales
    return tutorial.steps.map((step) => {
      const targetSelector = getTargetSelector(step.target)
      const element = document.querySelector(targetSelector)
      const finalTarget = element ? targetSelector : 'body'

      return {
        ...step,
        target: finalTarget,
        content: step.content,
        disableBeacon: step.disableBeacon || !element,
      }
    })
  }

  // Función genérica para encontrar el elemento trigger
  const findTriggerElement = useCallback((selector: string): Element | null => {
    console.log('🎯 findTriggerElement buscando:', selector)

    // Si hay múltiples selectores (separados por coma)
    const selectors = selector.split(',').map((s) => s.trim())

    // Primero intentar con el selector exacto en todo el documento
    for (const sel of selectors) {
      let element = document.querySelector(sel)
      console.log('🎯 Selector exacto:', sel, 'resultado:', !!element)

      if (element) return element
    }

    // Buscar específicamente dentro del Popover del CustomerSelector
    const popoverContent =
      document.querySelector('[data-radix-popper-content-wrapper]') ||
      document.querySelector('[role="listbox"]') ||
      document.querySelector('.PopoverContent')

    if (popoverContent) {
      console.log('🎯 Buscando dentro del Popover')
      for (const sel of selectors) {
        const elementInPopover = popoverContent.querySelector(sel)
        console.log(
          '🎯 Selector en Popover:',
          sel,
          'resultado:',
          !!elementInPopover
        )
        if (elementInPopover) return elementInPopover
      }

      // Búsqueda por texto dentro del Popover
      const elementsInPopover = popoverContent.querySelectorAll('*')
      for (const el of elementsInPopover) {
        const textContent = el.textContent?.trim().toLowerCase()
        if (textContent?.includes('crear nuevo cliente')) {
          console.log('🎯 Encontrado "Crear nuevo cliente" en Popover:', el)
          return el
        }
      }
    }

    // Búsqueda más genérica como fallback
    console.log('🎯 Búsqueda genérica fallback')
    const allElements = document.querySelectorAll('*')
    for (const el of allElements) {
      const textContent = el.textContent?.trim().toLowerCase()

      if (textContent?.includes('crear nuevo cliente')) {
        const hasDataTutorial = el.hasAttribute('data-tutorial')
        const isNotMainButton =
          !hasDataTutorial ||
          el.getAttribute('data-tutorial')?.includes('customer')

        if (isNotMainButton) {
          console.log('🎯 Encontrado "Crear nuevo cliente" genérico:', el)
          return el
        }
      }
    }

    console.log('🎯 No se encontró ningún elemento')
    return null
  }, [])

  // Función genérica para verificar si un modal está listo
  const isModalReady = useCallback(
    (subSteps: NonNullable<TutorialStep['subSteps']>): boolean => {
      const modalSelector = subSteps.modalSelector || '[role="dialog"]'
      const modals = document.querySelectorAll(modalSelector)

      console.log('🎪 isModalReady: modales encontrados:', modals.length)

      // Si no hay modales, no está listo
      if (modals.length === 0) {
        console.log('🎪 No hay modales')
        return false
      }

      // Buscar el modal de crear cliente específicamente
      let targetModal: Element | null = null

      for (let i = 0; i < modals.length; i++) {
        const modal = modals[i]

        // Verificar si este modal contiene elementos del formulario de cliente
        const hasCustomerForm =
          modal.querySelector('[data-tutorial="customer-first-name"]') ||
          modal.querySelector('[id="first_name"]') ||
          (modal.textContent?.includes('Nombre') &&
            modal.textContent?.includes('Correo electrónico'))

        console.log(
          `🎪 Modal ${i}: tiene formulario cliente:`,
          !!hasCustomerForm
        )

        if (hasCustomerForm) {
          targetModal = modal
          break
        }
      }

      // Si no encontramos el modal específico, usar el último
      if (!targetModal) {
        targetModal = modals[modals.length - 1]
        console.log('🎪 Usando último modal como fallback')
      }

      // Múltiples métodos para verificar visibilidad
      const htmlModal = targetModal as HTMLElement
      const isVisible =
        htmlModal.offsetParent !== null ||
        htmlModal.style.display !== 'none' ||
        !htmlModal.classList.contains('hidden') ||
        getComputedStyle(htmlModal).display !== 'none'

      console.log('🎪 Modal visible (múltiples métodos):', isVisible)
      console.log('🎪 Modal offsetParent:', htmlModal.offsetParent)
      console.log('🎪 Modal display style:', htmlModal.style.display)
      console.log(
        '🎪 Modal computed display:',
        getComputedStyle(htmlModal).display
      )

      if (!isVisible) return false

      // Verificar que el modal contenga al menos uno de los elementos de los sub-pasos
      const firstSubStep = subSteps.steps[0]
      if (firstSubStep) {
        const targetSelector = getTargetSelector(firstSubStep.target)
        const hasTargetElement = targetModal.querySelector(targetSelector)
        console.log(
          '🎪 Buscando elemento:',
          targetSelector,
          'encontrado:',
          !!hasTargetElement
        )

        if (!hasTargetElement) {
          // Fallback: buscar por ID si el data-tutorial no funciona
          const fallbackElement = targetModal.querySelector('[id="first_name"]')
          console.log('🎪 Fallback por ID "first_name":', !!fallbackElement)
          return !!fallbackElement
        }

        return true
      }

      return true
    },
    []
  )

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
          const element = selector ? findTriggerElement(selector) : null
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
    [findTriggerElement]
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

  // Función para abrir modal anidado y entrar en sub-pasos
  const openNestedModalAndEnterSubSteps = useCallback(
    (subSteps: NonNullable<TutorialStep['subSteps']>) => {
      console.log('🎓 openNestedModalAndEnterSubSteps iniciado', subSteps)
      setIsReady(false)
      setShouldRun(false)

      // PASO 1: Abrir el CustomerSelector principal
      const customerSelector = document.querySelector(
        '[data-tutorial="appointment-customer-select"]'
      )
      if (customerSelector && 'click' in customerSelector) {
        console.log('🎓 Paso 1: Abriendo CustomerSelector')
        ;(customerSelector as HTMLElement).click()
      } else {
        console.error('🎓 No se encontró el CustomerSelector')
        setIsReady(true)
        setShouldRun(true)
        return
      }

      // PASO 2: Esperar a que aparezca el Popover y buscar el botón "Crear nuevo cliente"
      const checkPopoverAndClickCreate = () => {
        console.log('🎓 Paso 2: Verificando Popover abierto')

        const popoverContent = document.querySelector(
          '[data-radix-popper-content-wrapper]'
        )
        const createButton = findTriggerElement(subSteps.triggerSelector)

        if (popoverContent && createButton && 'click' in createButton) {
          console.log(
            '🎓 Paso 2: Popover abierto, haciendo clic en Crear nuevo cliente'
          )
          ;(createButton as HTMLElement).click()

          // PASO 3: Esperar a que el modal de crear cliente esté listo
          setTimeout(() => {
            checkModalReady()
          }, 300)
        } else {
          // Reintentar por un tiempo limitado
          const retryCount = (checkPopoverAndClickCreate as any).retryCount || 0
          if (retryCount > 10) {
            console.error('🎓 Timeout esperando Popover')
            setIsReady(true)
            setShouldRun(true)
            return
          }
          ;(checkPopoverAndClickCreate as any).retryCount = retryCount + 1
          setTimeout(checkPopoverAndClickCreate, 200)
        }
      }

      // PASO 3: Verificar que el modal de crear cliente esté listo
      const checkModalReady = () => {
        console.log('🎓 Paso 3: Verificando modal de crear cliente')
        const modalReady = isModalReady(subSteps)
        console.log('🎓 Modal ready:', modalReady)

        if (modalReady) {
          console.log('🎓 Entrando en sub-pasos')
          enterSubSteps()
          setTimeout(() => {
            setIsReady(true)
            setShouldRun(true)
          }, 500)
        } else {
          const retryCount = (checkModalReady as any).retryCount || 0
          if (retryCount > 20) {
            console.error('🎓 Timeout esperando modal')
            setIsReady(true)
            setShouldRun(true)
            return
          }
          ;(checkModalReady as any).retryCount = retryCount + 1
          setTimeout(checkModalReady, 100)
        }
      }

      // Iniciar la secuencia
      setTimeout(checkPopoverAndClickCreate, 300) // Dar tiempo para que el Popover se abra
    },
    [enterSubSteps, findTriggerElement, isModalReady]
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
      // Si estamos en sub-pasos, salir de ellos primero
      if (isInSubSteps) {
        exitSubSteps()
        return
      }

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
        // Si estamos en sub-pasos
        if (isInSubSteps) {
          const totalSubSteps = getTotalSubSteps()
          if (subStepIndex + 1 >= totalSubSteps) {
            // Completamos todos los sub-pasos
            const currentStep = getCurrentStep()
            const onComplete = currentStep?.subSteps?.onComplete

            if (onComplete === 'close-modal') {
              // Cerrar el modal anidado
              const closeButton = document.querySelector(
                '[role="dialog"]:last-of-type [data-slot="dialog-close"]'
              )
              if (closeButton && 'click' in closeButton) {
                ;(closeButton as HTMLElement).click()
              }
            }

            // Salir de sub-pasos y continuar con el paso principal
            exitSubSteps()
            setIsReady(false)
            setTimeout(() => {
              setIsReady(true)
            }, 500)
          } else {
            // Avanzar al siguiente sub-paso
            nextSubStep()
          }
          return
        }

        // Verificar si el paso actual tiene sub-pasos
        const currentStep = getCurrentStep()
        if (currentStep?.subSteps) {
          // Abrir modal anidado y entrar en sub-pasos solo cuando el usuario avanza
          openNestedModalAndEnterSubSteps(currentStep.subSteps)
          return
        }

        // Ejecutar triggerAction si existe
        if (currentStep?.triggerAction) {
          executeTriggerAction(currentStep.triggerAction)
        }

        // Avanzar al siguiente paso
        nextStep()

        // TEMPORALMENTE DESHABILITADO: Forzar focus en el input/select del siguiente paso
        // setTimeout(() => forceFocusOnInput(index + 1), 100)
      } else if (action === ACTIONS.PREV) {
        // Si estamos en sub-pasos
        if (isInSubSteps) {
          if (subStepIndex <= 0) {
            // Salir de sub-pasos y volver al paso principal
            exitSubSteps()
            // Cerrar el modal anidado
            const closeButton = document.querySelector(
              '[role="dialog"]:last-of-type [data-slot="dialog-close"]'
            )
            if (closeButton && 'click' in closeButton) {
              ;(closeButton as HTMLElement).click()
            }
            setIsReady(false)
            setTimeout(() => {
              setIsReady(true)
            }, 500)
          } else {
            previousSubStep()
          }
          return
        }

        previousStep()

        // TEMPORALMENTE DESHABILITADO: También forzar focus al ir atrás
        // setTimeout(() => forceFocusOnInput(index - 1), 100)
      }
    }

    // Actualizar índice si es necesario
    if (type === EVENTS.STEP_BEFORE) {
      if (isInSubSteps) {
        // No actualizar stepIndex principal cuando estamos en sub-pasos
        return
      }
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

    console.log('🔍 Navegación: buscando target para paso', currentStep.target)
    console.log('🔍 Selector:', targetSelector)

    let element = document.querySelector(targetSelector)
    console.log('🔍 Elemento encontrado inicial:', !!element)

    // Si el elemento no está visible, buscar dentro de modales
    if (!element) {
      console.log('🔍 Buscando dentro de modales...')
      // Buscar en todos los modales abiertos
      const modals = Array.from(document.querySelectorAll('[role="dialog"]'))
      console.log('🔍 Modales encontrados:', modals.length)

      for (const modal of modals) {
        const foundInModal = modal.querySelector(targetSelector)
        if (foundInModal) {
          console.log('🔍 Elemento encontrado en modal:', foundInModal)
          element = foundInModal
          break
        }
      }
    }

    // Si el elemento aún no está visible pero hay triggerAction, marcar como listo de todos modos
    if (!element && currentStep.triggerAction) {
      console.log('🔍 Hay triggerAction, marcando como listo sin elemento')
      setIsReady(true)
      return
    }

    // Para pasos específicos que deben estar dentro de modales, esperar más tiempo
    if (
      !element &&
      (currentStep.target === 'appointment-customer-select' ||
        currentStep.target === 'appointment-service-select')
    ) {
      console.log(
        '🔍 Elemento de select no encontrado, esperando más tiempo...'
      )
      const checkElementInModal = () => {
        setTimeout(() => {
          const elementAgain = document.querySelector(targetSelector)
          if (elementAgain) {
            console.log(
              '🔍 Elemento encontrado después de espera:',
              elementAgain
            )
            setIsReady(true)
          } else {
            console.log(
              '🔍 Aún no encontrado, marcando como ready para permitir interacción'
            )
            setIsReady(true)
          }
        }, 1000) // Esperar 1 segundo más
      }
      checkElementInModal()
      return
    }

    console.log('🔍 Marcando como ready - elemento encontrado:', !!element)
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

    // Solo mostrar modal si hay un business activo y tutorial_started es false
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

  // Efecto para inyectar estilos CSS globales durante el tutorial
  // Esto permite que los botones de Joyride y los dropdowns funcionen correctamente
  useEffect(() => {
    if (!isActive || !shouldRun) return

    // Crear un estilo dinámico para el tutorial
    const styleId = 'joyride-tutorial-styles'
    let styleElement = document.getElementById(styleId)

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    // Estilos CSS globales para el tutorial:
    // 1. Habilitar pointer-events en los botones del tooltip de Joyride
    // 2. Asegurar que los dropdowns/popovers estén por encima del overlay de Joyride
    // 3. Deshabilitar pointer-events en spotlight para evitar interferencia con selects/popovers
    styleElement.textContent = `
      .react-joyride__tooltip button {
        pointer-events: auto !important;
      }
      .radix-popover-content,
      .PopoverContent,
      [data-radix-popper-content-wrapper],
      [role="listbox"] {
        z-index: 10001 !important;
      }

      /* Estilos para permitir interacción con inputs y selects */
      .react-joyride__overlay {
        pointer-events: none !important;
        
      }

      /* Deshabilitar pointer-events en el spotlight para que no interfiera con clicks en selects */
      .react-joyride__spotlight {
        pointer-events: none !important;
      }

      /* Asegurar que el beacon no interfiera */
      .react-joyride__beacon {
        pointer-events: auto !important;
      }
    `

    return () => {
      const style = document.getElementById(styleId)
      if (style) {
        style.remove()
      }
    }
  }, [isActive, shouldRun])

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

  // Calcular el índice actual y total para el progress
  const currentIndex = isInSubSteps ? subStepIndex : stepIndex
  const totalSteps = getJoyrideSteps().length

  // Renderizar Joyride solo si hay tutorial activo
  const tutorialComponent =
    isActive && tutorialId ? (
      <Joyride
        steps={getJoyrideSteps()}
        run={shouldRun}
        stepIndex={currentIndex}
        callback={handleCallback}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        disableScrolling={false} // Permitir scrolling en subpasos para llegar a inputs
        disableOverlayClose={true} // Evitar que el tutorial se cierre con clicks fuera
        disableOverlay={isInSubSteps} // Quitar overlay en subpasos para permitir interacción
        spotlightClicks={true} // Permitir clicks a través del spotlight hacia los elementos
        debug={false}
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            primaryColor: '#0ea5e9',
            textColor: '#333',
            zIndex: isInSubSteps ? 10001 : 10000, // Mayor z-index en subpasos
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
          back: isInSubSteps && subStepIndex === 0 ? 'Volver' : 'Anterior',
          close: 'Cerrar',
          last: isInSubSteps ? 'Continuar' : 'Finalizar',
          nextLabelWithProgress: `Siguiente ${
            currentIndex + 1
          } de ${totalSteps}`,
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
