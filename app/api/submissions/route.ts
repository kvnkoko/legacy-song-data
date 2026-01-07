import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReleaseType } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'
import { parseArtists, findOrCreateArtists } from '@/lib/csv-importer'

export async function POST(req: NextRequest) {
  try {
    // Allow anonymous submissions - no auth required
    const session = await getServerSession(authOptions)

    const body = await req.json()
    const {
      artistId, // Legacy support
      artistName, // Legacy support
      artistNames, // Legacy support - array of artist names
      artistIds, // NEW: Array of artist IDs (first is primary)
      legalName,
      releaseType,
      releaseTitle,
      artistsChosenDate,
      songs,
      contactEmail,
      contactPhone,
    } = body

    // Support multiple artists - prioritize artistIds, then fallback to legacy methods
    let artistIdsList: string[] = []
    
    if (artistIds && Array.isArray(artistIds) && artistIds.length > 0) {
      // NEW: Use artistIds array directly
      artistIdsList = artistIds
    } else {
      // Legacy support: parse from artistNames, artistName, or artistId
      let artistNamesList: string[] = []
      if (artistNames && Array.isArray(artistNames)) {
        artistNamesList = artistNames
      } else if (artistName) {
        // Parse comma-separated artist names
        artistNamesList = parseArtists(artistName)
      } else if (artistId) {
        // Single artist ID provided - find and use that
        const singleArtist = await prisma.artist.findUnique({ where: { id: artistId } })
        if (singleArtist) {
          artistNamesList = [singleArtist.name]
        }
      }
      
      // Convert artist names to IDs
      if (artistNamesList.length > 0) {
        const artists = await findOrCreateArtists(artistNamesList, prisma)
        artistIdsList = artists.map(a => a.id)
      }
    }

    if (artistIdsList.length === 0) {
      return NextResponse.json({ error: 'At least one artist is required' }, { status: 400 })
    }

    // Get artists by IDs
    const artists = await prisma.artist.findMany({
      where: {
        id: {
          in: artistIdsList,
        },
      },
    })

    if (artists.length === 0) {
      return NextResponse.json({ error: 'Failed to find artists' }, { status: 400 })
    }

    // Ensure artists are in the same order as artistIdsList
    const orderedArtists = artistIdsList
      .map(id => artists.find(a => a.id === id))
      .filter(Boolean) as typeof artists

    // Primary artist is the first one
    const primaryArtist = orderedArtists[0]

    // Update legalName for primary artist if provided
    if (legalName && legalName.trim()) {
      await prisma.artist.update({
        where: { id: primaryArtist.id },
        data: {
          legalName: legalName.trim(),
        },
      })
    }

    // Legacy support: if artistId was provided and it's not in the list, use it as primary
    let artist = primaryArtist
    if (artistId) {
      const providedArtist = await prisma.artist.findUnique({ where: { id: artistId } })
      if (providedArtist && !artists.find(a => a.id === artistId)) {
        // Artist ID provided but not in parsed list - use it as primary
        artist = providedArtist
        artists.unshift(providedArtist) // Add to beginning
      } else if (providedArtist) {
        artist = providedArtist
      }
    }

    // Count valid songs (songs with names)
    const validSongs = songs.filter(s => s.name && s.name.trim() !== '')
    
    // If only one song is provided, force release type to SINGLE (even if user selected ALBUM)
    const finalReleaseType = validSongs.length === 1 ? ReleaseType.SINGLE : (releaseType === 'ALBUM' ? ReleaseType.ALBUM : ReleaseType.SINGLE)

    // Create release
    const release = await prisma.release.create({
      data: {
        type: finalReleaseType,
        title: releaseTitle,
        artistId: artist.id, // Primary artist
        artistsChosenDate: artistsChosenDate ? new Date(artistsChosenDate) : null,
      },
    })

    // Create ReleaseArtist entries for all artists (first one is primary)
    for (let idx = 0; idx < artists.length; idx++) {
      await prisma.releaseArtist.create({
        data: {
          releaseId: release.id,
          artistId: artists[idx].id,
          isPrimary: idx === 0,
        },
      })
    }

    // Create tracks (only for valid songs with names)
    let trackNumber = 1
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i]
      if (song.name && song.name.trim() !== '') {
        // Parse track artists if provided (from song.artistName or song.artistNames)
        let trackArtists: Array<{ id: string; name: string }> = []
        if (song.artistNames && Array.isArray(song.artistNames)) {
          trackArtists = await findOrCreateArtists(song.artistNames, prisma)
        } else if (song.artistName) {
          const trackArtistNames = parseArtists(song.artistName)
          if (trackArtistNames.length > 0) {
            trackArtists = await findOrCreateArtists(trackArtistNames, prisma)
          }
        }

        // If no track artists, use release artists as fallback
        if (trackArtists.length === 0) {
          trackArtists = artists
        }

        const track = await prisma.track.create({
          data: {
            releaseId: release.id,
            name: song.name,
            performer: song.performer,
            composer: song.composer,
            band: song.band,
            musicProducer: song.musicProducer,
            studio: song.studio,
            recordLabel: song.recordLabel,
            genre: song.genre,
            trackNumber: trackNumber++,
          },
        })

        // Create TrackArtist entries for this track
        for (let idx = 0; idx < trackArtists.length; idx++) {
          await prisma.trackArtist.create({
            data: {
              trackId: track.id,
              artistId: trackArtists[idx].id,
              isPrimary: idx === 0,
            },
          })
        }

        // Create audit log for track creation (if user is logged in)
        if (session?.user?.id) {
          await createAuditLog(prisma, {
            userId: session.user.id,
            releaseId: release.id,
            entityType: 'track',
            entityId: track.id,
            action: 'create',
            newValue: JSON.stringify({ name: track.name, trackNumber: track.trackNumber }),
          })
        }
      }
    }

    // Create audit log (if user is logged in and exists in database)
    if (session?.user?.id) {
      await createAuditLog(prisma, {
        userId: session.user.id,
        releaseId: release.id,
        entityType: 'release',
        entityId: release.id,
        action: 'create',
      })
    }

    return NextResponse.json({ releaseId: release.id })
  } catch (error: any) {
    console.error('Submission error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    // Ensure error message doesn't reference undefined variables
    let errorMessage = error.message || 'Failed to submit release'
    
    // Check if error is related to missing artist data
    if (errorMessage.includes('artistName') && !errorMessage.includes('is required')) {
      errorMessage = 'Artist information is required. Please ensure at least one artist is selected.'
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

