import { prisma } from './db'
import { PlatformRequestStatus, ReleaseType, CopyrightStatus, VideoType } from '@prisma/client'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays, subMonths, differenceInDays, differenceInHours } from 'date-fns'

export interface AnalyticsFilters {
  startDate?: Date
  endDate?: Date
  platform?: string | string[]
  releaseType?: ReleaseType | ReleaseType[]
  status?: PlatformRequestStatus | PlatformRequestStatus[]
  artistId?: string | string[]
  assignedARId?: string | string[]
}

export interface KPIMetrics {
  totalReleases: number
  totalTracks: number
  uploadSuccessRate: number
  activeArtists: number
  platformCoverage: number
  processingVelocity: number
  pendingReleases: number
  rejectedReleases: number
}

export interface DistributionDataPoint {
  date: string
  releases: number
  tracks: number
  uploaded: number
  pending: number
  rejected: number
}

export interface PlatformMetrics {
  platform: string
  totalRequests: number
  uploaded: number
  pending: number
  rejected: number
  successRate: number
  averageProcessingTime: number
}

export interface ArtistMetrics {
  artistId: string
  artistName: string
  releaseCount: number
  trackCount: number
  platformCount: number
  recentActivity: Date
}

export interface AREfficiencyMetrics {
  employeeId: string
  employeeName: string
  releaseCount: number
  averageProcessingTime: number
  uploadedCount: number
  pendingCount: number
}

export interface ContentBreakdown {
  releaseTypes: { type: ReleaseType; count: number }[]
  copyrightStatus: { status: CopyrightStatus | null; count: number }[]
  videoTypes: { type: VideoType; count: number }[]
  genres: { genre: string; count: number }[]
}

export interface PipelineHealth {
  pending: number
  uploaded: number
  rejected: number
  averageTimeInPending: number
  averageTimeInUploaded: number
  bottleneckPlatforms: { platform: string; pendingCount: number }[]
}

export interface TimeTrend {
  period: string
  releases: number
  tracks: number
  growthRate: number
}

function buildWhereClause(filters: AnalyticsFilters) {
  const where: any = {}

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = startOfDay(filters.startDate)
    }
    if (filters.endDate) {
      where.createdAt.lte = endOfDay(filters.endDate)
    }
  }

  if (filters.releaseType) {
    if (Array.isArray(filters.releaseType)) {
      where.type = { in: filters.releaseType }
    } else {
      where.type = filters.releaseType
    }
  }

  if (filters.artistId) {
    if (Array.isArray(filters.artistId)) {
      where.artistId = { in: filters.artistId }
    } else {
      where.artistId = filters.artistId
    }
  }

  if (filters.assignedARId) {
    if (Array.isArray(filters.assignedARId)) {
      where.assignedA_RId = { in: filters.assignedARId }
    } else {
      where.assignedA_RId = filters.assignedARId
    }
  }

  return where
}

function buildPlatformRequestWhere(filters: AnalyticsFilters) {
  const where: any = {}

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = startOfDay(filters.startDate)
    }
    if (filters.endDate) {
      where.createdAt.lte = endOfDay(filters.endDate)
    }
  }

  if (filters.platform) {
    if (Array.isArray(filters.platform)) {
      where.platform = { in: filters.platform }
    } else {
      where.platform = filters.platform
    }
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status }
    } else {
      where.status = filters.status
    }
  }

  return where
}

