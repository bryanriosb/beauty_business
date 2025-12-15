import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { AppSidebar } from '@/components/AppSidebar'
import AdminHeader from '@/components/AdminHeader'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TrialBanner } from '@/components/trial'
import { SidebarSkeleton } from '@/components/SidebarSkeleton'
import { getAccessibleModules } from '@/lib/actions/sidebar'
import { NavigationLoader } from '@/components/NavigationLoader'
import { PermissionsLoader } from '@/components/PermissionsLoader'
import { TutorialProvider } from '@/components/tutorials/TutorialProvider'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Obtener sesión del servidor
  const session = await getServerSession(AUTH_OPTIONS)
  const user = session?.user as any

  // Obtener módulos accesibles desde el servidor
  const businessAccountId = user?.business_account_id || null
  const userRole = user?.role || 'customer'

  const accessibleModules = await getAccessibleModules(businessAccountId, userRole)

  return (
    <SidebarProvider defaultOpen={true}>
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar accessibleModules={accessibleModules} />
      </Suspense>
      <section className="grid gap-4 w-full h-full overflow-x-hidden">
        <PermissionsLoader />
        <TrialBanner />
        <div className="grid gap-4 p-4">
          <AdminHeader />
          <Suspense fallback={null}>
            <NavigationLoader>{children}</NavigationLoader>
          </Suspense>
        </div>
      </section>
      <TutorialProvider />
    </SidebarProvider>
  )
}
