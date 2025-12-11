import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { fetchCompanyServiceAnalyticsAction, fetchCompanyBusinessPerformanceAction } from '@/lib/actions/company-reports'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(AUTH_OPTIONS)
    if (!session?.user || session.user.role !== 'company_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 30)

    console.log('🔍 Debug: Testing company dashboard queries')

    // Probar service analytics
    const serviceData = await fetchCompanyServiceAnalyticsAction(
      startDate.toISOString(),
      endDate.toISOString(),
      10
    )

    // Probar business performance
    const businessData = await fetchCompanyBusinessPerformanceAction(
      startDate.toISOString(),
      endDate.toISOString(),
      10
    )

    return NextResponse.json({
      success: true,
      data: {
        serviceAnalytics: serviceData,
        businessPerformance: businessData
      },
      debug: {
        dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        serviceCount: serviceData.length,
        businessCount: businessData.length
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}