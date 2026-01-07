'use client'

import { useSearchParams } from 'next/navigation'
import { WidgetGrid } from './widget-grid'
import { AnalyticsFilters } from '../analytics-filters'

export function AnalyticsDashboard() {
  const searchParams = useSearchParams()

  const filters = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    platform: searchParams.get('platform') || undefined,
    releaseType: searchParams.get('releaseType') || undefined,
    status: searchParams.get('status') || undefined,
    artistId: searchParams.get('artistId') || undefined,
    assignedARId: searchParams.get('assignedARId') || undefined,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Comprehensive insights and statistics for your music distribution operations
          </p>
        </div>
        <AnalyticsFilters />
      </div>

      <WidgetGrid filters={filters} />
    </div>
  )
}



