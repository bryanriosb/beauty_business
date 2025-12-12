'use client'

import Joyride from 'react-joyride'
import { useTutorial } from '@/hooks/use-tutorial'

export function TutorialProvider() {
  const { joyrideProps, isLoading } = useTutorial()

  // Don't render anything while loading
  if (isLoading) {
    return null
  }

  // Convert steps to correct format for Joyride
  const formattedSteps = joyrideProps.steps.map((step: any) => ({
    ...step,
    target: step.target || 'body',
  }))

  return (
    <Joyride
      steps={formattedSteps}
      run={joyrideProps.run}
      callback={joyrideProps.callback}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      scrollToFirstStep={true}
      disableOverlayClose={true}
      styles={joyrideProps.styles}
      locale={{
        back: 'Anterior',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        open: 'Abrir el tutorial',
        skip: 'Omitir tutorial',
      }}
    />
  )
}