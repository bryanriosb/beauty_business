'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTutorialStore } from '@/lib/store/tutorial-store'
import { useCurrentUser } from './use-current-user'
import { useTrialCheck } from './use-trial-check'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { TUTORIALS, Tutorial } from '@/const/tutorials'

const TUTORIAL_COOKIE_PREFIX = 'tutorial_completed_'
const AUTO_START_TUTORIAL_COOKIE = 'auto_start_tutorial_shown'

export function useTutorial() {
  const { businessAccountId, isAuthenticated, isLoading: authLoading } = useCurrentUser()
  const { isOnTrial, isChecking: trialLoading } = useTrialCheck()
  
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
      return false
    }

    // Check if tutorial should run (condition function)
    if (tutorial.runCondition && !tutorial.runCondition()) {
      return false
    }

    // Check if already completed
    if (isTutorialCompleted(tutorialId)) {
      return false
    }

    storeStartTutorial(tutorialId, startIndex)
    return true
  }, [storeStartTutorial, isTutorialCompleted])

  // Restart tutorial
  const restartTutorial = useCallback((tutorialId: string) => {
    // Reset completion cookie
    setClientCookie(`${TUTORIAL_COOKIE_PREFIX}${tutorialId}`, 'false')
    startTutorial(tutorialId, 0)
  }, [startTutorial])

  // Get available tutorials (not completed)
  const getAvailableTutorials = useCallback((): Tutorial[] => {
    return Object.values(TUTORIALS).filter(tutorial => {
      if (tutorial.runCondition && !tutorial.runCondition()) {
        return false
      }
      return !isTutorialCompleted(tutorial.id)
    })
  }, [isTutorialCompleted])

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

  // Auto-start logic for trial users
  useEffect(() => {
    if (authLoading || trialLoading) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)

    // Only auto-start for authenticated users with business account
    if (!isAuthenticated || !businessAccountId) {
      return
    }

    // Check if auto-start was already shown
    const autoStartShown = getClientCookie(AUTO_START_TUTORIAL_COOKIE) === 'true'

    // Auto-start tutorial for trial users on first login
    if (isOnTrial && !autoStartShown && !isActive) {
      const appointmentTutorial = TUTORIALS['appointment-start']
      
      if (appointmentTutorial && !isTutorialCompleted('appointment-start')) {
        // Mark auto-start as shown
        setClientCookie(AUTO_START_TUTORIAL_COOKIE, 'true', {
          maxAge: 365 * 24 * 60 * 60, // 1 year
        })

        // Small delay to ensure page is loaded
        setTimeout(() => {
          startTutorial('appointment-start')
        }, 2000)
      }
    }
  }, [
    authLoading,
    trialLoading,
    isAuthenticated,
    businessAccountId,
    isOnTrial,
    isTutorialCompleted,
    startTutorial,
    isActive,
  ])

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
  }
}