'use client'

import { AppSidebar } from '@/components/AppSidebar'
import AdminHeader from '@/components/AdminHeader'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TrialBanner } from '@/components/trial'
import { ModuleAccessLoader } from '@/components/ModuleAccessLoader'

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider defaultOpen={true}>
      <ModuleAccessLoader />
      <AppSidebar />
      <section className="grid gap-4 w-full h-full overflow-x-hidden">
        <TrialBanner />
        <div className="grid gap-4 p-4">
          <AdminHeader />
          {children}
        </div>
      </section>
    </SidebarProvider>
  )
}
