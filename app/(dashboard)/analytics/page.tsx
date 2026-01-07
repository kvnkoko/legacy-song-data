import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from './components/analytics-dashboard'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="p-6 md:p-8 animate-in">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      }>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}

