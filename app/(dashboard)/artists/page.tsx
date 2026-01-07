import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Search,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { UserRole } from '@prisma/client'
import { ArtistEditButton } from '@/components/artist-edit-button'
import { ArtistDeleteButton } from '@/components/artist-delete-button'
import { ProfileCard } from '@/components/profile-card'
import { EmptyState } from '@/components/empty-state'
import { AnimatedCard } from '@/components/animated-card'
import { ArtistFilters } from '@/components/artist-filters'
import { ArtistMergeButton } from '@/components/artist-merge-button'
import { FindDuplicatesButton } from '@/components/find-duplicates-button'

export const dynamic = 'force-dynamic'

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }> | { search?: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  try {
    const role = session.user.role as UserRole
    // Use string literals instead of UserRole enum to avoid RSC serialization issues
    const canEdit = role === 'ADMIN' || role === 'MANAGER'

    // Handle both Promise and direct object for searchParams (Next.js 14 vs 15)
    const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
    const search = resolvedSearchParams.search || ''

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { legalName: { contains: search, mode: 'insensitive' as const } },
            { contactEmail: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const artists = await prisma.artist.findMany({
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
      take: 1000,
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
      
      // Note: We're not including string field matches (performer, composer, etc.) here for performance
      // The profile page includes these, but for the list view we prioritize speed
      // The core counts (releases + tracks from relationships) are accurate
      
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

    // Get total counts
    const totalArtists = await prisma.artist.count()
    const totalReleases = await prisma.release.count()
    const totalTracks = await prisma.track.count()

    // TEMPORARILY DISABLED: duplicate detection
    const duplicates: any[] = []
    const duplicateArtistIds = new Set<string>()

    // Convert Map to plain object for serialization
    const statsObject = Object.fromEntries(statsMap)

    return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            <User className="w-8 h-8 text-primary" />
            Artists
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {search
              ? `${artists.length} artist${artists.length !== 1 ? 's' : ''} found`
              : `${totalArtists} total artist${totalArtists !== 1 ? 's' : ''}`}
            {!search && (
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

      {/* Search */}
      <AnimatedCard delay={0.1}>
        <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/10">
          <CardContent className="p-4">
            <ArtistFilters />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist, index) => {
          const stats = statsObject[artist.id] || { releases: 0, tracks: 0, uploaded: 0 }
          const totalReleases = stats.releases
          const totalTracks = stats.tracks
          const uploadedReleases = stats.uploaded

          const allReleaseIds = new Set([
            ...artist.releases.map(r => r.id),
            ...artist.releaseArtists.map(ra => ra.releaseId),
          ])
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
                    <ArtistMergeButton artist={artist} />
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
      )}

      {artists.length === 0 && (
        <EmptyState
          icon="User"
          title="No artists found"
          description={search ? "Try adjusting your search terms" : "Artists will appear here once they're added to the system"}
        />
      )}
    </div>
  )
  } catch (error: any) {
    // NEXT_REDIRECT is a special error thrown by Next.js redirect() - don't catch it
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    
    console.error('Error loading artists page:', error)
    throw error
  }
}
