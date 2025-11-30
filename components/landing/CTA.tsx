import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/90 to-primary/80" />
          <div className="absolute inset-0 bg-[url('/photo-login.png')] bg-cover bg-center opacity-10" />

          <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Comienza tu transformacion hoy
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8">
              Unete a cientos de negocios de belleza que ya optimizaron su gestion con Beluvio.
            </p>
            <Link href="/auth/sign-in">
              <Button size="lg" variant="secondary" className="gap-2 rounded-full px-8 bg-white text-secondary hover:bg-white/90">
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
