export interface TutorialStep {
  target: string
  content: string
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  disableBeacon?: boolean
  spotlightClicks?: boolean
  hideBackButton?: boolean
  hideCloseButton?: boolean
  hideFooter?: boolean
  showProgress?: boolean
  showSkipButton?: boolean
  page?: string // La página donde debe aparecer este paso
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
        content: '¡Bienvenido! Vamos a crear tu primer servicio. Haz clic en "Servicios" en el menú lateral.',
        title: 'Paso 1: Crear un Servicio',
        placement: 'right',
        disableBeacon: false,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
      },
      {
        target: 'add-service-button',
        content: 'Aquí puedes agregar nuevos servicios a tu catálogo. Cada servicio es lo que ofreces a tus clientes.',
        title: 'Agregar Nuevo Servicio',
        placement: 'bottom',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
      },
      {
        target: 'service-name-input',
        content: 'Dale un nombre claro a tu servicio. Por ejemplo: "Corte de Cabello Masculino" o "Manicure"',
        title: 'Nombre del Servicio',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
      },
      {
        target: 'service-price-input',
        content: 'Define el precio de tu servicio. Recuerda que este es el valor base que tus clientes pagarán.',
        title: 'Precio del Servicio',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
      },
      {
        target: 'service-duration-input',
        content: '¿Cuánto tiempo toma este servicio? Esto ayuda a organizar mejor tu agenda.',
        title: 'Duración del Servicio',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
      },
      {
        target: 'service-category-select',
        content: 'Selecciona una categoría para organizar mejor tus servicios.',
        title: 'Categoría del Servicio',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
      },
      {
        target: 'save-service-button',
        content: '¡Perfecto! Ahora guarda tu servicio para continuar.',
        title: 'Guardar Servicio',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/services',
        navigation: {
          to: '/admin/specialists',
          delay: 1000,
        },
      },
      {
        target: 'specialists-menu',
        content: 'Excelente! Ahora vamos a crear un especialista que ofrecerá este servicio.',
        title: 'Paso 2: Crear un Especialista',
        placement: 'right',
        disableBeacon: false,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/specialists',
      },
      {
        target: 'add-specialist-button',
        content: 'Aquí puedes agregar a los especialistas que trabajarán en tu negocio.',
        title: 'Agregar Nuevo Especialista',
        placement: 'bottom',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/specialists',
      },
      {
        target: 'specialist-name-input',
        content: 'Ingresa el nombre completo del especialista.',
        title: 'Nombre del Especialista',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/specialists',
      },
      {
        target: 'specialist-specialty-input',
        content: '¿En qué se especializa? Por ejemplo: "Cortes modernos, tintes, tratamientos"',
        title: 'Especialidad del Especialista',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/specialists',
      },
      {
        target: 'save-specialist-button',
        content: 'Guarda la información del especialista.',
        title: 'Guardar Especialista',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/specialists',
        navigation: {
          to: '/admin/appointments',
          delay: 1000,
        },
      },
      {
        target: 'appointments-menu',
        content: '¡Genial! Ahora vamos a crear tu primera cita combinando el servicio y especialista que creaste.',
        title: 'Paso 3: Crear una Cita',
        placement: 'right',
        disableBeacon: false,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/appointments',
      },
      {
        target: 'add-appointment-button',
        content: 'Este es el calendario donde gestionarás todas tus citas.',
        title: 'Calendario de Citas',
        placement: 'bottom',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/appointments',
      },
      {
        target: 'appointment-customer-search',
        content: 'Busca o crea un nuevo cliente para esta cita.',
        title: 'Seleccionar Cliente',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/appointments',
      },
      {
        target: 'appointment-service-select',
        content: 'Aquí puedes ver los servicios premium disponibles. Los usuarios trial tienen acceso limitado.',
        title: '🌟 Servicios Premium',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/appointments',
      },
      {
        target: 'appointment-date-time',
        content: 'Selecciona la fecha y hora para la cita.',
        title: 'Fecha y Hora',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/appointments',
      },
      {
        target: 'save-appointment-button',
        content: '¡Felicidades! Has completado el tutorial básico. Ahora puedes gestionar tu negocio de manera profesional.',
        title: '¡Tutorial Completado!',
        placement: 'top',
        disableBeacon: true,
        showProgress: true,
        showSkipButton: true,
        page: '/admin/appointments',
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
        content: 'Si tienes múltiples negocios, puedes cambiar entre ellos aquí.',
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
    description: 'Explora todas las características avanzadas disponibles en planes premium',
    steps: [
      {
        target: 'whatsapp-integration',
        content: 'Envía confirmaciones y recordatorios automáticos por WhatsApp.',
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