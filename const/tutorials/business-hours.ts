import { TutorialStep } from '.'

export const ENABLE_BUSSINESS_HOURS_TUTORIALS: TutorialStep[] = [
  {
    target: 'settings-menu',
    content:
      'Antes de crear citas, asegúrate de configurar el horario de atención de tu negocio. Haz clic en "Configuración" en el menú lateral.',
    title: 'Panel de Configuración',
    placement: 'right',
    disableBeacon: false,
    showProgress: true,
    showSkipButton: true,
  },
  {
    target: 'business-hours-menu',
    content:
      'Accede a la sección de "Horarios" para definir tus horas de operación.',
    title: 'Horarios de Atención',
    placement: 'right',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/settings/hours',
    triggerAction: {
      type: 'open-modal',
      selector: '[data-tutorial="add-appointment-button"]',
      delay: 500,
      waitForModal: true,
    },
  },
]
