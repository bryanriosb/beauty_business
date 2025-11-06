import { AppSidebar } from '@/components/AppSidebar'
import AdminHeader from '@/components/AdminHeader'
import { SidebarProvider } from '@/components/ui/sidebar'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <section className="grid gap-4 p-4 w-full h-full overflow-x-hidden">
        <AdminHeader />
        {children}
      </section>
    </SidebarProvider>
  )
}
