import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { UserRole, PlatformRequestStatus } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformRequestListItem } from '@/components/platform-request-list-item'
import { FocusedLayout } from '@/components/focused-layout'
import { PlatformRequestsTable } from '@/components/platform-requests-table'

const PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  flow: 'flow',
  ringtunes: 'ringtunes',
  'international-streaming': 'international_streaming',
  facebook: 'facebook',
  tiktok: 'tiktok',
}

const ROLE_PLATFORM_MAP: Record<UserRole, string | null> = {
  [UserRole.PLATFORM_YOUTUBE]: 'youtube',
  [UserRole.PLATFORM_FLOW]: 'flow',
  [UserRole.PLATFORM_RINGTUNES]: 'ringtunes',
  [UserRole.PLATFORM_INTERNATIONAL_STREAMING]: 'international_streaming',
  [UserRole.PLATFORM_FACEBOOK]: 'facebook',
  [UserRole.PLATFORM_TIKTOK]: 'tiktok',
  [UserRole.ADMIN]: null, // Admin can access all
  [UserRole.MANAGER]: null, // Manager can access all
  [UserRole.A_R]: null,
  [UserRole.DATA_TEAM]: null,
  [UserRole.CLIENT]: null,
}

export default async function PlatformPage({
  params,
  searchParams,
}: {
  params: { platform: string }
  searchParams: {
    status?: string
    channel?: string
    search?: string
    page?: string
  }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const platformSlug = params.platform
  const platformName = PLATFORM_MAP[platformSlug]

  if (!platformName) {
    return <div>Invalid platform</div>
  }

  const userRole = session.user.role as UserRole
  const userPlatform = ROLE_PLATFORM_MAP[userRole]

  // Check access
  if (
    userRole !== UserRole.ADMIN &&
    userRole !== UserRole.MANAGER &&
    userRole !== UserRole.A_R &&
    userRole !== UserRole.DATA_TEAM &&
    userPlatform !== platformName
  ) {
    redirect('/dashboard')
  }

  // Build where clause for filtering
  const where: any = {
    platform: platformName,
  }

  // For platform employees (not admin/manager), only show requests with channels assigned
  // This ensures they only see requests for specific channels that have been requested
  const isPlatformEmployee = userRole !== UserRole.ADMIN && 
                             userRole !== UserRole.MANAGER && 
                             userRole !== UserRole.A_R && 
                             userRole !== UserRole.DATA_TEAM &&
                             userPlatform === platformName
  
  const hasChannels = platformName === 'youtube' || platformName === 'facebook'
  
  if (isPlatformEmployee && hasChannels) {
    // Platform employees can only see requests that have a channel assigned
    where.channelName = { not: null }
  }

  // Status filter
  if (searchParams.status && searchParams.status !== 'all') {
    where.status = searchParams.status as PlatformRequestStatus
  }

  // Channel filter (for platforms with channels like YouTube)
  if (searchParams.channel && searchParams.channel !== 'all') {
    where.channelName = searchParams.channel
  }

  // Search filter
  if (searchParams.search) {
    where.OR = [
      { release: { title: { contains: searchParams.search, mode: 'insensitive' } } },
      { release: { artist: { name: { contains: searchParams.search, mode: 'insensitive' } } } },
    ]
  }

  const page = parseInt(searchParams.page || '1')
  const pageSize = 50

  // Get platform requests with pagination
  const [requests, total] = await Promise.all([
    prisma.platformRequest.findMany({
      where,
      include: {
        release: {
          include: {
            artist: true,
            tracks: true,
          },
        },
        track: true,
        decisions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        channel: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.platformRequest.count({ where }),
  ])

  // Get channels for this platform (if YouTube or other multi-channel platforms)
  const channels = platformName === 'youtube' || platformName === 'facebook'
    ? await prisma.platformChannel.findMany({
        where: {
          platform: platformName,
          active: true,
        },
        orderBy: { name: 'asc' },
      })
    : []

  // Get counts for stats
  const [pendingCount, uploadedCount, rejectedCount] = await Promise.all([
    prisma.platformRequest.count({ where: { ...where, status: PlatformRequestStatus.PENDING } }),
    prisma.platformRequest.count({ where: { ...where, status: PlatformRequestStatus.UPLOADED } }),
    prisma.platformRequest.count({ where: { ...where, status: PlatformRequestStatus.REJECTED } }),
  ])

  const totalPages = Math.ceil(total / pageSize)
  const platformDisplayName = platformName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <FocusedLayout
      title={`${platformDisplayName} Portal`}
      description="Review and approve/reject platform requests for upload"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Uploaded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{uploadedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <PlatformRequestsTable
          requests={requests as any}
          platformSlug={platformSlug}
          platformName={platformName}
          channels={channels}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          searchParams={searchParams}
          userRole={userRole}
        />
      </div>
    </FocusedLayout>
  )
}

