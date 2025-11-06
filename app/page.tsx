import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Beauty Business</h1>
        <p className="text-muted-foreground">
          Gestiona tu negocio de belleza de manera eficiente
        </p>
        <Link href="/auth/sign-in">
          <Button size="lg" className="gap-2">
            <LogIn className="h-5 w-5" />
            Iniciar Sesión
          </Button>
        </Link>
      </div>
    </main>
  )
}
