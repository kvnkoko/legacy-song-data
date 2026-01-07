import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const artistId = params.id

    // Fetch releases and tracks for this artist with full artist relationship data
    // Include releases via ReleaseArtist relationship
    const releasesViaRelationship = await prisma.release.findMany({
      where: {
        releaseArtists: {
          some: {
            artistId,
          },
        },
      },
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
    })

    // Also get releases via direct artistId
    const releasesViaDirect = await prisma.release.findMany({
      where: { artistId },
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
    })

    // Combine and deduplicate releases
    const releaseIds = new Set([...releasesViaRelationship.map(r => r.id), ...releasesViaDirect.map(r => r.id)])
    const releases = Array.from(releaseIds).map(id => {
      return releasesViaRelationship.find(r => r.id === id) || releasesViaDirect.find(r => r.id === id)!
    })

    // Get tracks from releases with full artist relationship data
    const tracksFromReleases = await prisma.track.findMany({
      where: {
        releaseId: {
          in: Array.from(releaseIds),
        },
      },
      include: {
        release: {
          select: {
            id: true,
            title: true,
            artist: {
              select: {
                id: true,
                name: true,
                legalName: true,
              },
            },
          },
        },
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
    })

    // Also get tracks via TrackArtist relationship
    const tracksViaRelationship = await prisma.track.findMany({
      where: {
        trackArtists: {
          some: {
            artistId,
          },
        },
        releaseId: {
          notIn: Array.from(releaseIds),
        },
      },
      include: {
        release: {
          select: {
            id: true,
            title: true,
            artist: {
              select: {
                id: true,
                name: true,
                legalName: true,
              },
            },
          },
        },
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
    })

    // Combine tracks and deduplicate
    const trackIds = new Set([...tracksFromReleases.map(t => t.id), ...tracksViaRelationship.map(t => t.id)])
    const tracks = Array.from(trackIds).map(id => {
      return tracksFromReleases.find(t => t.id === id) || tracksViaRelationship.find(t => t.id === id)!
    })

    // Format releases with current artist metadata
    const formattedReleases = releases.map(release => {
      // Primary artist from Release.artistId
      const primaryArtist = release.artist
      
      // Secondary artists from ReleaseArtist relationships
      const secondaryArtists = release.releaseArtists
        .filter(ra => !ra.isPrimary && ra.artistId !== release.artistId)
        .map(ra => ra.artist)
      
      // Check if source artist is primary (via artistId) or secondary (via ReleaseArtist)
      const sourceIsPrimary = release.artistId === artistId
      const sourceReleaseArtist = release.releaseArtists.find(ra => ra.artistId === artistId)
      const sourceIsSecondary = sourceReleaseArtist && !sourceReleaseArtist.isPrimary

      return {
        id: release.id,
        title: release.title,
        type: release.type,
        currentPrimaryArtist: primaryArtist ? {
          id: primaryArtist.id,
          name: primaryArtist.name,
          legalName: primaryArtist.legalName,
        } : null,
        currentSecondaryArtists: secondaryArtists.map(a => ({
          id: a.id,
          name: a.name,
          legalName: a.legalName,
        })),
        sourceArtistRole: sourceIsPrimary ? 'primary' : sourceIsSecondary ? 'secondary' : 'none',
      }
    })

    // Format tracks with current artist metadata
    const formattedTracks = tracks.map(track => {
      // Primary artists from TrackArtist with isPrimary=true
      const primaryArtists = track.trackArtists
        .filter(ta => ta.isPrimary)
        .map(ta => ta.artist)
      
      // Secondary artists from TrackArtist with isPrimary=false
      const secondaryArtists = track.trackArtists
        .filter(ta => !ta.isPrimary)
        .map(ta => ta.artist)
      
      // Also check release's primary artist if track has no TrackArtist entries
      if (primaryArtists.length === 0 && track.release?.artist) {
        primaryArtists.push(track.release.artist)
      }

      // Check if source artist is primary or secondary
      const sourceTrackArtist = track.trackArtists.find(ta => ta.artistId === artistId)
      const sourceIsPrimary = sourceTrackArtist?.isPrimary ?? false
      const sourceIsSecondary = sourceTrackArtist && !sourceTrackArtist.isPrimary

      return {
        id: track.id,
        name: track.name,
        performer: track.performer,
        composer: track.composer,
        band: track.band,
        musicProducer: track.musicProducer,
        release: {
          id: track.release.id,
          title: track.release.title,
        },
        currentPrimaryArtists: primaryArtists.map(a => ({
          id: a.id,
          name: a.name,
          legalName: a.legalName,
        })),
        currentSecondaryArtists: secondaryArtists.map(a => ({
          id: a.id,
          name: a.name,
          legalName: a.legalName,
        })),
        sourceArtistRole: sourceIsPrimary ? 'primary' : sourceIsSecondary ? 'secondary' : 'none',
      }
    })

    return NextResponse.json({
      releasesCount: formattedReleases.length,
      tracksCount: formattedTracks.length,
      releases: formattedReleases,
      tracks: formattedTracks,
    })
  } catch (error: any) {
    console.error('Merge preview error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch merge preview' },
      { status: 500 }
    )
  }
}