export async function getKPIMetrics(filters: AnalyticsFilters = {}): Promise<KPIMetrics> {
  const where = buildWhereClause(filters)
  const platformRequestWhere = buildPlatformRequestWhere(filters)

  const [
    totalReleases,
    totalTracks,
    platformRequests,
    uniqueArtists,
    releasesWithPlatforms,
    uploadedRequests,
    totalRequests,
    pendingReleases,
    rejectedReleases,
  ] = await Promise.all([
    prisma.release.count({ where }),
    prisma.track.count({
      where: {
        release: where,
      },
    }),
    prisma.platformRequest.findMany({
      where: platformRequestWhere,
      select: {
        releaseId: true,
        status: true,
      },
    }),
    prisma.release.findMany({
      where,
      select: {
        artistId: true,
      },
      distinct: ['artistId'],
    }),
    prisma.release.findMany({
      where,
      include: {
        platformRequests: {
          select: {
            platform: true,
          },
          distinct: ['platform'],
        },
      },
    }),
    prisma.platformRequest.count({
      where: {
        ...platformRequestWhere,
        status: 'UPLOADED',
      },
    }),
    prisma.platformRequest.count({ where: platformRequestWhere }),
    prisma.release.count({
      where: {
        ...where,
        platformRequests: {
          some: {
            status: 'PENDING',
          },
        },
      },
    }),
    prisma.release.count({
      where: {
        ...where,
        platformRequests: {
          some: {
            status: 'REJECTED',
          },
        },
      },
    }),
  ])

  const uniquePlatformsPerRelease = releasesWithPlatforms.map(
    (r) => r.platformRequests.length
  )
  const averagePlatformsPerRelease =
    uniquePlatformsPerRelease.length > 0
      ? uniquePlatformsPerRelease.reduce((a, b) => a + b, 0) / uniquePlatformsPerRelease.length
      : 0

  const uploadSuccessRate = totalRequests > 0 ? (uploadedRequests / totalRequests) * 100 : 0

  // Calculate processing velocity (releases per day)
  let processingVelocity = 0
  if (filters.startDate && filters.endDate) {
    const daysDiff = differenceInDays(filters.endDate, filters.startDate) || 1
    processingVelocity = totalReleases / daysDiff
  } else if (filters.endDate) {
    const defaultStart = subDays(filters.endDate, 30)
    const daysDiff = differenceInDays(filters.endDate, defaultStart) || 1
    processingVelocity = totalReleases / daysDiff
  }

  return {
    totalReleases,
    totalTracks,
    uploadSuccessRate: Math.round(uploadSuccessRate * 100) / 100,
    activeArtists: uniqueArtists.length,
    platformCoverage: Math.round(averagePlatformsPerRelease * 100) / 100,
    processingVelocity: Math.round(processingVelocity * 100) / 100,
    pendingReleases,
    rejectedReleases,
  }
}

