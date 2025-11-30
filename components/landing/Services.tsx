import Image from 'next/image'
import { Scissors, Sparkles, Heart, Palette } from 'lucide-react'

const services = [
  { icon: Scissors, name: 'Cortes', color: 'from-primary/60 to-primary/30' },
  { icon: Sparkles, name: 'Faciales', color: 'from-secondary/60 to-secondary/30' },
  { icon: Heart, name: 'Manicure', color: 'from-primary/60 to-secondary/30' },
  { icon: Palette, name: 'Colorimetria', color: 'from-secondary/60 to-primary/30' },
]

export function Services() {
  return (
    <section id="services" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/20">
                  <Image
                    src="/photo-login.png"
                    alt="Salon service"
                    width={300}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-secondary/40 to-primary/20 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-secondary">98%</p>
                    <p className="text-sm text-muted-foreground">Satisfaccion</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/40 to-secondary/20 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-secondary">+5k</p>
                    <p className="text-sm text-muted-foreground">Citas/mes</p>
                  </div>
                </div>
                <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-secondary/30 to-primary/20">
                  <Image
                    src="/photo-login.png"
                    alt="Salon service"
                    width={300}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Servicios que puedes{' '}
              <span className="text-secondary">gestionar</span>
            </h2>
            <p className="text-muted-foreground">
              Configura todos los servicios de tu negocio, asigna especialistas, define duraciones y precios de forma sencilla.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {services.map((service) => (
                <ServiceCard key={service.name} {...service} />
              ))}
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-secondary" />
              </div>
              <p className="text-sm">
                <span className="font-semibold">Personalizacion total:</span>{' '}
                <span className="text-muted-foreground">Crea categorias, combos y promociones a tu medida.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ icon: Icon, name, color }: { icon: typeof Scissors; name: string; color: string }) {
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center">
        <Icon className="h-5 w-5 text-secondary" />
      </div>
      <span className="font-medium">{name}</span>
    </div>
  )
}
