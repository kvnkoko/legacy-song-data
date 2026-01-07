import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Music, 
  Calendar, 
  Mail, 
  Phone,
  ArrowLeft,
  Link as LinkIcon,
  Upload,
  Edit,
  Disc
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { ArtistProfileImage } from '@/components/artist-profile-image'
import { AnimatedCard } from '@/components/animated-card'
import { StatsCard } from '@/components/stats-card'
import { EmptyState } from '@/components/empty-state'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ArtistReleasesTracksView } from '@/components/artist-releases-tracks-view'
import { ArtistDeleteButton } from '@/components/artist-delete-button'
import { ArtistMergeButton } from '@/components/artist-merge-button'
import { ArtistPhotoUpload } from '@/components/artist-photo-upload'
import { ArtistProfileClient, ArtistEditButton } from '@/components/artist-profile-client'
import { findDuplicatesForArtist } from '@/lib/artist-duplicate-detection'

export default async function ArtistProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  const userRole = session?.user?.role

  const artist = await prisma.artist.findUnique({
    where: { id: params.id },
    include: {
      releases: {
        include: {
          tracks: {
            include: {
              trackArtists: {
                include: {
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
          },
          platformRequests: true,
          artist: {
            select: {
              id: true,
              name: true,
              legalName: true,
            },
          },
          releaseArtists: {
            include: {
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
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      releaseArtists: {
        include: {
          release: {
            include: {
              tracks: {
                include: {
                  trackArtists: {
                    include: {
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
              },
              platformRequests: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                  legalName: true,
                },
              },
              releaseArtists: {
                include: {
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
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          release: {
            createdAt: 'desc',
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  })

  if (!artist) {
    notFound()
  }

  // Combine releases from direct artistId and ReleaseArtist relationship
  const releaseIdsFromDirect = artist.releases.map(r => r.id)
  const releaseIdsFromRelationship = artist.releaseArtists.map(ra => ra.release.id)
  const allReleaseIds = new Set([...releaseIdsFromDirect, ...releaseIdsFromRelationship])
  
  // Combine all releases for display (deduplicate)
  const allReleases = [
    ...artist.releases,
    ...artist.releaseArtists
      .map(ra => ra.release)
      .filter(r => !releaseIdsFromDirect.includes(r.id)),
  ]

  // Query tracks where this artist appears in performer, composer, band, or musicProducer
  // OR tracks linked via TrackArtist relationship
  // Use case-insensitive contains to match artist name even if it's part of a comma-separated list
  const releaseIds = Array.from(allReleaseIds)
  
  // Get tracks via TrackArtist relationship
  const tracksViaRelationship = await prisma.track.findMany({
    where: {
      trackArtists: {
        some: {
          artistId: artist.id,
        },
      },
      // Exclude tracks that are already in this artist's releases
      releaseId: {
        notIn: releaseIds,
      },
    },
    include: {
      trackArtists: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              legalName: true,
            },
          },
        },
      },
      release: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              legalName: true,
            },
          },
          releaseArtists: {
            include: {
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
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Only show tracks where artist is linked via TrackArtist relationship
  // Do NOT include tracks from string fields (composer, band, producer) to avoid false matches
  // This ensures only tracks where the artist is explicitly selected/assigned are shown
  const tracksWithArtist = tracksViaRelationship

  // Calculate accurate totals
  const totalReleases = allReleases.length
  const tracksFromReleases = allReleases.reduce((sum, r) => sum + r.tracks.length, 0)
  const totalTracks = tracksFromReleases + tracksWithArtist.length
  const uploadedReleases = artist.releases.filter(r => 
    r.platformRequests.some(p => p.status === 'UPLOADED')
  ).length

  // Check edit permissions
  const canEdit = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'A_R' || userRole === 'DATA_TEAM'
  const canDelete = userRole === 'ADMIN' || userRole === 'MANAGER'
  
  // Find potential duplicates for this artist
  const allArtists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      legalName: true,
      _count: {
        select: {
          releases: true,
          trackArtists: true,
        },
      },
    },
  })
  
  const potentialDuplicates = findDuplicatesForArtist(
    {
      id: artist.id,
      name: artist.name,
      legalName: artist.legalName,
      _count: {
        releases: artist.releases.length,
        trackArtists: tracksWithArtist.length,
      },
    },
    allArtists,
    0.85
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Header with Cover */}
      <div className="relative h-64 sm:h-72 lg:h-80 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-b border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 relative z-10">
          <Link href="/artists">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-4 hover:bg-primary/10 transition-colors backdrop-blur-sm bg-background/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Artists
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        <ArtistProfileClient artist={artist} canEdit={canEdit}>
        {/* Hero Profile Card */}
        <AnimatedCard delay={0.1}>
          <Card className="shadow-2xl border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Prominent Avatar with Upload */}
                <div className="flex-shrink-0 flex justify-center lg:justify-start">
                  {canEdit ? (
                    <ArtistPhotoUpload
                      artistId={artist.id}
                      currentPhoto={artist.photo}
                      canEdit={canEdit}
                    />
                  ) : (
                    <ArtistProfileImage
                      name={artist.name}
                      photo={artist.photo}
                      size="xl"
                      showGlow
                    />
                  )}
                </div>

                {/* Info Section */}
                <div className="flex-1 text-center lg:text-left space-y-6">
                  {/* Name and Badge */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-4">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent leading-tight">
                        {artist.name}
                      </h1>
                      {potentialDuplicates.length > 0 && (
                        <Badge variant="destructive" className="text-xs px-2.5 py-1.5 shrink-0">
                          {potentialDuplicates.length} Duplicate{potentialDuplicates.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    {artist.legalName && (
                      <p className="text-muted-foreground text-base sm:text-lg font-medium">
                        Legal Name: <span className="text-foreground/90">{artist.legalName}</span>
                      </p>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <StatsCard
                      title="Releases"
                      value={totalReleases}
                      icon="Music"
                      gradient={false}
                      delay={0.2}
                    />
                    <StatsCard
                      title="Tracks"
                      value={totalTracks}
                      icon="Music"
                      gradient={false}
                      delay={0.3}
                    />
                    <StatsCard
                      title="Uploaded"
                      value={uploadedReleases}
                      icon="Upload"
                      gradient={false}
                      delay={0.4}
                    />
                  </div>

                  {/* Contact Info */}
                  {(artist.contactEmail || artist.contactPhone) && (
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                      {artist.contactEmail && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                          <Mail className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate max-w-[200px]">{artist.contactEmail}</span>
                        </div>
                      )}
                      {artist.contactPhone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                          <Phone className="w-4 h-4 text-primary shrink-0" />
                          <span>{artist.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(canDelete || canEdit) && (
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
                      {canEdit && (
                        <>
                          <ArtistEditButton canEdit={canEdit} />
                          <ArtistMergeButton artist={artist} />
                        </>
                      )}
                      {canDelete && (
                        <ArtistDeleteButton
                          artistId={artist.id}
                          artistName={artist.name}
                          releaseCount={totalReleases}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Releases and Tracks Section */}
        <div className="mt-8 sm:mt-10 lg:mt-12">
          <ArtistReleasesTracksView
            artist={artist}
            releases={allReleases}
            tracksWithArtist={tracksWithArtist}
            canEdit={canEdit}
            totalReleases={totalReleases}
          />
        </div>

        {/* Internal Notes (if admin) */}
        {artist.internalNotes && (
          <AnimatedCard delay={0.6}>
            <Card className="mt-8 sm:mt-10 lg:mt-12 bg-gradient-to-br from-card via-card to-primary/5 border-primary/10 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {artist.internalNotes}
                </p>
              </CardContent>
            </Card>
          </AnimatedCard>
        )}
        </ArtistProfileClient>
      </div>
    </div>
  )
}

