'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTutorialStore } from '@/lib/store/tutorial-store'
import { useCurrentUser } from './use-current-user'
import { useTrialCheck } from './use-trial-check'
import { useBusinessAccount } from './use-business-account'
import { updateTutorialStartedAction } from '@/lib/actions/business-account'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { TUTORIALS, Tutorial } from '@/const/tutorials'

const TUTORIAL_COOKIE_PREFIX = 'tutorial_completed_'
const AUTO_START_TUTORIAL_COOKIE = 'auto_start_tutorial_shown'

export function useTutorial() {
  const { businessAccountId, isAuthenticated, isLoading: authLoading } = useCurrentUser()
  const { isOnTrial, isChecking: trialLoading } = useTrialCheck()
  const { tutorialStarted, isLoading: businessAccountLoading } = useBusinessAccount()
  
  const {
    isActive,
    tutorialId,
    stepIndex,
    isPaused,
    startTutorial: storeStartTutorial,
    stopTutorial,
    pauseTutorial,
    resumeTutorial,
    nextStep,
    previousStep,
    setStepIndex,
    getCurrentStep,
  } = useTutorialStore()

  const [isLoading, setIsLoading] = useState(true)

  const currentTutorial = tutorialId ? TUTORIALS[tutorialId] : null

  // Check if tutorial was completed
  const isTutorialCompleted = useCallback((tutorialId: string): boolean => {
    return getClientCookie(`${TUTORIAL_COOKIE_PREFIX}${tutorialId}`) === 'true'
  }, [])

  // Mark tutorial as completed
  const markTutorialCompleted = useCallback((tutorialId: string) => {
    setClientCookie(`${TUTORIAL_COOKIE_PREFIX}${tutorialId}`, 'true', {
      maxAge: 365 * 24 * 60 * 60, // 1 year
    })
  }, [])

  // Start a specific tutorial
  const startTutorial = useCallback((tutorialId: string, startIndex = 0) => {
    const tutorial = TUTORIALS[tutorialId]
    if (!tutorial) {
      console.log('❌ Tutorial not found:', tutorialId)
      return false
    }

    // Check if tutorial should run (condition function)
    if (tutorial.runCondition && !tutorial.runCondition()) {
      console.log('❌ Tutorial condition failed:', tutorialId)
      return false
    }

    // Para usuarios trial: si están iniciando desde el modal, limpiar cookie de completion
    const isCookieCompleted = isTutorialCompleted(tutorialId)
    if (isOnTrial && isCookieCompleted) {
      console.log('🧹 Clearing completed cookie for trial user:', tutorialId)
      setClientCookie(`${TUTORIAL_COOKIE_PREFIX}${tutorialId}`, 'false')
    }

    // Verificar nuevamente si está completado (después de limpiar para usuarios trial)
    const isNowCompleted = isTutorialCompleted(tutorialId)
    if (isNowCompleted) {
      console.log('❌ Tutorial still completed:', tutorialId, { 
        wasCompleted: isCookieCompleted, 
        isNowCompleted, 
        isOnTrial
      })
      return false
    }

    console.log('✅ Starting tutorial:', tutorialId, { 
      wasCompleted: isCookieCompleted, 
      isNowCompleted, 
      isOnTrial 
    })

    // Marcar tutorial como iniciado en la BD (async, no bloquear)
    updateTutorialStartedAction(businessAccountId!, true).catch(error => {
      console.error('Error updating tutorial_started:', error)
    })

    storeStartTutorial(tutorialId, startIndex)
    return true
  }, [storeStartTutorial, isTutorialCompleted, businessAccountId])

  // Restart tutorial
  const restartTutorial = useCallback((tutorialId: string) => {
    // Reset completion cookie
    setClientCookie(`${TUTORIAL_COOKIE_PREFIX}${tutorialId}`, 'false')
    startTutorial(tutorialId, 0)
  }, [startTutorial])

  // Get available tutorials (not completed)
  const getAvailableTutorials = useCallback((): Tutorial[] => {
    return Object.values(TUTORIALS).filter(tutorial => {
      // Aplicar condición específica para appointment-start (solo trial)
      if (tutorial.id === 'appointment-start') {
        // Solo mostrar si está en trial y no ha iniciado el tutorial
        if (!isOnTrial || tutorialStarted) return false
      }
      
      if (tutorial.runCondition && !tutorial.runCondition()) {
        return false
      }
      return !isTutorialCompleted(tutorial.id)
    })
  }, [isTutorialCompleted, isOnTrial, tutorialStarted])

  // Get Joyride steps (mantener compatibilidad con componentes existentes)
  const getJoyrideSteps = useCallback(() => {
    if (!currentTutorial) return []

    const steps = currentTutorial.steps.map((step) => {
      // Try direct selector first, then data-tutorial selector
      let targetSelector = step.target
      if (step.target && !step.target.startsWith('[') && !step.target.startsWith('#') && !step.target.startsWith('.')) {
        targetSelector = `[data-tutorial="${step.target}"]`
      }
      
      // Check if element exists, fallback to body
      const element = document.querySelector(targetSelector)
      const finalTarget = element ? targetSelector : 'body'

      return {
        ...step,
        target: finalTarget,
        content: step.content,
        // Disable beacon for modal elements until they are visible
        disableBeacon: step.disableBeacon || !element,
      }
    })

    return steps
  }, [currentTutorial])

  // Auto-start logic for trial users - ahora muestra modal de bienvenida primero
  useEffect(() => {
    if (authLoading || trialLoading || businessAccountLoading) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)

    // Only auto-start for authenticated users with business account
    if (!isAuthenticated || !businessAccountId) {
      return
    }

    // Auto-start tutorial for trial users que no han empezado el tutorial
    if (isOnTrial && !tutorialStarted && !isActive) {
      const appointmentTutorial = TUTORIALS['appointment-start']
      
      if (appointmentTutorial && !isTutorialCompleted('appointment-start')) {
        // El modal de bienvenida se encargará de iniciar el tutorial
        // Esto permite que el usuario decida si quiere tomarlo o no
      }
    }
  }, [
    authLoading,
    trialLoading,
    businessAccountLoading,
    isAuthenticated,
    businessAccountId,
    isOnTrial,
    tutorialStarted,
    isTutorialCompleted,
    startTutorial,
    isActive,
  ])

  // Función para iniciar tutorial después del modal
  const startTutorialAfterWelcome = useCallback(() => {
    console.log('🎯 startTutorialAfterWelcome called')
    const appointmentTutorial = TUTORIALS['appointment-start']
    
    // Para usuarios trial, permitir iniciar el tutorial si tutorial_started es false, 
    // sin importar si hay cookies de otros usos
    const isCompleted = isOnTrial ? false : isTutorialCompleted('appointment-start')
    
    if (appointmentTutorial && !isCompleted) {
      console.log('📋 Tutorial available and not completed, starting...')
      console.log('📊 State:', { 
        isOnTrial, 
        tutorialStarted, 
        isCompleted,
        cookieStatus: isTutorialCompleted('appointment-start')
      })
      
      // Marcar auto-start como shown
      setClientCookie(AUTO_START_TUTORIAL_COOKIE, 'true', {
        maxAge: 365 * 24 * 60 * 60, // 1 year
      })

      // Small delay para asegurar transición suave
      setTimeout(() => {
        console.log('🚀 Actually calling startTutorial...')
        const result = startTutorial('appointment-start')
        console.log('🎯 startTutorial result:', result)
      }, 500)
    } else {
      console.log('❌ Tutorial not available or already completed:', {
        tutorialExists: !!appointmentTutorial,
        isCompleted,
        isOnTrial,
        tutorialStarted,
        cookieStatus: isTutorialCompleted('appointment-start')
      })
    }
  }, [startTutorial, isTutorialCompleted, isOnTrial, tutorialStarted])

  return {
    // Estado del tutorial (compatible con código existente)
    runTutorial: isActive && !isPaused,
    tutorialId,
    tutorialIndex: stepIndex,
    currentTutorial,
    isLoading: isLoading || authLoading || trialLoading,
    
    // Acciones básicas
    startTutorial,
    stopTutorial,
    restartTutorial,
    pauseTutorial,
    resumeTutorial,
    nextStep,
    previousStep,
    setStepIndex,
    
    // Utilidades
    isTutorialCompleted,
    markTutorialCompleted,
    getAvailableTutorials,
    getJoyrideSteps,
    getCurrentStep,
    startTutorialAfterWelcome,
  }
}