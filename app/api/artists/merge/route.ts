import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      sourceArtistId, 
      targetArtistId, 
      secondaryArtistId, 
      secondaryArtistName,
      trackConfigurations, // Array of { trackId: string, isPrimary: boolean }
      releaseConfigurations // Array of { releaseId: string, isPrimary: boolean }
    } = body

    if (!sourceArtistId || !targetArtistId) {
      return NextResponse.json(
        { error: 'Source and target artist IDs are required' },
        { status: 400 }
      )
    }

    if (sourceArtistId === targetArtistId) {
      return NextResponse.json(
        { error: 'Source and target artists must be different' },
        { status: 400 }
      )
    }

    // Verify both artists exist
    const [sourceArtist, targetArtist] = await Promise.all([
      prisma.artist.findUnique({
        where: { id: sourceArtistId },
        include: {
          releases: {
            include: { tracks: true },
          },
          releaseArtists: {
            include: { release: { include: { tracks: true } } },
          },
          trackArtists: true,
        },
      }),
      prisma.artist.findUnique({
        where: { id: targetArtistId },
      }),
    ])

    if (!sourceArtist) {
      return NextResponse.json({ error: 'Source artist not found' }, { status: 404 })
    }

    if (!targetArtist) {
      return NextResponse.json({ error: 'Target artist not found' }, { status: 404 })
    }

    // Handle secondary artist creation/validation
    let finalSecondaryArtistId: string | null = null
    if (secondaryArtistId) {
      // Verify existing secondary artist
      const existingSecondary = await prisma.artist.findUnique({
        where: { id: secondaryArtistId },
      })
      if (!existingSecondary) {
        return NextResponse.json({ error: 'Secondary artist not found' }, { status: 404 })
      }
      finalSecondaryArtistId = secondaryArtistId
    } else if (secondaryArtistName && secondaryArtistName.trim()) {
      // Create new secondary artist
      const newSecondary = await prisma.artist.create({
        data: {
          name: secondaryArtistName.trim(),
        },
      })
      finalSecondaryArtistId = newSecondary.id
    }

    // Perform merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Collect all affected track IDs for secondary artist addition
      const affectedTrackIds = new Set<string>()

      // 1. Transfer all releases from source to target (batch update)
      const releasesToTransfer = sourceArtist.releases || []
      const releaseConfigMap = new Map<string, boolean>()
      if (releaseConfigurations && Array.isArray(releaseConfigurations)) {
        releaseConfigurations.forEach((config: { releaseId: string, isPrimary: boolean }) => {
          releaseConfigMap.set(config.releaseId, config.isPrimary)
        })
      }

      if (releasesToTransfer.length > 0) {
        // Collect track IDs from releases
        releasesToTransfer.forEach(release => {
          release.tracks?.forEach(track => {
            affectedTrackIds.add(track.id)
          })
        })

        // Batch update releases
        await tx.release.updateMany({
          where: { artistId: sourceArtistId },
          data: { artistId: targetArtistId },
        })

        // For each release, ensure tracks have TrackArtist entries
        // This is critical: tracks linked only via Release.artistId need TrackArtist entries
        for (const release of releasesToTransfer) {
          if (release.tracks && release.tracks.length > 0) {
            const trackIds = release.tracks.map(t => t.id)
            
            // Check which tracks already have TrackArtist entries for target artist
            const existingTrackArtists = await tx.trackArtist.findMany({
              where: {
                trackId: { in: trackIds },
                artistId: targetArtistId,
              },
            })
            const existingTrackIds = new Set(existingTrackArtists.map(eta => eta.trackId))
            
            // For tracks that don't have TrackArtist entries yet, create them
            // Use per-item config if provided, otherwise default to primary (since release is primary)
            const tracksToCreate = trackIds
              .filter(trackId => !existingTrackIds.has(trackId))
              .map(trackId => {
                // Check if there's a per-track configuration
                const trackConfig = trackConfigurations?.find((tc: { trackId: string }) => tc.trackId === trackId)
                const isPrimary = trackConfig ? trackConfig.isPrimary : true // Default to primary
                
                return {
                  trackId,
                  artistId: targetArtistId,
                  isPrimary,
                }
              })

            if (tracksToCreate.length > 0) {
              await tx.trackArtist.createMany({
                data: tracksToCreate,
                skipDuplicates: true,
              })
            }
          }
        }
      }

      // 2. Transfer all TrackArtist entries (batch operations)
      const trackArtistsToTransfer = sourceArtist.trackArtists || []
      const trackConfigMap = new Map<string, boolean>()
      if (trackConfigurations && Array.isArray(trackConfigurations)) {
        trackConfigurations.forEach((config: { trackId: string, isPrimary: boolean }) => {
          trackConfigMap.set(config.trackId, config.isPrimary)
        })
      }

      trackArtistsToTransfer.forEach(ta => {
        affectedTrackIds.add(ta.trackId)
      })

      if (trackArtistsToTransfer.length > 0) {
        // Get all track IDs that need updating
        const trackIds = trackArtistsToTransfer.map(ta => ta.trackId)
        
        // Find existing TrackArtist entries for target artist on these tracks
        const existingTrackArtists = await tx.trackArtist.findMany({
          where: {
            trackId: { in: trackIds },
            artistId: targetArtistId,
          },
        })
        const existingTrackIds = new Set(existingTrackArtists.map(eta => eta.trackId))

        // Delete source TrackArtist entries (batch)
        await tx.trackArtist.deleteMany({
          where: {
            trackId: { in: trackIds },
            artistId: sourceArtistId,
          },
        })

        // Create new TrackArtist entries for target artist
        // Use per-item config if provided, otherwise preserve original isPrimary status
        const tracksToCreate = trackArtistsToTransfer
          .filter(ta => !existingTrackIds.has(ta.trackId))
          .map(ta => {
            // Check if there's a per-track configuration
            const isPrimary = trackConfigMap.has(ta.trackId) 
              ? trackConfigMap.get(ta.trackId)! 
              : ta.isPrimary // Preserve original if no config
            
            return {
              trackId: ta.trackId,
              artistId: targetArtistId,
              isPrimary,
            }
          })

        if (tracksToCreate.length > 0) {
          // Use createMany for batch insert (chunked for very large datasets)
          const chunkSize = 1000
          for (let i = 0; i < tracksToCreate.length; i += chunkSize) {
            const chunk = tracksToCreate.slice(i, i + chunkSize)
            await tx.trackArtist.createMany({
              data: chunk,
              skipDuplicates: true,
            })
          }
        }
      }

      // 3. Transfer any ReleaseArtist entries (where source is secondary)
      const releaseArtistsToTransfer = sourceArtist.releaseArtists || []
      if (releaseArtistsToTransfer.length > 0) {
        // Collect track IDs from releases where source is secondary
        releaseArtistsToTransfer.forEach(ra => {
          ra.release?.tracks?.forEach(track => {
            affectedTrackIds.add(track.id)
          })
        })

        const releaseIds = releaseArtistsToTransfer.map(ra => ra.releaseId)
        
        // Find existing ReleaseArtist entries for target artist
        const existingReleaseArtists = await tx.releaseArtist.findMany({
          where: {
            releaseId: { in: releaseIds },
            artistId: targetArtistId,
          },
        })
        const existingReleaseIds = new Set(existingReleaseArtists.map(era => era.releaseId))

        // Delete source ReleaseArtist entries (batch)
        await tx.releaseArtist.deleteMany({
          where: {
            releaseId: { in: releaseIds },
            artistId: sourceArtistId,
          },
        })

        // Create new ReleaseArtist entries for target artist
        // Use per-item config if provided, otherwise preserve original isPrimary status
        const releasesToCreate = releaseArtistsToTransfer
          .filter(ra => !existingReleaseIds.has(ra.releaseId))
          .map(ra => {
            // Check if there's a per-release configuration
            const isPrimary = releaseConfigMap.has(ra.releaseId)
              ? releaseConfigMap.get(ra.releaseId)!
              : ra.isPrimary // Preserve original if no config
            
            return {
              releaseId: ra.releaseId,
              artistId: targetArtistId,
              isPrimary,
            }
          })

        if (releasesToCreate.length > 0) {
          const chunkSize = 1000
          for (let i = 0; i < releasesToCreate.length; i += chunkSize) {
            const chunk = releasesToCreate.slice(i, i + chunkSize)
            await tx.releaseArtist.createMany({
              data: chunk,
              skipDuplicates: true,
            })
          }
        }
      }

      // 4. Add secondary artist to all affected tracks (songs)
      // IMPORTANT: Only add as secondary, never remove existing primary artists
      if (finalSecondaryArtistId && affectedTrackIds.size > 0) {
        const trackIdsArray = Array.from(affectedTrackIds)
        
        // Check which tracks already have this secondary artist
        const existingSecondaryTrackArtists = await tx.trackArtist.findMany({
          where: {
            trackId: { in: trackIdsArray },
            artistId: finalSecondaryArtistId,
          },
        })
        const existingSecondaryTrackIds = new Set(existingSecondaryTrackArtists.map(eta => eta.trackId))

        // Verify each track has at least one primary artist before adding secondary
        // This ensures we never leave a track without a primary artist
        const tracksWithPrimary = await tx.trackArtist.findMany({
          where: {
            trackId: { in: trackIdsArray },
            isPrimary: true,
          },
        })
        const tracksWithPrimarySet = new Set(tracksWithPrimary.map(ta => ta.trackId))

        // Create TrackArtist entries for secondary artist (only for tracks that don't already have it)
        // AND that have at least one primary artist
        const secondaryTracksToCreate = trackIdsArray
          .filter(trackId => {
            // Must not already have this secondary artist
            if (existingSecondaryTrackIds.has(trackId)) return false
            // Must have at least one primary artist
            if (!tracksWithPrimarySet.has(trackId)) {
              console.warn(`Track ${trackId} has no primary artist, skipping secondary artist addition`)
              return false
            }
            return true
          })
          .map(trackId => ({
            trackId,
            artistId: finalSecondaryArtistId,
            isPrimary: false, // Always secondary
          }))

        if (secondaryTracksToCreate.length > 0) {
          const chunkSize = 1000
          for (let i = 0; i < secondaryTracksToCreate.length; i += chunkSize) {
            const chunk = secondaryTracksToCreate.slice(i, i + chunkSize)
            await tx.trackArtist.createMany({
              data: chunk,
              skipDuplicates: true,
            })
          }
        }
      }

      // 5. Delete the source artist
      // Create audit log for artist merge
      await createAuditLog(tx, {
        userId: session.user.id,
        entityType: 'artist',
        entityId: sourceArtistId,
        action: 'delete',
        oldValue: JSON.stringify({
          name: sourceArtist.name,
          legalName: sourceArtist.legalName,
          releasesCount: releasesToTransfer.length,
          trackArtistsCount: trackArtistsToTransfer.length,
        }),
        newValue: `Merged into artist: ${targetArtist.name} (${targetArtistId})${finalSecondaryArtistId ? ` with secondary artist added to ${affectedTrackIds.size} tracks` : ''}`,
      })

      // Delete the source artist
      await tx.artist.delete({
        where: { id: sourceArtistId },
      })

      return {
        releasesTransferred: releasesToTransfer.length,
        trackArtistsTransferred: trackArtistsToTransfer.length,
        releaseArtistsTransferred: releaseArtistsToTransfer.length,
        tracksAffected: affectedTrackIds.size,
        secondaryArtistAdded: finalSecondaryArtistId ? affectedTrackIds.size : 0,
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${sourceArtist.name} into ${targetArtist.name}`,
      ...result,
    })
  } catch (error: any) {
    console.error('Merge artists error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to merge artists' },
      { status: 500 }
    )
  }
}

