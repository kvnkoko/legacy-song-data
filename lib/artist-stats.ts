import { prisma } from './db'

/**
 * Calculate accurate track count for an artist
 * Includes:
 * - Tracks from artist's releases
 * - Tracks via TrackArtist relationship (excluding those in releases)
 * - Tracks via string field matches (performer, composer, band, musicProducer) excluding those already counted
 */
export async function getArtistTrackCount(artistId: string, releaseIds: string[]): Promise<number> {
  // Count tracks from releases
  const tracksFromReleases = await prisma.track.count({
    where: {
      releaseId: {
        in: releaseIds,
      },
    },
  })

  // Get tracks via TrackArtist relationship (excluding those in releases)
  const tracksViaRelationship = await prisma.track.findMany({
    where: {
      trackArtists: {
        some: {
          artistId,
        },
      },
      releaseId: {
        notIn: releaseIds,
      },
    },
    select: {
      id: true,
    },
  })

  const trackIdsFromRelationship = new Set(tracksViaRelationship.map(t => t.id))

  // Get tracks via string field matches (excluding those in releases and already counted)
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { name: true },
  })

  if (!artist) return tracksFromReleases

  const tracksViaStringFields = await prisma.track.count({
    where: {
      OR: [
        { performer: { contains: artist.name, mode: 'insensitive' } },
        { composer: { contains: artist.name, mode: 'insensitive' } },
        { band: { contains: artist.name, mode: 'insensitive' } },
        { musicProducer: { contains: artist.name, mode: 'insensitive' } },
      ],
      releaseId: {
        notIn: releaseIds,
      },
      id: {
        notIn: Array.from(trackIdsFromRelationship),
      },
    },
  })

  return tracksFromReleases + tracksViaRelationship.length + tracksViaStringFields
}

/**
 * Get accurate statistics for an artist
 */
export async function getArtistStats(artistId: string) {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      releases: {
        select: {
          id: true,
        },
      },
      releaseArtists: {
        select: {
          releaseId: true,
        },
      },
    },
  })

  if (!artist) {
    return {
      releases: 0,
      tracks: 0,
    }
  }

  // Get all release IDs (from direct artistId and ReleaseArtist relationship)
  const releaseIds = new Set([
    ...artist.releases.map(r => r.id),
    ...artist.releaseArtists.map(ra => ra.releaseId),
  ])

  const releasesCount = releaseIds.size
  const tracksCount = await getArtistTrackCount(artistId, Array.from(releaseIds))

  return {
    releases: releasesCount,
    tracks: tracksCount,
  }
}

/**
 * Batch get stats for multiple artists (optimized)
 * This is more efficient than calling getArtistStats for each artist individually
 */
