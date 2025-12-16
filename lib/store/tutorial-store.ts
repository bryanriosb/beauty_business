import { create } from 'zustand'
import { TutorialStep } from '@/const/tutorials'

export interface TutorialNavigationStep extends TutorialStep {
  page?: string // La página donde debe aparecer este paso
  navigation?: {
    // Navegación automática al siguiente paso
    to?: string // URL a navegar
    delay?: number // Delay antes de navegar (ms)
    condition?: () => boolean // Condición para navegar
  }
}

export interface TutorialNavigation {
  id: string
  name: string
  description: string
  steps: TutorialNavigationStep[]
  runCondition?: () => boolean
  onComplete?: () => void
}

interface TutorialState {
  // Estado actual del tutorial
  isActive: boolean
  tutorialId: string | null
  stepIndex: number
  isPaused: boolean

  // Configuración
  navigationStepDelay: number

  // Acciones
  startTutorial: (tutorialId: string, startIndex?: number) => void
  stopTutorial: () => void
  pauseTutorial: () => void
  resumeTutorial: () => void
  nextStep: () => void
  previousStep: () => void
  setStepIndex: (index: number) => void

  // Utilidades
  getCurrentStep: () => TutorialNavigationStep | null
  shouldNavigateToPage: (currentPage: string) => boolean
  getPageForStep: (stepIndex: number) => string | null
}

// Store SIN persistencia - el estado del tutorial es efímero
export const useTutorialStore = create<TutorialState>()((set, get) => ({
  isActive: false,
  tutorialId: null,
  stepIndex: 0,
  isPaused: false,
  navigationStepDelay: 800, // 800ms delay por defecto para navegación

  startTutorial: (tutorialId, startIndex = 0) => {
    set({
      isActive: true,
      tutorialId,
      stepIndex: startIndex,
      isPaused: false,
    })
  },

  stopTutorial: () => {
    set({
      isActive: false,
      tutorialId: null,
      stepIndex: 0,
      isPaused: false,
    })
  },

  pauseTutorial: () => {
    set({ isPaused: true })
  },

  resumeTutorial: () => {
    set({ isPaused: false })
  },

  nextStep: () => {
    const currentState = get()
    const newIndex = currentState.stepIndex + 1
    set({ stepIndex: newIndex })
  },

  previousStep: () => {
    const currentState = get()
    const newIndex = Math.max(0, currentState.stepIndex - 1)
    set({ stepIndex: newIndex })
  },

  setStepIndex: (index) => {
    set({ stepIndex: index })
  },

  getCurrentStep: () => {
    const { tutorialId, stepIndex } = get()
    if (!tutorialId) return null

    // Importamos dinámicamente para evitar ciclos
    const { TUTORIALS } = require('@/const/tutorials')
    const tutorial = TUTORIALS[tutorialId] as TutorialNavigation

    if (!tutorial || !tutorial.steps || stepIndex >= tutorial.steps.length) {
      return null
    }

    return tutorial.steps[stepIndex] || null
  },

  shouldNavigateToPage: (currentPage: string) => {
    const currentStep = get().getCurrentStep()
    if (!currentStep?.page) return false

    return currentStep.page !== currentPage
  },

  getPageForStep: (stepIndex: number) => {
    const { tutorialId } = get()
    if (!tutorialId) return null

    const { TUTORIALS } = require('@/const/tutorials')
    const tutorial = TUTORIALS[tutorialId] as TutorialNavigation

    if (!tutorial || !tutorial.steps || stepIndex >= tutorial.steps.length) {
      return null
    }

    return tutorial.steps[stepIndex]?.page ?? null
  },
}))

// Hook simplificado para tutoriales - la navegación se maneja en el TutorialProvider
export function useTutorialNavigation() {
  return useTutorialStore()
}
