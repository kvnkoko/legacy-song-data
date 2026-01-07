import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getKPIMetrics,
  getDistributionMetrics,
  getPlatformAnalytics,
  getArtistMetrics,
  getAREfficiency,
  getContentBreakdown,
  getPipelineHealth,
  getTimeTrends,
  type AnalyticsFilters,
} from '@/lib/analytics-service'
import { PlatformRequestStatus, ReleaseType } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Add cache headers for analytics data (5 minutes)
    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    }

    const searchParams = req.nextUrl.searchParams
    const widgetId = searchParams.get('widget')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const platformParam = searchParams.get('platform')
    const releaseTypeParam = searchParams.get('releaseType')
    const statusParam = searchParams.get('status')
    const artistIdParam = searchParams.get('artistId')
    const assignedARIdParam = searchParams.get('assignedARId')
    const granularity = searchParams.get('granularity') || 'day'
    const period = searchParams.get('period') || 'month'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build filters
    const filters: AnalyticsFilters = {}

    if (startDateParam) {
      filters.startDate = new Date(startDateParam)
    }
    if (endDateParam) {
      filters.endDate = new Date(endDateParam)
    }
    if (platformParam) {
      const platforms = platformParam.split(',').filter(Boolean)
      filters.platform = platforms.length === 1 ? platforms[0] : platforms
    }
    if (releaseTypeParam) {
      const types = releaseTypeParam.split(',').filter(Boolean) as ReleaseType[]
      filters.releaseType = types.length === 1 ? types[0] : types
    }
    if (statusParam) {
      const statuses = statusParam.split(',').filter(Boolean) as PlatformRequestStatus[]
      filters.status = statuses.length === 1 ? statuses[0] : statuses
    }
    if (artistIdParam) {
      const artistIds = artistIdParam.split(',').filter(Boolean)
      filters.artistId = artistIds.length === 1 ? artistIds[0] : artistIds
    }
    if (assignedARIdParam) {
      const arIds = assignedARIdParam.split(',').filter(Boolean)
      filters.assignedARId = arIds.length === 1 ? arIds[0] : arIds
    }

    // Route to appropriate service function based on widget
    let data: any
    
    switch (widgetId) {
      case 'kpi':
        data = await getKPIMetrics(filters)
        break

      case 'distribution':
        data = await getDistributionMetrics(filters, granularity as 'day' | 'week' | 'month')
        break

      case 'platform':
        data = await getPlatformAnalytics(filters)
        break

      case 'artist':
        data = await getArtistMetrics(filters, limit)
        break

      case 'ar-efficiency':
        data = await getAREfficiency(filters)
        break

      case 'content':
        data = await getContentBreakdown(filters)
        break

      case 'pipeline':
        data = await getPipelineHealth(filters)
        break

      case 'trends':
        data = await getTimeTrends(filters, period as 'day' | 'week' | 'month')
        break

      case 'all':
        // Return all metrics at once
        const [
          kpi,
          distribution,
          platform,
          artist,
          arEfficiency,
          content,
          pipeline,
          trends,
        ] = await Promise.all([
          getKPIMetrics(filters),
          getDistributionMetrics(filters, granularity as 'day' | 'week' | 'month'),
          getPlatformAnalytics(filters),
          getArtistMetrics(filters, limit),
          getAREfficiency(filters),
          getContentBreakdown(filters),
          getPipelineHealth(filters),
          getTimeTrends(filters, period as 'day' | 'week' | 'month'),
        ])

        data = {
          kpi,
          distribution,
          platform,
          artist,
          arEfficiency,
          content,
          pipeline,
          trends,
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid widget ID. Use: kpi, distribution, platform, artist, ar-efficiency, content, pipeline, trends, or all' },
          { status: 400 }
        )
    }

    return NextResponse.json(data, { headers: cacheHeaders })
  } catch (error: any) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

