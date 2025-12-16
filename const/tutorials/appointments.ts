import { TutorialStep } from '.'

export const APPOINTMENTS_TUTORIALS: TutorialStep[] = [
  {
    target: 'appointments-menu',
    content:
      'Para finalizar el tutorial vamos a crear tu primera cita. Haz clic en "Citas" en el menú lateral.',
    title: 'Crear una Cita',
    placement: 'right',
    disableBeacon: false,
    showProgress: true,
    showSkipButton: true,
  },
  {
    target: 'add-appointment-button',
    content: 'Ahora, haz clic en este botón para empezar a crear una cita.',
    title: 'Crear Cita',
    placement: 'bottom',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    triggerAction: {
      type: 'open-modal',
      selector: '[data-tutorial="add-appointment-button"]',
      delay: 500,
      waitForModal: true,
    },
  },
  {
    target: 'appointment-customer-select',
    content: 'Aquí puedes buscar o crea un cliente para la cita.',
    title: 'Seleccionar Cliente para la Cita',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    spotlightClicks: true,
  },
  {
    target: 'appointment-service-select', //service-special-price-button
    content:
      'Selecciona uno o más servicios para esta cita. Y dependiendo de los servicios, podrás asignar especialistas por servicio si lo deseas. En este punto tendrás alertas de stock limitado o agotado en servicios con insumos asociados.',
    title: 'Seleccionar Servicios para la Cita',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    spotlightClicks: true,
  },
  {
    target: 'service-special-price-button',
    content:
      'Cada servicio puede tener un precio especial para esta cita. Haz clic aquí para asignar precios especiales si lo deseas.',
    title: 'Precio Especial por Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    spotlightClicks: true,
  },
  {
    target: 'appointment-date-picker', //specialist-selection
    content:
      'Selecciona la fecha para la cita. Esto validará de forma inteligente la disponibilidad de los profesionales.',
    title: 'Seleccionar Fecha de la Cita',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    spotlightClicks: true,
  },
  {
    target: 'appointment-specialist-selection',
    content:
      'Ahora, selecciona el especialista que realizará el servicio en esta cita.',
    title: 'Seleccionar Fecha de la Cita',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    spotlightClicks: true,
  },
  {
    target: 'appointment-specialist-time-slots',
    content:
      'Selecciona el horario disponible para el especialista en la fecha elegida.',
    title: 'Horario del Especialista',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    spotlightClicks: true,
  },
  {
    target: 'save-appointment-button',
    content:
      '¡Buen Trabajo! Si el número del cliente es valido recibirá una notificación por WhatsApp. Guarda tu cita habrás completado el tutorial.',
    title: 'Guardar Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/appointments',
    triggerAction: {
      type: 'click',
      selector: '[data-tutorial="save-specialist-button"]',
      delay: 500,
      waitForModal: false,
    },
  },
]
