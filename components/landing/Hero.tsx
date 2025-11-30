import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/10" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-secondary" />
            Plataforma de gestion para negocios de belleza
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
            Transforma tu{' '}
            <span className="text-secondary">negocio</span> con servicios{' '}
            <span className="relative inline-block">
              expertos
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                <path d="M2 10C50 2 150 2 198 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary" />
              </svg>
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-md">
            Gestiona citas, clientes, inventario y finanzas de tu salon de belleza desde una sola plataforma intuitiva y poderosa.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/auth/sign-in">
              <Button size="lg" className="gap-2 rounded-full px-8">
                Comenzar ahora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="rounded-full px-8">
                Conocer mas
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-background" />
              ))}
            </div>
            <div className="text-sm">
              <span className="font-semibold">+500</span>{' '}
              <span className="text-muted-foreground">negocios confian en nosotros</span>
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative w-full aspect-square max-w-lg mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/40 rounded-[3rem] rotate-6" />
            <div className="absolute inset-0 bg-card rounded-[3rem] shadow-2xl overflow-hidden">
              <Image
                src="/photo-login.png"
                alt="Beauty professional"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl p-4 shadow-xl border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="font-semibold">Citas del dia</p>
                  <p className="text-2xl font-bold text-secondary">24</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
