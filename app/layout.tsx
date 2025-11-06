'use client'

import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import { SessionProvider } from './provider'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-screen w-full">
      <body className="h-full">
        <SessionProvider>
          <main className="grid place-items-center overflow-hidden">
            {children}
          </main>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  )
}
