import {
  Navbar,
  Hero,
  TrustBadges,
  Features,
  Testimonials,
  Services,
  Pricing,
  FAQ,
  CTA,
  Footer,
} from '@/components/landing'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <Navbar />

      {/* Hero - Propuesta de valor principal */}
      <Hero />

      {/* Trust Badges - Estadisticas y badges de confianza */}
      <TrustBadges />

      {/* Features - Funcionalidades principales */}
      <Features />

      {/* Testimonials - Prueba social */}
      {/* <Testimonials /> */}

      {/* Services - Servicios que se pueden gestionar */}
      <Services />

      {/* Pricing - Planes y precios */}
      <Pricing />

      {/* FAQ - Preguntas frecuentes */}
      <FAQ />

      {/* CTA - Llamada a la accion final */}
      <CTA />

      {/* Footer */}
      <Footer />
    </main>
  )
}
