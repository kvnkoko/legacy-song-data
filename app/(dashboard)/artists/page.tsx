import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  AlertTriangle
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { ArtistEditButton } from '@/components/artist-edit-button'
import { ArtistDeleteButton } from '@/components/artist-delete-button'
import { ProfileCard } from '@/components/profile-card'
import { EmptyState } from '@/components/empty-state'
import { AnimatedCard } from '@/components/animated-card'
import { ArtistFilters } from '@/components/artist-filters'
import { ArtistMergeButton } from '@/components/artist-merge-button'
import { FindDuplicatesButton } from '@/components/find-duplicates-button'
import { Pagination } from '@/components/ui/pagination'
import { ArtistsPageClient } from '@/components/artists-page-client'

export const dynamic = 'force-dynamic'

// Helper function to get the first letter of a name (for alphabet filtering)
function getFirstLetter(name: string): string {
  if (!name || name.length === 0) return '#'
  const firstChar = name.charAt(0).toUpperCase()
  return /[A-Z]/.test(firstChar) ? firstChar : '#'
}

// Calculate letter counts for all artists (optimized query)
async function getLetterCounts(searchFilter?: any): Promise<Record<string, number>> {
  const artists = await prisma.artist.findMany({
    where: searchFilter || {},
    select: {
      name: true,
    },
  })

  const counts: Record<string, number> = {}
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  
  // Initialize all letters
  alphabet.forEach(letter => {
    counts[letter] = 0
  })
  counts['#'] = 0

  // Count artists by first letter
  artists.forEach(artist => {
    const letter = getFirstLetter(artist.name)
    counts[letter] = (counts[letter] || 0) + 1
  })

  return counts
}

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    search?: string
    letter?: string
    page?: string
    pageSize?: string
  }> | { 
    search?: string
    letter?: string
    page?: string
    pageSize?: string
  }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  try {
    const role = session.user.role as UserRole
    const canEdit = role === 'ADMIN' || role === 'MANAGER'

    // Handle both Promise and direct object for searchParams (Next.js 14 vs 15)
    const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
    const search = resolvedSearchParams.search || ''
    const letter = resolvedSearchParams.letter
    const page = parseInt(resolvedSearchParams.page || '1')
    const pageSize = parseInt(resolvedSearchParams.pageSize || '24') // Default to 24 for grid layout

    // Build where clause
    const where: any = {}

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { legalName: { contains: search, mode: 'insensitive' as const } },
        { contactEmail: { contains: search, mode: 'insensitive' as const } },
      ]
    }

    // Alphabet filter
    if (letter && letter !== '#') {
      // Filter by first letter (case-insensitive)
      if (where.OR) {
        // If we have search OR conditions, combine with AND
        where.AND = [
          { OR: where.OR },
          { name: { startsWith: letter, mode: 'insensitive' as const } }
        ]
        delete where.OR
      } else {
        where.name = { startsWith: letter, mode: 'insensitive' as const }
      }
    } else if (letter === '#') {
      // Filter for names that don't start with a letter
      // Build NOT conditions for all letters
      const letterConditions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
        name: { startsWith: l, mode: 'insensitive' as const }
      }))
      
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { NOT: { OR: letterConditions } }
        ]
        delete where.OR
      } else {
        where.NOT = { OR: letterConditions }
      }
    }

    // Get total count for pagination
    const totalArtists = await prisma.artist.count({ where })

    // Calculate pagination
    const totalPages = Math.max(1, Math.ceil(totalArtists / pageSize))
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const skip = (currentPage - 1) * pageSize

    // Get letter counts (for alphabet navigation)
    // If search is active, show counts based on search results
    // Otherwise, show counts for all artists
    const letterCounts = await getLetterCounts(search ? where : {})

    // Fetch artists with pagination
    let artists = await prisma.artist.findMany({
      where,
      include: {
        releases: {
          select: {
            id: true,
            title: true,
            tracks: {
              select: {
                id: true,
              },
            },
            platformRequests: {
              select: {
                status: true,
              },
            },
          },
        },
        releaseArtists: {
          select: {
            releaseId: true,
            release: {
              select: {
                id: true,
                tracks: {
                  select: {
                    id: true,
                  },
                },
                platformRequests: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
        trackArtists: {
          select: {
            trackId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    })

    // Calculate accurate stats matching the profile page logic exactly
    const statsMap = new Map<string, { releases: number; tracks: number; uploaded: number }>()
    
    // Build artist release ID maps for efficient lookup
    const artistReleaseIdsMap = new Map<string, Set<string>>()
    const artistReleaseObjectsMap = new Map<string, any[]>()
    const artistTrackIdsInReleasesMap = new Map<string, Set<string>>()
    
    for (const artist of artists) {
      const releaseIdsFromDirect = artist.releases.map(r => r.id)
      const releaseIdsFromRelationship = artist.releaseArtists.map(ra => ra.releaseId)
      const allReleaseIds = new Set([...releaseIdsFromDirect, ...releaseIdsFromRelationship])
      
      const allReleases = [
        ...artist.releases,
        ...artist.releaseArtists
          .map(ra => ra.release)
          .filter(r => r && !releaseIdsFromDirect.includes(r.id)),
      ].filter(Boolean)
      
      // Get all track IDs that are in this artist's releases
      const trackIdsInReleases = new Set(
        allReleases.flatMap(r => r.tracks?.map((t: any) => t.id) || [])
      )
      
      artistReleaseIdsMap.set(artist.id, allReleaseIds)
      artistReleaseObjectsMap.set(artist.id, allReleases)
      artistTrackIdsInReleasesMap.set(artist.id, trackIdsInReleases)
    }
    
    // Get all track IDs from TrackArtist relationships for batch query
    const allTrackIdsFromRelationships = new Set<string>()
    const trackIdToArtistIdsMap = new Map<string, Set<string>>()
    
    for (const artist of artists) {
      for (const ta of artist.trackArtists) {
        allTrackIdsFromRelationships.add(ta.trackId)
        if (!trackIdToArtistIdsMap.has(ta.trackId)) {
          trackIdToArtistIdsMap.set(ta.trackId, new Set())
        }
        trackIdToArtistIdsMap.get(ta.trackId)!.add(artist.id)
      }
    }
    
    // Batch query all tracks to get their releaseIds (one query instead of per-artist)
    const tracksWithReleaseIds = allTrackIdsFromRelationships.size > 0
      ? await prisma.track.findMany({
          where: {
            id: { in: Array.from(allTrackIdsFromRelationships) },
          },
          select: {
            id: true,
            releaseId: true,
          },
        })
      : []
    
    const trackReleaseIdMap = new Map(tracksWithReleaseIds.map(t => [t.id, t.releaseId || '']))
    
    // Process each artist to calculate stats
    for (const artist of artists) {
      const allReleaseIds = artistReleaseIdsMap.get(artist.id)!
      const allReleases = artistReleaseObjectsMap.get(artist.id)!
      const trackIdsInReleases = artistTrackIdsInReleasesMap.get(artist.id)!
      const releaseIdsArray = Array.from(allReleaseIds)
      
      // Count tracks from releases
      const tracksFromReleases = allReleases.reduce((sum, r) => {
        return sum + (r.tracks?.length || 0)
      }, 0)
      
      // Count tracks from TrackArtist relationship that are NOT in this artist's releases
      const trackIdsFromRelationship = artist.trackArtists.map(ta => ta.trackId)
      const tracksNotInReleases = trackIdsFromRelationship.filter(trackId => {
        // Check if track is in releases by checking if its releaseId is in artist's releases
        const trackReleaseId = trackReleaseIdMap.get(trackId)
        return trackReleaseId && !releaseIdsArray.includes(trackReleaseId)
      }).length
      
      // Total tracks = tracks from releases + tracks from relationship (not in releases)
      const totalTracks = tracksFromReleases + tracksNotInReleases
      
      // Count uploaded releases
      const uploadedFromDirect = artist.releases.filter(r => 
        r.platformRequests?.some(p => p.status === 'UPLOADED')
      ).length
      
      const uploadedFromRelationship = artist.releaseArtists
        .map(ra => ra.release)
        .filter(r => r && r.platformRequests?.some(p => p.status === 'UPLOADED'))
        .length
      
      const uploadedReleases = uploadedFromDirect + uploadedFromRelationship
      
      statsMap.set(artist.id, {
        releases: allReleaseIds.size,
        tracks: totalTracks,
        uploaded: uploadedReleases,
      })
    }

    // Get total counts for display
    const totalReleases = await prisma.release.count()
    const totalTracks = await prisma.track.count()

    // TEMPORARILY DISABLED: duplicate detection
    const duplicates: any[] = []
    const duplicateArtistIds = new Set<string>()

    // Convert Map to plain object for serialization
    const statsObject = Object.fromEntries(statsMap)

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent break-words">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span>Artists</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {search || letter
                ? `${totalArtists} artist${totalArtists !== 1 ? 's' : ''} found`
                : `${totalArtists} total artist${totalArtists !== 1 ? 's' : ''}`}
              {!search && !letter && (
                <span className="ml-2 text-xs">
                  ({totalReleases} releases, {totalTracks} tracks)
                </span>
              )}
            </p>
          </div>
          {canEdit && duplicates.length > 0 && (
            <FindDuplicatesButton duplicates={duplicates} />
          )}
        </div>

        {/* Search and Filters */}
        <AnimatedCard delay={0.1}>
          <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/10">
            <CardContent className="p-4 sm:p-6">
              <ArtistFilters 
                currentLetter={letter}
                letterCounts={letterCounts}
              />
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Duplicate Detection Info */}
        {duplicates.length > 0 && (
          <AnimatedCard delay={0.15}>
            <div className="bg-yellow-500/10 border-yellow-500/20 border rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-yellow-900 dark:text-yellow-100">
                  Potential Duplicates Detected
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  Found {duplicates.length} potential duplicate pair{duplicates.length !== 1 ? 's' : ''}. 
                  Review and merge duplicate artists to keep your database clean.
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Artist Grid */}
        {artists.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
              {artists.map((artist, index) => {
                const stats = statsObject[artist.id] || { releases: 0, tracks: 0, uploaded: 0 }
                const totalReleases = stats.releases
                const totalTracks = stats.tracks
                const uploadedReleases = stats.uploaded

                const latestRelease = artist.releases && artist.releases.length > 0 ? artist.releases[0] : null
                const isDuplicate = duplicateArtistIds.has(artist.id)

                return (
                  <AnimatedCard key={artist.id} delay={index * 0.03} hover glow>
                    <ProfileCard
                      type="artist"
                      name={artist.name}
                      subtitle={artist.legalName || undefined}
                      photo={artist.photo}
                      stats={[
                        { label: 'Releases', value: totalReleases, icon: 'Music' },
                        { label: 'Tracks', value: totalTracks, icon: 'Music' },
                        { label: 'Uploaded', value: uploadedReleases, icon: 'Upload' },
                      ]}
                      badges={[
                        ...(latestRelease ? [latestRelease.title] : []),
                        ...(isDuplicate ? [
                          <Badge key="duplicate" variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Duplicate
                          </Badge>
                        ] : []),
                      ]}
                      href={`/profiles/artist/${artist.id}`}
                      actions={canEdit && (
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                          <ArtistEditButton artistId={artist.id} />
                          <ArtistMergeButton artist={artist as any} />
                          <ArtistDeleteButton 
                            artistId={artist.id} 
                            artistName={artist.name}
                            releaseCount={totalReleases}
                          />
                        </div>
                      )}
                    />
                  </AnimatedCard>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <ArtistsPageClient
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalArtists}
                  pageSize={pageSize}
                  searchParams={resolvedSearchParams}
                />
              </div>
            )}
          </>
        )}

        {artists.length === 0 && (
          <EmptyState
            icon="User"
            title="No artists found"
            description={
              search || letter
                ? "Try adjusting your search terms or selecting a different letter"
                : "Artists will appear here once they're added to the system"
            }
          />
        )}
      </div>
    )
  } catch (error: any) {
    // NEXT_REDIRECT is a special error thrown by Next.js redirect() - don't catch it
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    
    // Only log non-critical errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading artists page:', error)
    }
    throw error
  }
}
