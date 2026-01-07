import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteLatestImport() {
  try {
    console.log('Finding latest import session from today...')
    
    // Get today's date range (start of today to now)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    console.log(`Looking for imports between ${startOfToday.toISOString()} and ${now.toISOString()}`)
    
    // Find the latest import session from TODAY only (not yesterday)
    const latestSession = await prisma.importSession.findFirst({
      where: {
        startedAt: {
          gte: startOfToday,
          lte: now,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    if (!latestSession) {
      console.log('No import session found from today.')
      console.log('If you want to delete an import from a different day, please modify the script.')
      return
    }

    console.log(`Found latest import session from today: ${latestSession.id}`)
    console.log(`Started at: ${latestSession.startedAt}`)
    console.log(`Status: ${latestSession.status}`)
    console.log(`File: ${latestSession.fileName}`)

    // Get the timestamp when this import started
    const importStartTime = latestSession.startedAt
    
    // Also get the end time (when it completed, or now if still in progress)
    const importEndTime = latestSession.completedAt || now
    
    console.log(`Import time range: ${importStartTime.toISOString()} to ${importEndTime.toISOString()}`)

    // Find all releases created during this import session
    // Use a time window from import start to end (or now if still in progress)
    // Add a small buffer to catch any releases created slightly after completion
    const bufferTime = new Date(importEndTime.getTime() + 60000) // 1 minute buffer
    
    const releasesToDelete = await prisma.release.findMany({
      where: {
        createdAt: {
          gte: importStartTime,
          lte: bufferTime,
        },
      },
      include: {
        tracks: true,
        platformRequests: true,
        releaseArtists: true,
        importAttachments: true,
      },
    })

    console.log(`Found ${releasesToDelete.length} releases to delete`)

    // Get all track IDs from these releases
    const trackIds = releasesToDelete.flatMap(r => r.tracks.map(t => t.id))

    // Get all artist IDs that are ONLY used by these releases (to avoid deleting artists from yesterday's import)
    const artistIdsFromReleases = new Set([
      ...releasesToDelete.map(r => r.artistId),
      ...releasesToDelete.flatMap(r => r.releaseArtists.map(ra => ra.artistId)),
    ])

    // Also get artists from tracks
    const tracksWithArtists = await prisma.track.findMany({
      where: {
        id: { in: trackIds },
      },
      include: {
        trackArtists: true,
      },
    })

    const artistIdsFromTracks = new Set(
      tracksWithArtists.flatMap(t => t.trackArtists.map(ta => ta.artistId))
    )

    const allArtistIds = new Set([...artistIdsFromReleases, ...artistIdsFromTracks])

    // Check which artists have other releases (from before this import)
    const artistsWithOtherReleases = await prisma.artist.findMany({
      where: {
        id: { in: Array.from(allArtistIds) },
        releases: {
          some: {
            createdAt: {
              lt: importStartTime,
            },
          },
        },
      },
      select: {
        id: true,
      },
    })

    const artistsWithOtherReleasesIds = new Set(artistsWithOtherReleases.map(a => a.id))

    // Only delete artists that don't have releases from before this import
    const artistsToDelete = Array.from(allArtistIds).filter(
      id => !artistsWithOtherReleasesIds.has(id)
    )

    console.log(`Found ${artistsToDelete.length} artists to delete (excluding ${artistsWithOtherReleasesIds.size} with other releases)`)

    // Find employees created during this import (within the time window)
    const employeesToDelete = await prisma.employee.findMany({
      where: {
        createdAt: {
          gte: importStartTime,
          lte: bufferTime,
        },
      },
      include: {
        user: true,
      },
    })

    console.log(`Found ${employeesToDelete.length} employees to delete`)

    // Get user IDs from artists we're deleting
    const artistsWithUsers = await prisma.artist.findMany({
      where: {
        id: { in: artistsToDelete },
      },
      select: {
        userId: true,
      },
    })

    const artistUserIds = artistsWithUsers
      .map(a => a.userId)
      .filter((id): id is string => id !== null)

    // Find users created during this import (that are linked to employees or artists we're deleting)
    const usersToDelete = await prisma.user.findMany({
      where: {
        OR: [
          { id: { in: employeesToDelete.map(e => e.userId) } },
          { id: { in: artistUserIds } },
          {
            createdAt: {
              gte: importStartTime,
              lte: bufferTime,
            },
            OR: [
              { employee: { createdAt: { gte: importStartTime, lte: bufferTime } } },
              { artist: { id: { in: artistsToDelete } } },
            ],
          },
        ],
      },
    })

    const allUserIdsToDelete = new Set(usersToDelete.map(u => u.id))

    console.log(`Found ${allUserIdsToDelete.size} users to delete`)

    // Delete in correct order to respect foreign key constraints
    console.log('\nStarting deletion...')

    // 1. Delete TrackArtists relationships
    console.log('Deleting TrackArtist relationships...')
    await prisma.trackArtist.deleteMany({
      where: {
        trackId: { in: trackIds },
      },
    })

    // 2. Delete PlatformRequests
    console.log('Deleting PlatformRequests...')
    await prisma.platformRequest.deleteMany({
      where: {
        OR: [
          { releaseId: { in: releasesToDelete.map(r => r.id) } },
          { trackId: { in: trackIds } },
        ],
      },
    })

    // 3. Delete ReleaseA_R relationships
    console.log('Deleting ReleaseA_R relationships...')
    await prisma.releaseA_R.deleteMany({
      where: {
        releaseId: { in: releasesToDelete.map(r => r.id) },
      },
    })

    // 4. Delete ReleaseArtists relationships
    console.log('Deleting ReleaseArtist relationships...')
    await prisma.releaseArtist.deleteMany({
      where: {
        releaseId: { in: releasesToDelete.map(r => r.id) },
      },
    })

    // 5. Delete ImportAttachments
    console.log('Deleting ImportAttachments...')
    await prisma.importAttachment.deleteMany({
      where: {
        releaseId: { in: releasesToDelete.map(r => r.id) },
      },
    })

    // 6. Delete Tracks (cascade will handle TrackArtists, but we already deleted them)
    console.log('Deleting Tracks...')
    await prisma.track.deleteMany({
      where: {
        id: { in: trackIds },
      },
    })

    // 7. Delete Releases
    console.log('Deleting Releases...')
    await prisma.release.deleteMany({
      where: {
        id: { in: releasesToDelete.map(r => r.id) },
      },
    })

    // 8. Delete Artists (only those without other releases)
    console.log('Deleting Artists...')
    await prisma.artist.deleteMany({
      where: {
        id: { in: artistsToDelete },
      },
    })

    // 9. Delete Employees
    console.log('Deleting Employees...')
    await prisma.employee.deleteMany({
      where: {
        id: { in: employeesToDelete.map(e => e.id) },
      },
    })

    // 10. Delete Users (only those linked to deleted employees/artists)
    console.log('Deleting Users...')
    await prisma.user.deleteMany({
      where: {
        id: { in: Array.from(allUserIdsToDelete) },
      },
    })

    // 11. Cancel/Delete the import session
    console.log('Cancelling import session...')
    await prisma.importSession.update({
      where: { id: latestSession.id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        error: 'Import cancelled by user',
      },
    })

    console.log('\n✅ Successfully deleted all data from the latest import!')
    console.log(`\nSummary:`)
    console.log(`- Releases deleted: ${releasesToDelete.length}`)
    console.log(`- Tracks deleted: ${trackIds.length}`)
    console.log(`- Artists deleted: ${artistsToDelete.length}`)
    console.log(`- Employees deleted: ${employeesToDelete.length}`)
    console.log(`- Users deleted: ${allUserIdsToDelete.size}`)
    console.log(`- Import session cancelled: ${latestSession.id}`)

  } catch (error) {
    console.error('Error deleting import data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteLatestImport()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
