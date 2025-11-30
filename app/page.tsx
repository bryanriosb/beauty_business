import { Navbar, Hero, Features, Services, CTA, Footer } from '@/components/landing'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Services />
      <CTA />
      <Footer />
    </main>
  )
}
