import { Calendar, Users, Package, TrendingUp, MessageCircle, CreditCard } from 'lucide-react'

const features = [
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    description: 'Gestiona citas con calendario visual, recordatorios automaticos y evita solapamientos.',
  },
  {
    icon: Users,
    title: 'Clientes y fidelizacion',
    description: 'Base de datos de clientes con historial, preferencias y programas de lealtad.',
  },
  {
    icon: Package,
    title: 'Inventario',
    description: 'Control de productos, alertas de stock bajo y consumo por servicio.',
  },
  {
    icon: TrendingUp,
    title: 'Reportes y metricas',
    description: 'Dashboard con ventas, servicios mas populares y rendimiento del equipo.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp integrado',
    description: 'Confirmaciones y recordatorios automaticos directo al WhatsApp del cliente.',
  },
  {
    icon: CreditCard,
    title: 'Facturacion',
    description: 'Genera facturas profesionales y lleva el control de pagos y cuentas por cobrar.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-background to-primary/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Todo lo que necesitas para tu{' '}
            <span className="text-secondary">negocio</span>
          </h2>
          <p className="text-muted-foreground">
            Herramientas disenadas especialmente para salones de belleza, barberias y spas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: typeof Calendar; title: string; description: string }) {
  return (
    <div className="group p-6 rounded-2xl bg-card border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
        <Icon className="h-6 w-6 text-secondary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}
