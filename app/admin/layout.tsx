'use client'

import { AppSidebar } from '@/components/AppSidebar'
import AdminHeader from '@/components/AdminHeader'
import { SidebarProvider } from '@/components/ui/sidebar'

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <section className="grid gap-4 p-4 w-full h-full overflow-x-hidden">
        <AdminHeader />
        {children}
      </section>
    </SidebarProvider>
  )
}
