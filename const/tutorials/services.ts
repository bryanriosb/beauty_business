import { TutorialStep } from '.'

export const SERVICES_TUTORIALS: TutorialStep[] = [
  {
    target: 'services-menu',
    content:
      '¡Bienvenido! Vamos a crear tu primer servicio. Haz clic en "Servicios" en el menú lateral para comenzar.',
    title: 'Paso 1: Crear un Servicio',
    placement: 'right',
    disableBeacon: false,
    showProgress: true,
    showSkipButton: true,
  },
  {
    target: 'add-service-button',
    content:
      'Aquí puedes agregar nuevos servicios a tu catálogo. Cada servicio es lo que ofreces a tus clientes.',
    title: 'Agregar Nuevo Servicio',
    placement: 'bottom',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
    triggerAction: {
      type: 'open-modal',
      selector: '[data-tutorial="add-service-button"]',
      delay: 500,
      waitForModal: true,
    },
  },
  {
    target: 'service-name-input',
    content:
      'Aquí puedes dar un nombre claro a tu servicio. Por ejemplo: "Corte de Cabello Masculino" o "Manicure"',
    title: 'Nombre del Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
    spotlightClicks: true,
  },
  {
    target: 'service-description-input',
    content:
      'Describe brevemente el servicio que vas a ofrecer. Esto ayudará a tus clientes a entender qué esperar.',
    title: 'Descripción del Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
    spotlightClicks: true,
  },
  {
    target: 'service-category-select',
    content:
      'Selecciona la categoría que mejor describe tu servicio. Esto ayudará a tus clientes a encontrarlo y a asociar con el especialista.',
    title: 'Categoría del Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
    spotlightClicks: true,
  },
  {
    target: 'service-price-input',
    content:
      'Define el precio base que tus clientes pagarán por este servicio.',
    title: 'Precio del Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
    spotlightClicks: true,
  },
  {
    target: 'service-duration-input',
    content:
      'Especifica la duración en minutos para organizar mejor tu agenda.',
    title: 'Duración del Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
    spotlightClicks: true,
  },
  {
    target: 'save-service-button',
    content:
      '¡Excelente! Una vez completados los datos, guarda tu servicio para finalizar el tutorial.',
    title: 'Guardar Servicio',
    placement: 'top',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
    triggerAction: {
      type: 'click',
      selector: '[data-tutorial="save-service-button"]',
      delay: 500,
      waitForModal: false,
    },
  },
  {
    target: 'services-menu',
    content:
      '¡Felicidades! Has completado los pasos para crear tu primer servicio. Ahora vamos a crear un especialista para tu servicio y finalmente crear una cita.',
    title: '¡Primera fase Completada!',
    placement: 'right',
    disableBeacon: true,
    showProgress: true,
    showSkipButton: true,
    page: '/admin/services',
  },
]