export async function getArtistsStatsBatch(artistIds: string[]) {
  
  if (artistIds.length === 0) {
    return new Map<string, { releases: number; tracks: number }>()
  }


  const artists = await prisma.artist.findMany({
    where: {
      id: {
        in: artistIds,
      },
    },
    include: {
      releases: {
        select: {
          id: true,
        },
      },
      releaseArtists: {
        select: {
          releaseId: true,
        },
      },
    },
  })

  // Get all artist names for string matching
  const artistNamesMap = new Map(artists.map(a => [a.id, a.name]))

  // Get all release IDs per artist
  const releaseIdsByArtist = new Map<string, Set<string>>()
  artists.forEach(artist => {
    const releaseIds = new Set([
      ...artist.releases.map(r => r.id),
      ...artist.releaseArtists.map(ra => ra.releaseId),
    ])
    releaseIdsByArtist.set(artist.id, releaseIds)
  })

  // Get all unique release IDs across all artists
  const allReleaseIds = new Set<string>()
  releaseIdsByArtist.forEach(releaseIds => {
    releaseIds.forEach(id => allReleaseIds.add(id))
  })

  // Count tracks from releases per artist (single query per artist, but can be optimized)
  const tracksFromReleasesByArtist = new Map<string, number>()
  // Use a single query to get all tracks from all releases, then group by artist
  if (allReleaseIds.size > 0) {
    const allTracks = await prisma.track.findMany({
      where: {
        releaseId: {
          in: Array.from(allReleaseIds),
        },
      },
      select: {
        id: true,
        releaseId: true,
      },
    })

    // Group tracks by release, then by artist
    const tracksByRelease = new Map<string, number>()
    allTracks.forEach(track => {
      tracksByRelease.set(track.releaseId, (tracksByRelease.get(track.releaseId) || 0) + 1)
    })

    // Count tracks per artist based on their releases
    artists.forEach(artist => {
      const releaseIds = releaseIdsByArtist.get(artist.id) || new Set()
      let count = 0
      releaseIds.forEach(releaseId => {
        count += tracksByRelease.get(releaseId) || 0
      })
      tracksFromReleasesByArtist.set(artist.id, count)
    })
  } else {
    artists.forEach(artist => {
      tracksFromReleasesByArtist.set(artist.id, 0)
    })
  }

  // Get tracks via TrackArtist relationship
  // CRITICAL: Query per artist to ensure correct exclusion of tracks from each artist's releases
  const tracksViaRelationshipByArtistQuery = new Map<string, any[]>()
  
  for (const [artistId, artistName] of artistNamesMap.entries()) {
    const artistReleaseIds = releaseIdsByArtist.get(artistId) || new Set()
    
    const artistTracks = await prisma.track.findMany({
      where: {
        trackArtists: {
          some: {
            artistId: artistId,
          },
        },
        // Exclude tracks from THIS artist's releases only
        releaseId: artistReleaseIds.size > 0 ? {
          notIn: Array.from(artistReleaseIds),
        } : undefined,
      },
      select: {
        id: true,
        trackArtists: {
          where: {
            artistId: artistId,
          },
          select: {
            artistId: true,
          },
        },
      },
    })
    
    tracksViaRelationshipByArtistQuery.set(artistId, artistTracks)
  }
  
  // Group tracks by artist - use per-artist query results directly
  const tracksViaRelationshipByArtist = new Map<string, Set<string>>()
  tracksViaRelationshipByArtistQuery.forEach((tracks, artistId) => {
    const trackIds = new Set(tracks.map(t => t.id))
    tracksViaRelationshipByArtist.set(artistId, trackIds)
    
  })

  // Get tracks via string field matches
  // CRITICAL: Query per artist to ensure correct exclusion of tracks from each artist's releases
  // Each artist should exclude tracks from THEIR releases, not from ALL artists' releases
  const tracksViaStringFieldsByArtistQuery = new Map<string, any[]>()
  
  for (const [artistId, artistName] of artistNamesMap.entries()) {
    const artistReleaseIds = releaseIdsByArtist.get(artistId) || new Set()
    const artistRelationshipTracks = tracksViaRelationshipByArtist.get(artistId) || new Set()
    
    // Query tracks for this specific artist
    const artistTracks = await prisma.track.findMany({
      where: {
        OR: [
          { performer: { contains: artistName, mode: 'insensitive' } },
          { composer: { contains: artistName, mode: 'insensitive' } },
          { band: { contains: artistName, mode: 'insensitive' } },
          { musicProducer: { contains: artistName, mode: 'insensitive' } },
        ],
        // Exclude tracks from THIS artist's releases only
        releaseId: artistReleaseIds.size > 0 ? {
          notIn: Array.from(artistReleaseIds),
        } : undefined,
        // Exclude tracks already found via relationship for this artist
        id: artistRelationshipTracks.size > 0 ? {
          notIn: Array.from(artistRelationshipTracks),
        } : undefined,
      },
      select: {
        id: true,
        performer: true,
        composer: true,
        band: true,
        musicProducer: true,
      },
    })
    
    tracksViaStringFieldsByArtistQuery.set(artistId, artistTracks)
  }


  // Match tracks to artists - use the per-artist query results directly
  const tracksViaStringFieldsByArtist = new Map<string, Set<string>>()
  tracksViaStringFieldsByArtistQuery.forEach((tracks, artistId) => {
    const trackIds = new Set(tracks.map(t => t.id))
    // Check if not already counted via relationship
    const relationshipTracks = tracksViaRelationshipByArtist.get(artistId) || new Set()
    tracks.forEach(track => {
      if (!relationshipTracks.has(track.id)) {
        if (!tracksViaStringFieldsByArtist.has(artistId)) {
          tracksViaStringFieldsByArtist.set(artistId, new Set())
        }
        tracksViaStringFieldsByArtist.get(artistId)!.add(track.id)
      }
    })
    
  })

  // Combine all counts
  const statsMap = new Map<string, { releases: number; tracks: number }>()
  artists.forEach(artist => {
    const releaseIds = releaseIdsByArtist.get(artist.id) || new Set()
    const releasesCount = releaseIds.size
    
    const tracksFromReleases = tracksFromReleasesByArtist.get(artist.id) || 0
    const tracksFromRelationship = (tracksViaRelationshipByArtist.get(artist.id) || new Set()).size
    const tracksFromStringFields = (tracksViaStringFieldsByArtist.get(artist.id) || new Set()).size
    
    const tracksCount = tracksFromReleases + tracksFromRelationship + tracksFromStringFields


    statsMap.set(artist.id, {
      releases: releasesCount,
      tracks: tracksCount,
    })
  })

  // Ensure all artist IDs have entries (even if artist wasn't found)
  artistIds.forEach(id => {
    if (!statsMap.has(id)) {
      statsMap.set(id, { releases: 0, tracks: 0 })
    }
  })

  return statsMap
}
