'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles, ArrowRight, Zap } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    description: 'Perfecto para comenzar',
    price: 'Gratis',
    period: 'para siempre',
    features: [
      'Hasta 50 citas/mes',
      '1 profesional',
      'Calendario basico',
      'Recordatorios por email',
      'Soporte por email',
    ],
    cta: 'Comenzar gratis',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'Para salones en crecimiento',
    price: '$29',
    period: '/mes',
    features: [
      'Citas ilimitadas',
      'Hasta 5 profesionales',
      'WhatsApp integrado',
      'Inventario basico',
      'Reportes avanzados',
      'Soporte prioritario',
      'Agenda online 24/7',
    ],
    cta: 'Empezar prueba gratis',
    popular: true,
  },
  {
    name: 'Business',
    description: 'Para negocios establecidos',
    price: '$59',
    period: '/mes',
    features: [
      'Todo de Professional',
      'Profesionales ilimitados',
      'Multi-sucursal',
      'Inventario avanzado',
      'Facturacion electronica',
      'API personalizada',
      'Soporte dedicado 24/7',
      'Onboarding personalizado',
    ],
    cta: 'Contactar ventas',
    popular: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium mb-6"
          >
            <Zap className="h-4 w-4 text-secondary" />
            Precios simples
          </motion.div>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Elige el plan perfecto para tu{' '}
            <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              negocio
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Sin contratos. Sin sorpresas. Cancela cuando quieras.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>

        {/* Bottom guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 p-4 rounded-2xl bg-card border">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Garantia de 30 dias</p>
              <p className="text-sm text-muted-foreground">Si no estas satisfecho, te devolvemos tu dinero</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

interface PricingCardProps {
  plan: typeof plans[0]
  index: number
}

function PricingCard({ plan, index }: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-secondary to-accent text-white text-sm font-semibold shadow-lg">
            <Sparkles className="h-4 w-4" />
            Mas popular
          </span>
        </div>
      )}

      <div className={`relative h-full p-8 rounded-3xl ${
        plan.popular
          ? 'bg-gradient-to-b from-secondary/10 to-accent/10 border-2 border-secondary/50'
          : 'bg-card border border-border/50'
      } transition-all duration-300 hover:shadow-xl ${plan.popular ? 'hover:shadow-secondary/10' : 'hover:shadow-primary/5'}`}>
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold ${plan.popular ? 'bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent' : ''}`}>
              {plan.price}
            </span>
            <span className="text-muted-foreground">{plan.period}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className={`h-5 w-5 shrink-0 ${plan.popular ? 'text-secondary' : 'text-secondary/70'}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link href="/auth/sign-in" className="block">
          <Button
            className={`w-full gap-2 rounded-full ${
              plan.popular
                ? 'bg-gradient-to-r from-secondary to-accent hover:opacity-90 text-white border-0'
                : 'bg-primary/20 hover:bg-primary/30 text-foreground border border-primary/30'
            }`}
            size="lg"
          >
            {plan.cta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
