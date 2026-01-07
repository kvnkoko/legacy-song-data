import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { UserRole } from '@prisma/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'
import { ArReleasesTable } from '@/components/ar-releases-table'
import { FocusedLayout } from '@/components/focused-layout'

// Force dynamic rendering to always show fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ArReleasesPage({
  searchParams,
}: {
  searchParams: { 
    search?: string
    page?: string
    type?: string
    platform?: string
    status?: string
    performer?: string
    composer?: string
    band?: string
    studio?: string
    label?: string
    genre?: string
    startDate?: string
    endDate?: string
    assignedAR?: string
    copyrightStatus?: string
    videoType?: string
    artist?: string
    sortField?: string
    sortDirection?: 'asc' | 'desc'
  }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const userRole = session.user.role as UserRole
  
  // Only allow A&R, Admin, and Manager
  if (userRole !== UserRole.A_R && userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const search = searchParams.search || ''
  const page = parseInt(searchParams.page || '1')
  const pageSize = 50

  // Build where clause for server-side filtering
  const where: any = {}

  // Search filter
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' as const } },
      { artist: { name: { contains: search, mode: 'insensitive' as const } } },
    ]
  }

  // Type filter
  if (searchParams.type && searchParams.type !== 'all') {
    where.type = searchParams.type
  }

  // Platform filter
  if (searchParams.platform && searchParams.platform !== 'all') {
    where.platformRequests = {
      some: {
        platform: searchParams.platform,
      },
    }
  }

  // Status filter
  if (searchParams.status && searchParams.status !== 'all') {
    if (where.platformRequests) {
      where.platformRequests = {
        ...where.platformRequests,
        some: {
          ...where.platformRequests.some,
          status: searchParams.status,
        },
      }
    } else {
      where.platformRequests = {
        some: {
          status: searchParams.status,
        },
      }
    }
  }

  // Track-level filters
  const trackFilters: any[] = []
  
  if (searchParams.performer && searchParams.performer !== 'all') {
    trackFilters.push({ performer: searchParams.performer })
  }
  
  if (searchParams.composer && searchParams.composer !== 'all') {
    trackFilters.push({ composer: searchParams.composer })
  }
  
  if (searchParams.band && searchParams.band !== 'all') {
    trackFilters.push({
      OR: [
        { band: searchParams.band },
        { musicProducer: searchParams.band },
      ],
    })
  }
  
  if (searchParams.studio && searchParams.studio !== 'all') {
    trackFilters.push({ studio: searchParams.studio })
  }
  
  if (searchParams.label && searchParams.label !== 'all') {
    trackFilters.push({ recordLabel: searchParams.label })
  }
  
  if (searchParams.genre && searchParams.genre !== 'all') {
    trackFilters.push({ genre: searchParams.genre })
  }

  if (trackFilters.length > 0) {
    where.tracks = {
      some: {
        AND: trackFilters,
      },
    }
  }

  // Date range filter
  if (searchParams.startDate || searchParams.endDate) {
    const dateFilter: any = {}
    if (searchParams.startDate) {
      dateFilter.gte = new Date(searchParams.startDate)
    }
    if (searchParams.endDate) {
      dateFilter.lte = new Date(searchParams.endDate)
    }
    where.legacyReleaseDate = dateFilter
  }

  // Assigned A&R filter
  if (searchParams.assignedAR && searchParams.assignedAR !== 'all') {
    if (searchParams.assignedAR === 'unassigned') {
      where.assignedA_RId = null
    } else {
      where.assignedA_RId = searchParams.assignedAR
    }
  }

  // Copyright Status filter
  if (searchParams.copyrightStatus && searchParams.copyrightStatus !== 'all') {
    where.copyrightStatus = searchParams.copyrightStatus
  }

  // Video Type filter
  if (searchParams.videoType && searchParams.videoType !== 'all') {
    where.videoType = searchParams.videoType
  }

  // Artist filter
  if (searchParams.artist && searchParams.artist !== 'all') {
    where.OR = [
      { artistId: searchParams.artist },
      { releaseArtists: { some: { artistId: searchParams.artist } } },
    ]
  }

  // Build orderBy clause - default to artistsChosenDate descending (newest first)
  let orderBy: any = { artistsChosenDate: 'desc' }
  if (searchParams.sortField) {
    const sortDirection = searchParams.sortDirection || 'asc'
    switch (searchParams.sortField) {
      case 'title':
        orderBy = { title: sortDirection }
        break
      case 'artist':
        orderBy = { artist: { name: sortDirection } }
        break
      case 'type':
        orderBy = { type: sortDirection }
        break
      case 'artistsDate':
        orderBy = { artistsChosenDate: sortDirection }
        break
      case 'legacyDate':
        orderBy = { legacyReleaseDate: sortDirection }
        break
      case 'tracks':
        orderBy = { tracks: { _count: sortDirection } }
        break
      case 'performer':
      case 'composer':
      case 'genre':
        orderBy = { createdAt: 'desc' }
        break
      default:
        orderBy = { artistsChosenDate: 'desc' }
    }
  }

  // Calculate stats
  let releases: any[] = []
  let total = 0
  let stats = {
    totalReleases: 0,
    totalTracks: 0,
    totalSingles: 0,
    totalAlbums: 0,
    totalUploaded: 0,
  }
  let dbError: string | null = null

  try {
    const results = await Promise.all([
      prisma.release.findMany({
        where,
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              legalName: true,
            },
          },
          releaseArtists: {
            select: {
              id: true,
              isPrimary: true,
              createdAt: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                  legalName: true,
                },
              },
            },
          },
          assignedA_R: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          tracks: {
            select: {
              id: true,
              name: true,
              performer: true,
              composer: true,
              band: true,
              musicProducer: true,
              studio: true,
              recordLabel: true,
              genre: true,
              trackNumber: true,
            },
            orderBy: { trackNumber: 'asc' },
          },
          platformRequests: {
            select: {
              platform: true,
              status: true,
              channelName: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.release.count({ where }),
      Promise.all([
        prisma.release.count(),
        prisma.track.count(),
        prisma.release.count({ where: { type: 'SINGLE' } }),
        prisma.release.count({ where: { type: 'ALBUM' } }),
        prisma.release.count({
          where: {
            platformRequests: {
              some: {
                status: 'UPLOADED',
              },
            },
          },
        }),
      ]).then(([totalReleases, totalTracks, totalSingles, totalAlbums, totalUploaded]) => ({
        totalReleases,
        totalTracks,
        totalSingles,
        totalAlbums,
        totalUploaded,
      })),
    ])

    releases = results[0]
    total = results[1]
    stats = results[2]
  } catch (error: any) {
    console.error('Database error:', error)
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P1001') {
      dbError = `Failed to connect to the database. Please ensure the database server is running and accessible.`
    } else if (error.message?.includes("Can't reach database server") || 
        error.message?.includes("P1001") ||
        error.code === 'P1001') {
      dbError = `Failed to connect to the database. Please ensure the database server is running and accessible.`
    } else {
      dbError = `An unexpected database error occurred: ${(error as Error).message}`
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  // Sort releaseArtists for each release
  const releasesWithSortedArtists = releases.map(release => ({
    ...release,
    releaseArtists: release.releaseArtists
      ? [...release.releaseArtists].sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) {
            return a.isPrimary ? -1 : 1
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
      : [],
  }))

  return (
    <FocusedLayout
      title="A&R Releases"
      description="Edit and manage releases being inputted into the system"
    >
      <div className="space-y-6">
        {dbError && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Database Error</AlertTitle>
            <AlertDescription>
              {dbError}
              <p className="mt-2">Please check your <code>.env</code> file for <code>DATABASE_URL</code> and ensure your database server is running.</p>
            </AlertDescription>
          </Alert>
        )}

        {!dbError && (
          <ArReleasesTable
            releases={releasesWithSortedArtists as any}
            total={total}
            currentPage={page}
            totalPages={totalPages}
            stats={stats}
            searchParams={searchParams}
            userRole={userRole}
          />
        )}
      </div>
    </FocusedLayout>
  )
}

