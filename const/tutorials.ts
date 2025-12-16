export interface TutorialStep {
  target: string
  content: string
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  disableBeacon?: boolean
  spotlightClicks?: boolean
  disableOverlayClose?: boolean
  hideBackButton?: boolean
  hideCloseButton?: boolean
  hideFooter?: boolean
  showProgress?: boolean
  showSkipButton?: boolean
  page?: string // La página donde debe aparecer este paso
  // Acción que se ejecuta automáticamente al llegar a este paso
  triggerAction?: {
    type: 'click' | 'open-modal' | 'close-modal'
    selector?: string // Selector del elemento a clickear (si aplica)
    delay?: number // Delay antes de ejecutar la acción (ms)
    waitForModal?: boolean // Esperar a que el modal esté visible antes de continuar
  }
  navigation?: {
    // Navegación automática al siguiente paso
    to?: string // URL a navegar
    delay?: number // Delay antes de navegar (ms)
    condition?: () => boolean // Condición para navegar
  }
  styles?: {
    options?: Record<string, any>
    tooltip?: Record<string, any>
    button?: Record<string, any>
    buttonNext?: Record<string, any>
    buttonBack?: Record<string, any>
    buttonClose?: Record<string, any>
    buttonSkip?: Record<string, any>
  }
}

export interface Tutorial {
  id: string
  name: string
  description: string
  steps: TutorialStep[]
  runCondition?: () => boolean
  onComplete?: () => void
}

export const TUTORIALS: Record<string, Tutorial> = {
  'appointment-start': {
    id: 'appointment-start',
    name: 'Guía de Inicio: Tu Primera Cita',
    description: 'Aprende a crear tu primer servicio, especialista y cita',
    steps: [
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
        disableOverlayClose: true,
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
        disableOverlayClose: true,
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
        disableOverlayClose: true,
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
        disableOverlayClose: true,
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
        disableOverlayClose: true,
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
        target: 'save-service-button',
        content:
          '¡Felicidades! Has completado el tutorial básico. Ahora puedes gestionar tu negocio de manera profesional.',
        title: '¡Tutorial Completado!',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
      },
    ],
  },
  'dashboard-overview': {
    id: 'dashboard-overview',
    name: 'Tour del Dashboard',
    description: 'Conoce las principales funcionalidades del dashboard',
    steps: [
      {
        target: 'business-switcher',
        content:
          'Si tienes múltiples negocios, puedes cambiar entre ellos aquí.',
        title: 'Selector de Negocio',
        placement: 'bottom',
        disableBeacon: false,
        showProgress: true,
      },
      {
        target: 'revenue-card',
        content: 'Visualiza tus ingresos en tiempo real.',
        title: 'Ingresos',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
      },
      {
        target: 'appointments-card',
        content: 'Resumen de tus citas del día.',
        title: 'Citas de Hoy',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
      },
      {
        target: 'customers-card',
        content: 'Estadísticas sobre tus clientes.',
        title: 'Clientes',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
      },
    ],
  },
  'premium-features': {
    id: 'premium-features',
    name: 'Descubre las Funcionalidades Premium',
    description:
      'Explora todas las características avanzadas disponibles en planes premium',
    steps: [
      {
        target: 'whatsapp-integration',
        content:
          'Envía confirmaciones y recordatorios automáticos por WhatsApp.',
        title: '📱 Integración con WhatsApp',
        placement: 'right',
        disableBeacon: false,
        showProgress: true,
      },
      {
        target: 'inventory-management',
        content: 'Controla tu inventario y recibe alertas de bajo stock.',
        title: '📦 Gestión de Inventario',
        placement: 'left',
        disableBeacon: true,
        showProgress: true,
      },
      {
        target: 'commission-system',
        content: 'Calcula automáticamente las comisiones de tus especialistas.',
        title: '💰 Sistema de Comisiones',
        placement: 'left',
        disableBeacon: true,
        showProgress: true,
      },
      {
        target: 'advanced-reports',
        content: 'Genera reportes detallados de tu negocio.',
        title: '📊 Reportes Avanzados',
        placement: 'left',
        disableBeacon: true,
        showProgress: true,
      },
      {
        target: 'online-booking',
        content: 'Permite que tus clientes reserven citas online.',
        title: '🌐 Reservas Online',
        placement: 'left',
        disableBeacon: true,
        showProgress: true,
      },
    ],
  },
}
