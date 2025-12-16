'use client'

import './globals.css'
import 'react-phone-number-input/style.css'
import { Toaster } from '@/components/ui/sonner'
import { SessionProvider } from './provider'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-screen w-full" suppressHydrationWarning>
      <body className="h-full">
        <SessionProvider>{children}</SessionProvider>
        <Toaster />
      </body>
    </html>
  )
}
