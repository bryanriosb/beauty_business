'use client'

import { useCallback, useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS } from 'react-joyride'
import { useCurrentUser } from './use-current-user'
import { useTrialCheck } from './use-trial-check'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { TUTORIALS, Tutorial } from '@/const/tutorials'

const TUTORIAL_COOKIE_PREFIX = 'tutorial_completed_'
const AUTO_START_TUTORIAL_COOKIE = 'auto_start_tutorial_shown'

export function useTutorial() {
  const { businessAccountId, isAuthenticated, isLoading: authLoading } = useCurrentUser()
  const { isOnTrial, isChecking: trialLoading } = useTrialCheck()
  const [runTutorial, setRunTutorial] = useState(false)
  const [tutorialId, setTutorialId] = useState<string | null>(null)
  const [tutorialIndex, setTutorialIndex] = useState(0)
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
    if (!tutorial) return false

    // Check if tutorial should run (condition function)
    if (tutorial.runCondition && !tutorial.runCondition()) {
      return false
    }

    setTutorialId(tutorialId)
    setTutorialIndex(startIndex)
    setRunTutorial(true)
    return true
  }, [])

  // Stop current tutorial
  const stopTutorial = useCallback(() => {
    setRunTutorial(false)
    setTutorialId(null)
    setTutorialIndex(0)
  }, [])

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

  // Handle tutorial callback
  const handleTutorialCallback = useCallback((data: CallBackProps) => {
    const { status, index, type } = data

    // Handle finished tutorial
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      if (tutorialId) {
        markTutorialCompleted(tutorialId)
        currentTutorial?.onComplete?.()
      }
      stopTutorial()
      return
    }

    // Update index
    if (type === 'step:before') {
      setTutorialIndex(index)
    }
  }, [tutorialId, currentTutorial, markTutorialCompleted, stopTutorial])

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
    if (isOnTrial && !autoStartShown) {
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
  ])

  // Get Joyride steps
  const getJoyrideSteps = useCallback(() => {
    if (!currentTutorial) return []

    return currentTutorial.steps.map((step, stepIndex) => ({
      ...step,
      // Ensure target exists or fallback
      target: () => {
        const element = document.querySelector(step.target)
        return element || 'body'
      },
      // Add step number to content
      content: step.content,
    }))
  }, [currentTutorial])

  return {
    // State
    runTutorial,
    tutorialId,
    tutorialIndex,
    currentTutorial,
    isLoading: isLoading || authLoading || trialLoading,
    
    // Actions
    startTutorial,
    stopTutorial,
    restartTutorial,
    isTutorialCompleted,
    markTutorialCompleted,
    getAvailableTutorials,
    getJoyrideSteps,
    handleTutorialCallback,
    
    // Tutorial component props
    joyrideProps: {
      steps: getJoyrideSteps(),
      run: runTutorial,
      callback: handleTutorialCallback,
      continuous: true,
      showProgress: true,
      showSkipButton: true,
      styles: {
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
        button: {
          borderRadius: '6px',
          padding: '8px 16px',
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
      },
    },
  }
}