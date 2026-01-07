import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { EnhancedReleasesTable } from '@/components/enhanced-releases-table'
import { UserRole } from '@prisma/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'
import { ReloadButton } from '@/components/reload-button'

// Force dynamic rendering to always show fresh data (important during imports)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: { 
    search?: string
    page?: string
    pageSize?: string
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
    sortDirection?: 'asc' | 'desc' | 'desc-nulls-last'
    missingArtist?: string
  }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const userRole = session.user.role as UserRole
  const search = searchParams.search || ''
  const page = parseInt(searchParams.page || '1')
  const pageSize = parseInt(searchParams.pageSize || '50')

  // Build where clause for server-side filtering
  const where: any = {}

  // Search filter - optimized for large datasets
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' as const } },
      { artist: { name: { contains: search, mode: 'insensitive' as const } } },
    ]
  }

  // Type filter
  const isEmptyTypeFilter = searchParams.type === 'EMPTY'
  if (searchParams.type && searchParams.type !== 'all') {
    if (isEmptyTypeFilter) {
      // Filter for releases with 0 tracks
      where.tracks = { none: {} }
    } else {
      // Filter by type (SINGLE or ALBUM) and ensure they have tracks
      where.type = searchParams.type
      where.tracks = { some: {} }
    }
  }

  // Platform filter
  if (searchParams.platform && searchParams.platform !== 'all') {
    where.platformRequests = {
      some: {
        platform: searchParams.platform,
      },
    }
  }

  // Status filter - combine with platform if both exist
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

  // Track-level filters - only apply if NOT filtering for empty releases
  // (empty releases have no tracks, so track filters don't make sense)
  if (!isEmptyTypeFilter) {
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

    // Combine all track filters with AND logic
    if (trackFilters.length > 0) {
      // If we already have a tracks filter from type (some: {}), replace it with our filters
      // The type filter already ensures tracks exist, so we just need to add the track-level filters
      where.tracks = {
        some: {
          AND: trackFilters,
        },
      }
    }
  }

  // Date range filter - filter by Legacy Release Date
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
    where.assignedA_RId = searchParams.assignedAR
  }

  // Copyright Status filter
  if (searchParams.copyrightStatus && searchParams.copyrightStatus !== 'all') {
    where.copyrightStatus = searchParams.copyrightStatus
  }

  // Video Type filter
  if (searchParams.videoType && searchParams.videoType !== 'all') {
    where.videoType = searchParams.videoType
  }

  // Artist filter - search in both primary artist and releaseArtists
  if (searchParams.artist && searchParams.artist !== 'all') {
    where.OR = [
      { artistId: searchParams.artist },
      { releaseArtists: { some: { artistId: searchParams.artist } } },
    ]
  }

  // Missing Album Artist filter - filter releases where primary artist is "Unknown Artist"
  if (searchParams.missingArtist === 'true') {
    where.artist = {
      name: 'Unknown Artist',
    }
  }

  // Filter out empty dates when using "desc-nulls-last" sorting (show only rows with dates)
  if (searchParams.sortField && searchParams.sortDirection === 'desc-nulls-last') {
    if (searchParams.sortField === 'artistsDate') {
      where.artistsChosenDate = { not: null }
    } else if (searchParams.sortField === 'legacyDate') {
      where.legacyReleaseDate = { not: null }
    }
  }

  // Build orderBy clause - optimized for indexed fields
  let orderBy: any = { createdAt: 'desc' }
  
  if (searchParams.sortField) {
    const sortDirection = searchParams.sortDirection || 'asc'
    // For "desc-nulls-last", we've already filtered out nulls, so just use 'desc'
    const effectiveDirection = sortDirection === 'desc-nulls-last' ? 'desc' : sortDirection
    
    switch (searchParams.sortField) {
      case 'title':
        orderBy = { title: effectiveDirection }
        break
      case 'artist':
        orderBy = { artist: { name: effectiveDirection } }
        break
      case 'type':
        orderBy = { type: effectiveDirection }
        break
      case 'artistsDate':
        orderBy = { artistsChosenDate: effectiveDirection }
        break
      case 'legacyDate':
        orderBy = { legacyReleaseDate: effectiveDirection }
        break
      case 'tracks':
        // For track count, we'll need to sort by _count
        orderBy = { tracks: { _count: effectiveDirection } }
        break
      case 'performer':
      case 'composer':
      case 'genre':
        // For track-level sorting, we need a more complex query
        // For now, fall back to default sorting
        orderBy = { createdAt: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }
  }

  // Calculate stats efficiently - run in parallel with error handling
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
    // Test connection first with a simple query (with timeout)
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
    ]) as any
    
    // For nulls-last sorting, use Prisma's orderBy with 'desc' 
    // and handle nulls-last at the application level for the current page
    // This is efficient since we're only sorting the paginated results
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
              trackArtists: {
                select: {
                  id: true,
                  isPrimary: true,
                  artist: {
                    select: {
                      id: true,
                      name: true,
                      legalName: true,
                    },
                  },
                },
              },
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
      // Calculate stats without filters for total counts
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
    // Check if it's a connection error
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P1001' || error.code === 'P1000') {
        dbError = `Failed to connect to the database. Please ensure the database server is running and accessible.`
      } else {
        dbError = `Database error (${error.code}): ${error.message || 'An unexpected database error occurred'}`
      }
    } else if (error.message?.includes("Can't reach database server") || 
        error.message?.includes("P1001") ||
        error.message?.includes("P1000") ||
        error.code === 'P1001' ||
        error.code === 'P1000') {
      dbError = `Failed to connect to the database. Please ensure the database server is running and accessible.`
    } else {
      dbError = `An unexpected database error occurred: ${(error as Error).message || 'Unknown error'}`
    }
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  // Sort releaseArtists for each release (since we can't use orderBy in findMany with pagination)
  // Only process if releases array is valid
  const releasesWithSortedArtists = (releases || []).map(release => ({
    ...release,
    releaseArtists: release.releaseArtists
      ? [...release.releaseArtists].sort((a, b) => {
          // Sort by isPrimary (desc) then createdAt (asc)
          if (a.isPrimary !== b.isPrimary) {
            return a.isPrimary ? -1 : 1
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
      : [],
  }))

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            Releases
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Manage and view all music releases
          </p>
        </div>
      </div>

      {dbError && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Database Error</AlertTitle>
          <AlertDescription>
            {dbError}
            <p className="mt-2">Please check your <code>.env</code> file for <code>DATABASE_URL</code> and ensure your database server is running.</p>
            <div className="mt-4">
              <ReloadButton />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!dbError && (
        <EnhancedReleasesTable
          releases={releasesWithSortedArtists as any}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          stats={stats}
          searchParams={searchParams}
          userRole={userRole}
        />
      )}
    </div>
  )
}