export async function getDistributionMetrics(
  filters: AnalyticsFilters = {},
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<DistributionDataPoint[]> {
  const where = buildWhereClause(filters)
  const platformRequestWhere = buildPlatformRequestWhere(filters)

  const releases = await prisma.release.findMany({
    where,
    select: {
      createdAt: true,
      id: true,
      tracks: {
        select: {
          id: true,
        },
      },
      platformRequests: {
        where: platformRequestWhere,
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const dataMap = new Map<string, DistributionDataPoint>()

  releases.forEach((release) => {
    let dateKey: string
    const date = new Date(release.createdAt)

    if (granularity === 'day') {
      dateKey = format(date, 'yyyy-MM-dd')
    } else if (granularity === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      dateKey = format(weekStart, 'yyyy-MM-dd')
    } else {
      const monthStart = startOfMonth(date)
      dateKey = format(monthStart, 'yyyy-MM')
    }

    if (!dataMap.has(dateKey)) {
      dataMap.set(dateKey, {
        date: dateKey,
        releases: 0,
        tracks: 0,
        uploaded: 0,
        pending: 0,
        rejected: 0,
      })
    }

    const dataPoint = dataMap.get(dateKey)!
    dataPoint.releases += 1
    dataPoint.tracks += release.tracks.length

    release.platformRequests.forEach((pr) => {
      if (pr.status === 'UPLOADED') dataPoint.uploaded += 1
      else if (pr.status === 'PENDING') dataPoint.pending += 1
      else if (pr.status === 'REJECTED') dataPoint.rejected += 1
    })
  })

  return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getPlatformAnalytics(filters: AnalyticsFilters = {}): Promise<PlatformMetrics[]> {
  const platformRequestWhere = buildPlatformRequestWhere(filters)

  const platformStats = await prisma.platformRequest.groupBy({
    by: ['platform', 'status'],
    where: platformRequestWhere,
    _count: true,
  })

  const platformMap = new Map<string, PlatformMetrics>()

  // Get processing times
  const platformRequestsWithTimes = await prisma.platformRequest.findMany({
    where: {
      ...platformRequestWhere,
      uploadedAt: { not: null },
    },
    select: {
      platform: true,
      createdAt: true,
      uploadedAt: true,
    },
  })

  const platformProcessingTimes = new Map<string, number[]>()
  platformRequestsWithTimes.forEach((pr) => {
    if (pr.uploadedAt) {
      const hours = differenceInHours(pr.uploadedAt, pr.createdAt)
      if (!platformProcessingTimes.has(pr.platform)) {
        platformProcessingTimes.set(pr.platform, [])
      }
      platformProcessingTimes.get(pr.platform)!.push(hours)
    }
  })

  platformStats.forEach((stat) => {
    if (!platformMap.has(stat.platform)) {
      const times = platformProcessingTimes.get(stat.platform) || []
      const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0

      platformMap.set(stat.platform, {
        platform: stat.platform,
        totalRequests: 0,
        uploaded: 0,
        pending: 0,
        rejected: 0,
        successRate: 0,
        averageProcessingTime: Math.round(avgTime * 100) / 100,
      })
    }

    const metrics = platformMap.get(stat.platform)!
    metrics.totalRequests += stat._count

    if (stat.status === 'UPLOADED') metrics.uploaded = stat._count
    else if (stat.status === 'PENDING') metrics.pending = stat._count
    else if (stat.status === 'REJECTED') metrics.rejected = stat._count
  })

  // Calculate success rates
  platformMap.forEach((metrics) => {
    if (metrics.totalRequests > 0) {
      metrics.successRate = Math.round((metrics.uploaded / metrics.totalRequests) * 100 * 100) / 100
    }
  })

  return Array.from(platformMap.values()).sort((a, b) => b.totalRequests - a.totalRequests)
}

export async function getArtistMetrics(
  filters: AnalyticsFilters = {},
  limit: number = 10
): Promise<ArtistMetrics[]> {
  const where = buildWhereClause(filters)

  const releases = await prisma.release.findMany({
    where,
    include: {
      artist: {
        select: {
          id: true,
          name: true,
        },
      },
      tracks: {
        select: {
          id: true,
        },
      },
      platformRequests: {
        select: {
          platform: true,
        },
        distinct: ['platform'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const artistMap = new Map<string, ArtistMetrics>()

  releases.forEach((release) => {
    const artistId = release.artist.id
    const artistName = release.artist.name

    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, {
        artistId,
        artistName,
        releaseCount: 0,
        trackCount: 0,
        platformCount: 0,
        recentActivity: release.createdAt,
      })
    }

    const metrics = artistMap.get(artistId)!
    metrics.releaseCount += 1
    metrics.trackCount += release.tracks.length
    metrics.platformCount = Math.max(metrics.platformCount, release.platformRequests.length)

    if (release.createdAt > metrics.recentActivity) {
      metrics.recentActivity = release.createdAt
    }
  })

  return Array.from(artistMap.values())
    .sort((a, b) => b.releaseCount - a.releaseCount)
    .slice(0, limit)
}

export async function getAREfficiency(filters: AnalyticsFilters = {}): Promise<AREfficiencyMetrics[]> {
  const where = buildWhereClause(filters)

  const releases = await prisma.release.findMany({
    where: {
      ...where,
      assignedA_RId: { not: null },
    },
    include: {
      assignedA_R: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      platformRequests: {
        select: {
          status: true,
          createdAt: true,
          uploadedAt: true,
        },
      },
    },
  })

  const employeeMap = new Map<string, AREfficiencyMetrics>()

  releases.forEach((release) => {
    if (!release.assignedA_R) return

    const employeeId = release.assignedA_R.id
    const employeeName = release.assignedA_R.user.name || 'Unknown'

    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, {
        employeeId,
        employeeName,
        releaseCount: 0,
        averageProcessingTime: 0,
        uploadedCount: 0,
        pendingCount: 0,
      })
    }

    const metrics = employeeMap.get(employeeId)!
    metrics.releaseCount += 1

    const uploadedRequests = release.platformRequests.filter((pr) => pr.status === 'UPLOADED')
    const pendingRequests = release.platformRequests.filter((pr) => pr.status === 'PENDING')

    metrics.uploadedCount += uploadedRequests.length
    metrics.pendingCount += pendingRequests.length

    // Calculate average processing time
    const processingTimes: number[] = []
    uploadedRequests.forEach((pr) => {
      if (pr.uploadedAt) {
        const hours = differenceInHours(pr.uploadedAt, pr.createdAt)
        processingTimes.push(hours)
      }
    })

    if (processingTimes.length > 0) {
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      if (metrics.averageProcessingTime === 0) {
        metrics.averageProcessingTime = avgTime
      } else {
        metrics.averageProcessingTime = (metrics.averageProcessingTime + avgTime) / 2
      }
    }
  })

  return Array.from(employeeMap.values())
    .map((m) => ({
      ...m,
      averageProcessingTime: Math.round(m.averageProcessingTime * 100) / 100,
    }))
    .sort((a, b) => b.releaseCount - a.releaseCount)
}

export async function getContentBreakdown(filters: AnalyticsFilters = {}): Promise<ContentBreakdown> {
  const where = buildWhereClause(filters)

  const [releaseTypes, copyrightStatus, videoTypes, tracks] = await Promise.all([
    prisma.release.groupBy({
      by: ['type'],
      where,
      _count: true,
    }),
    prisma.release.groupBy({
      by: ['copyrightStatus'],
      where,
      _count: true,
    }),
    prisma.release.groupBy({
      by: ['videoType'],
      where,
      _count: true,
    }),
    prisma.track.findMany({
      where: {
        release: where,
      },
      select: {
        genre: true,
      },
    }),
  ])

  // Count genres
  const genreMap = new Map<string, number>()
  tracks.forEach((track) => {
    if (track.genre) {
      genreMap.set(track.genre, (genreMap.get(track.genre) || 0) + 1)
    }
  })

  const genres = Array.from(genreMap.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    releaseTypes: releaseTypes.map((rt) => ({
      type: rt.type,
      count: rt._count,
    })),
    copyrightStatus: copyrightStatus.map((cs) => ({
      status: cs.copyrightStatus,
      count: cs._count,
    })),
    videoTypes: videoTypes.map((vt) => ({
      type: vt.videoType,
      count: vt._count,
    })),
    genres,
  }
}

export async function getPipelineHealth(filters: AnalyticsFilters = {}): Promise<PipelineHealth> {
  const where = buildWhereClause(filters)
  const platformRequestWhere = buildPlatformRequestWhere(filters)

  const [statusCounts, pendingRequests, uploadedRequests, platformBottlenecks] = await Promise.all([
    prisma.platformRequest.groupBy({
      by: ['status'],
      where: platformRequestWhere,
      _count: true,
    }),
    prisma.platformRequest.findMany({
      where: {
        ...platformRequestWhere,
        status: 'PENDING',
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.platformRequest.findMany({
      where: {
        ...platformRequestWhere,
        status: 'UPLOADED',
        uploadedAt: { not: null },
      },
      select: {
        createdAt: true,
        uploadedAt: true,
      },
    }),
    prisma.platformRequest.groupBy({
      by: ['platform'],
      where: {
        ...platformRequestWhere,
        status: 'PENDING',
      },
      _count: true,
    }),
  ])

  const statusMap = new Map<string, number>()
  statusCounts.forEach((sc) => {
    statusMap.set(sc.status, sc._count)
  })

  // Calculate average time in pending
  const now = new Date()
  const pendingTimes = pendingRequests.map((pr) => differenceInHours(now, pr.createdAt))
  const averageTimeInPending =
    pendingTimes.length > 0 ? pendingTimes.reduce((a, b) => a + b, 0) / pendingTimes.length : 0

  // Calculate average time in uploaded
  const uploadedTimes = uploadedRequests.map((pr) =>
    pr.uploadedAt ? differenceInHours(pr.uploadedAt, pr.createdAt) : 0
  ).filter(t => t > 0)
  const averageTimeInUploaded =
    uploadedTimes.length > 0 ? uploadedTimes.reduce((a, b) => a + b, 0) / uploadedTimes.length : 0

  const bottleneckPlatforms = platformBottlenecks
    .map((pb) => ({
      platform: pb.platform,
      pendingCount: pb._count,
    }))
    .sort((a, b) => b.pendingCount - a.pendingCount)
    .slice(0, 5)

  return {
    pending: statusMap.get('PENDING') || 0,
    uploaded: statusMap.get('UPLOADED') || 0,
    rejected: statusMap.get('REJECTED') || 0,
    averageTimeInPending: Math.round(averageTimeInPending * 100) / 100,
    averageTimeInUploaded: Math.round(averageTimeInUploaded * 100) / 100,
    bottleneckPlatforms,
  }
}

export async function getTimeTrends(
  filters: AnalyticsFilters = {},
  period: 'day' | 'week' | 'month' = 'month'
): Promise<TimeTrend[]> {
  const where = buildWhereClause(filters)

  const releases = await prisma.release.findMany({
    where,
    include: {
      tracks: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const dataMap = new Map<string, { releases: number; tracks: number }>()

  releases.forEach((release) => {
    let periodKey: string
    const date = new Date(release.createdAt)

    if (period === 'day') {
      periodKey = format(date, 'yyyy-MM-dd')
    } else if (period === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      periodKey = format(weekStart, 'yyyy-MM-dd')
    } else {
      const monthStart = startOfMonth(date)
      periodKey = format(monthStart, 'yyyy-MM')
    }

    if (!dataMap.has(periodKey)) {
      dataMap.set(periodKey, { releases: 0, tracks: 0 })
    }

    const data = dataMap.get(periodKey)!
    data.releases += 1
    data.tracks += release.tracks.length
  })

  const sortedData = Array.from(dataMap.entries())
    .map(([period, data]) => ({
      period,
      releases: data.releases,
      tracks: data.tracks,
      growthRate: 0, // Will calculate below
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  // Calculate growth rates
  for (let i = 1; i < sortedData.length; i++) {
    const prev = sortedData[i - 1]
    const current = sortedData[i]
    if (prev.releases > 0) {
      current.growthRate = Math.round(((current.releases - prev.releases) / prev.releases) * 100 * 100) / 100
    }
  }

  return sortedData
}

