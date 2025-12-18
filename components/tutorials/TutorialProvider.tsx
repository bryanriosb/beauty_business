'use client'

import { useTutorialStore } from '@/lib/store/tutorial-store'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride'
import {
  TUTORIALS,
  type TutorialStep,
} from '@/const/tutorials'
import { WelcomeModal } from './WelcomeModal'
import { useTutorial } from '@/hooks/use-tutorial'
import { useActiveBusinessAccount } from '@/hooks/use-active-business-account'
import { useTrialContext } from '../trial/TrialProviderClient'
import { updateTutorialStartedAction } from '@/lib/actions/business-account'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

export function TutorialProvider() {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { openMobile, setOpenMobile } = useSidebar()

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
    enterSubSteps,
    exitSubSteps,
    nextSubStep,
    previousSubStep,
    getTotalSubSteps,
  } = useTutorialStore()

  const { startTutorialAfterWelcome } = useTutorial()
  const { tutorialStarted, isLoading, canUseTutorialStatus, activeBusiness } =
    useActiveBusinessAccount()
  const serverData = useTrialContext()

  const [shouldRun, setShouldRun] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [notShowWelcome, setNotShowWelcome] = useState(true) // Default true to prevent flash

  // Cargar valor de sessionStorage solo en el cliente
  useEffect(() => {
    setNotShowWelcome(sessionStorage.getItem('not_show_welcome') === 'true')
  }, [])

  // Lista de targets que están en el sidebar/menú
  const SIDEBAR_MENU_TARGETS = [
    'services-menu',
    'settings-menu',
    'business-hours-menu',
    'appointments-menu',
    'specialists-menu',
    'customers-menu',
    'inventory-menu',
    'reports-menu',
    'dashboard-menu',
  ]

  // Helper para verificar si el target actual es un elemento del sidebar
  const isTargetInSidebar = useCallback((target: string): boolean => {
    return SIDEBAR_MENU_TARGETS.some(
      (menuTarget) => target === menuTarget || target.includes('-menu')
    )
  }, [])

  // Efecto para abrir el sidebar en móvil cuando el tutorial necesita apuntar a un menú
  useEffect(() => {
    if (!isActive || !isMobile) return

    const currentStep = getCurrentStep()
    if (!currentStep) return

    const targetIsSidebarMenu = isTargetInSidebar(currentStep.target)

    if (targetIsSidebarMenu && !openMobile) {
      // Abrir el sidebar drawer en móvil
      setOpenMobile(true)
    } else if (!targetIsSidebarMenu && openMobile) {
      // Cerrar el sidebar si el target no es un menú (para permitir ver el contenido)
      // Solo cerrar si el tutorial necesita que el usuario vea la página principal
      const shouldCloseSidebar = currentStep.page && pathname === currentStep.page
      if (shouldCloseSidebar) {
        setOpenMobile(false)
      }
    }
  }, [isActive, isMobile, stepIndex, getCurrentStep, openMobile, setOpenMobile, isTargetInSidebar, pathname])

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

        // Marcar tutorial como completado en la base de datos
        if (activeBusiness?.business_account_id) {
          updateTutorialStartedAction(
            activeBusiness.business_account_id,
            true
          ).catch(console.error)
        }

        // Guardar en sessionStorage para evitar que el modal aparezca de nuevo
        sessionStorage.setItem('not_show_welcome', 'true')
        setNotShowWelcome(true)
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

    // Usar datos del servidor si están disponibles, sino datos del hook
    const actualTutorialStarted = serverData ? serverData.tutorialStarted : tutorialStarted
    // Solo mostrar modal si hay un business activo y tutorial_started es false
    if (
      isOnValidPage &&
      !isLoading &&
      canUseTutorialStatus &&
      !actualTutorialStarted &&
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
    notShowWelcome,
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
    // 4. Permitir scroll dentro de modales durante el tutorial
    // 5. Estilos responsivos para móvil
    // 6. Soporte para modales anidados (sidebar Sheet en móvil)
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

      .react-joyride__overlay {
        pointer-events: none !important;
        background-color: transparent !important;
      }

      /* Deshabilitar pointer-events en el spotlight para que no interfiera con clicks en selects */
      .react-joyride__spotlight {
        pointer-events: none !important;
      }

      /* Asegurar que el beacon no interfiera */
      .react-joyride__beacon {
        pointer-events: auto !important;
      }

      /* Permitir scroll dentro de modales durante el tutorial */
      [role="dialog"] {
        overflow: visible !important;
      }
      [role="dialog"] > div {
        overflow-y: auto !important;
        max-height: 90vh !important;
      }

      /* Asegurar que el contenido scrolleable dentro del modal funcione */
      [data-slot="dialog-content"] {
        overflow-y: auto !important;
        max-height: 90vh !important;
      }

      /* ========== ESTILOS RESPONSIVOS PARA MÓVIL ========== */

      /* Tooltip más compacto en móvil */
      @media (max-width: 767px) {
        .react-joyride__tooltip {
          max-width: calc(100vw - 32px) !important;
          width: auto !important;
          padding: 12px !important;
          margin: 8px !important;
          font-size: 13px !important;
        }

        .react-joyride__tooltip__content {
          padding: 0 !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
        }

        .react-joyride__tooltip__title {
          font-size: 15px !important;
          margin-bottom: 8px !important;
        }

        .react-joyride__tooltip__footer {
          margin-top: 12px !important;
          gap: 8px !important;
        }

        .react-joyride__tooltip button {
          padding: 8px 12px !important;
          font-size: 13px !important;
          min-height: 36px !important;
        }

        /* Reducir tamaño del spotlight en móvil */
        .react-joyride__spotlight {
          border-radius: 4px !important;
        }

        /* Ajustar floater positioning en móvil */
        .__floater {
          max-width: calc(100vw - 16px) !important;
        }

        .__floater__body {
          max-width: calc(100vw - 24px) !important;
        }
      }

      /* ========== SOPORTE PARA SIDEBAR DRAWER EN MÓVIL ========== */

      /* Asegurar que el Sheet/Drawer del sidebar tenga z-index correcto durante tutorial */
      [data-sidebar="sidebar"][data-mobile="true"] {
        z-index: 10002 !important;
      }

      /* El contenido del Sheet debe estar por encima del overlay de Joyride */
      [data-slot="sidebar"] [data-radix-dialog-content] {
        z-index: 10002 !important;
      }

      /* ========== SOPORTE PARA MODALES ANIDADOS ========== */

      /* Todos los modales durante el tutorial deben estar por encima del spotlight */
      [data-slot="dialog-overlay"],
      [data-radix-dialog-overlay] {
        z-index: 10000 !important;
      }

      [data-slot="dialog-content"],
      [role="dialog"]:not([data-mobile="true"]):not([data-sidebar="sidebar"]) {
        z-index: 10001 !important;
      }

      /* El segundo overlay de modal (anidado) tiene mayor z-index */
      body > [data-radix-portal]:nth-of-type(n+2) [data-radix-dialog-overlay],
      body > [data-radix-portal]:nth-of-type(n+2) [data-slot="dialog-overlay"] {
        z-index: 10002 !important;
      }

      /* El contenido del segundo modal (anidado) tiene mayor z-index */
      body > [data-radix-portal]:nth-of-type(n+2) [role="dialog"],
      body > [data-radix-portal]:nth-of-type(n+2) [data-slot="dialog-content"] {
        z-index: 10003 !important;
      }

      /* Tercer modal anidado si existe */
      body > [data-radix-portal]:nth-of-type(n+3) [data-radix-dialog-overlay] {
        z-index: 10004 !important;
      }
      body > [data-radix-portal]:nth-of-type(n+3) [role="dialog"] {
        z-index: 10005 !important;
      }

      /* Asegurar que el tooltip de Joyride siempre esté visible */
      .react-joyride__tooltip {
        z-index: 10010 !important;
      }

      /* Floater de Joyride (contenedor del tooltip) */
      .__floater {
        z-index: 10010 !important;
      }

      /* Asegurar que el spotlight no bloquee interacciones dentro de modales */
      .react-joyride__spotlight {
        pointer-events: none !important;
      }

      /* Permitir interacción con elementos dentro de modales durante el tutorial */
      [role="dialog"] input,
      [role="dialog"] select,
      [role="dialog"] textarea,
      [role="dialog"] button,
      [role="dialog"] [role="combobox"],
      [role="dialog"] [role="listbox"] {
        pointer-events: auto !important;
        position: relative;
        z-index: inherit;
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

  // Estilos base de Joyride adaptados para móvil
  const joyrideStyles = {
    options: {
      arrowColor: '#fff',
      backgroundColor: '#fff',
      primaryColor: '#fada99',
      textColor: '#333',
      zIndex: isInSubSteps ? 10001 : 10000,
      // Ancho máximo más pequeño en móvil
      width: isMobile ? 280 : 380,
    },
    tooltip: {
      borderRadius: isMobile ? '12px' : '8px',
      fontWeight: '500',
      padding: isMobile ? '12px' : '16px',
      fontSize: isMobile ? '13px' : '14px',
      maxWidth: isMobile ? 'calc(100vw - 32px)' : '380px',
    },
    tooltipContent: {
      padding: isMobile ? '0' : '8px 0',
      fontSize: isMobile ? '13px' : '14px',
      lineHeight: isMobile ? '1.4' : '1.5',
    },
    tooltipTitle: {
      fontSize: isMobile ? '15px' : '16px',
      marginBottom: isMobile ? '8px' : '12px',
    },
    tooltipFooter: {
      marginTop: isMobile ? '12px' : '16px',
    },
    buttonNext: {
      backgroundColor: '#fada99',
      fontSize: isMobile ? '13px' : '14px',
      fontWeight: '600',
      color: '#333',
      padding: isMobile ? '8px 12px' : '10px 16px',
      borderRadius: isMobile ? '8px' : '6px',
    },
    buttonBack: {
      fontSize: isMobile ? '13px' : '14px',
      fontWeight: '600',
      color: '#6b7280',
      padding: isMobile ? '8px 12px' : '10px 16px',
    },
    buttonSkip: {
      fontSize: isMobile ? '12px' : '14px',
      fontWeight: '600',
      color: '#6b7280',
    },
    spotlight: {
      borderRadius: isMobile ? '8px' : '4px',
    },
  }

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
        disableScrolling={true}
        disableOverlayClose={true}
        disableOverlay={isInSubSteps}
        spotlightClicks={true}
        disableScrollParentFix={true}
        floaterProps={{
          disableAnimation: true,
          // Posicionamiento adaptativo para móvil
          styles: {
            floater: {
              maxWidth: isMobile ? 'calc(100vw - 16px)' : '400px',
            },
          },
        }}
        debug={false}
        styles={joyrideStyles}
        locale={{
          back: isInSubSteps && subStepIndex === 0 ? 'Volver' : 'Anterior',
          close: 'Cerrar',
          last: isInSubSteps ? 'Continuar' : 'Finalizar',
          nextLabelWithProgress: isMobile
            ? `${currentIndex + 1}/${totalSteps}`
            : `Siguiente ${currentIndex + 1} de ${totalSteps}`,
          open: 'Abrir el tutorial',
          skip: isMobile ? 'Omitir' : 'Omitir tutorial',
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
