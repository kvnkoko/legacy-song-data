import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Delete all data imported from a specific CSV file
 * This includes:
 * - Releases and all related data (tracks, platform requests, comments, audit logs, etc.)
 * - Artists that were only created for these releases (if they have no other releases)
 * - The import session itself
 */
async function deleteImportData(fileName: string) {
  console.log(`\n🔍 Searching for import session: ${fileName}`)
  
  // Find the import session(s) for this file
  const importSessions = await prisma.importSession.findMany({
    where: {
      fileName: {
        contains: fileName,
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
  })

  if (importSessions.length === 0) {
    console.log(`❌ No import sessions found for file: ${fileName}`)
    return
  }

  console.log(`✅ Found ${importSessions.length} import session(s)`)

  // Get the time range for releases created during these imports
  const earliestStart = importSessions[0].startedAt
  const latestStart = importSessions[importSessions.length - 1].startedAt
  
  // Add a buffer of 1 hour before and after to catch all related releases
  const startTime = new Date(earliestStart.getTime() - 60 * 60 * 1000) // 1 hour before
  const endTime = new Date(latestStart.getTime() + 24 * 60 * 60 * 1000) // 24 hours after (to catch slow imports)

  console.log(`\n📅 Searching for releases created between ${startTime.toISOString()} and ${endTime.toISOString()}`)

  // Find all releases created during this time window
  const releases = await prisma.release.findMany({
    where: {
      createdAt: {
        gte: startTime,
        lte: endTime,
      },
    },
    include: {
      tracks: true,
      platformRequests: true,
      comments: true,
      auditLogs: true,
      importAttachments: true,
      releaseArtists: true,
      assignedA_Rs: true,
      artist: true,
    },
  })

  console.log(`✅ Found ${releases.length} release(s) to delete`)

  if (releases.length === 0) {
    console.log(`\n⚠️  No releases found in the time window. The import may have failed or no data was created.`)
    // Still delete the import sessions
    await prisma.importSession.deleteMany({
      where: {
        fileName: {
          contains: fileName,
        },
      },
    })
    console.log(`✅ Deleted ${importSessions.length} import session(s)`)
    return
  }

  // Collect all related data IDs
  const releaseIds = releases.map(r => r.id)
  const trackIds = releases.flatMap(r => r.tracks.map(t => t.id))
  const platformRequestIds = releases.flatMap(r => r.platformRequests.map(pr => pr.id))
  const commentIds = releases.flatMap(r => r.comments.map(c => c.id))
  const auditLogIds = releases.flatMap(r => r.auditLogs.map(a => a.id))
  const importAttachmentIds = releases.flatMap(r => r.importAttachments.map(ia => ia.id))
  const releaseArtistIds = releases.flatMap(r => r.releaseArtists.map(ra => ra.id))
  const releaseARIds = releases.flatMap(r => r.assignedA_Rs.map(ar => ar.id))
  
  // Get artist IDs that might need cleanup
  const artistIds = new Set<string>()
  releases.forEach(r => {
    artistIds.add(r.artistId)
    r.releaseArtists.forEach(ra => artistIds.add(ra.artistId))
  })

  console.log(`\n📊 Summary of data to delete:`)
  console.log(`   - Releases: ${releaseIds.length}`)
  console.log(`   - Tracks: ${trackIds.length}`)
  console.log(`   - Platform Requests: ${platformRequestIds.length}`)
  console.log(`   - Comments: ${commentIds.length}`)
  console.log(`   - Audit Logs: ${auditLogIds.length}`)
  console.log(`   - Import Attachments: ${importAttachmentIds.length}`)
  console.log(`   - Release Artists: ${releaseArtistIds.length}`)
  console.log(`   - Release A&R Assignments: ${releaseARIds.length}`)
  console.log(`   - Artists to check: ${artistIds.size}`)
  console.log(`   - Import Sessions: ${importSessions.length}`)

  // Delete in correct order (respecting foreign key constraints)
  console.log(`\n🗑️  Starting deletion...`)

  // 1. Delete platform decisions (referenced by platform requests)
  const platformDecisionCount = await prisma.platformDecision.deleteMany({
    where: {
      platformRequestId: {
        in: platformRequestIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${platformDecisionCount.count} platform decision(s)`)

  // 2. Delete track artists (referenced by tracks)
  const trackArtistCount = await prisma.trackArtist.deleteMany({
    where: {
      trackId: {
        in: trackIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${trackArtistCount.count} track artist(s)`)

  // 3. Delete platform requests (cascade will handle some, but we'll delete explicitly)
  const platformRequestCount = await prisma.platformRequest.deleteMany({
    where: {
      id: {
        in: platformRequestIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${platformRequestCount.count} platform request(s)`)

  // 4. Delete tracks (cascade will handle platform requests, but we already deleted them)
  const trackCount = await prisma.track.deleteMany({
    where: {
      id: {
        in: trackIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${trackCount.count} track(s)`)

  // 5. Delete comments
  const commentCount = await prisma.comment.deleteMany({
    where: {
      id: {
        in: commentIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${commentCount.count} comment(s)`)

  // 6. Delete audit logs
  const auditLogCount = await prisma.auditLog.deleteMany({
    where: {
      id: {
        in: auditLogIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${auditLogCount.count} audit log(s)`)

  // 7. Delete import attachments
  const importAttachmentCount = await prisma.importAttachment.deleteMany({
    where: {
      id: {
        in: importAttachmentIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${importAttachmentCount.count} import attachment(s)`)

  // 8. Delete release artists
  const releaseArtistCount = await prisma.releaseArtist.deleteMany({
    where: {
      id: {
        in: releaseArtistIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${releaseArtistCount.count} release artist(s)`)

  // 9. Delete release A&R assignments
  const releaseARCount = await prisma.releaseA_R.deleteMany({
    where: {
      id: {
        in: releaseARIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${releaseARCount.count} release A&R assignment(s)`)

  // 10. Delete releases (this will cascade delete remaining related data)
  const releaseCount = await prisma.release.deleteMany({
    where: {
      id: {
        in: releaseIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${releaseCount.count} release(s)`)

  // 11. Check and delete artists that were only created for these releases
  let orphanedArtists = 0
  for (const artistId of artistIds) {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        releases: true,
        releaseArtists: true,
        trackArtists: true,
      },
    })

    if (artist) {
      // Delete artist if it has no remaining releases, release artists, or track artists
      if (artist.releases.length === 0 && artist.releaseArtists.length === 0 && artist.trackArtists.length === 0) {
        await prisma.artist.delete({
          where: { id: artistId },
        })
        orphanedArtists++
      }
    }
  }
  console.log(`   ✅ Deleted ${orphanedArtists} orphaned artist(s)`)

  // 12. Delete import sessions
  const importSessionCount = await prisma.importSession.deleteMany({
    where: {
      fileName: {
        contains: fileName,
      },
    },
  })
  console.log(`   ✅ Deleted ${importSessionCount.count} import session(s)`)

  console.log(`\n✅ Deletion complete!`)
  console.log(`\n📊 Final summary:`)
  console.log(`   - Releases deleted: ${releaseCount.count}`)
  console.log(`   - Tracks deleted: ${trackCount.count}`)
  console.log(`   - Platform requests deleted: ${platformRequestCount.count}`)
  console.log(`   - Artists cleaned up: ${orphanedArtists}`)
  console.log(`   - Import sessions deleted: ${importSessionCount.count}`)
}

// Main execution
async function main() {
  const fileName = process.argv[2] || 'List3(2000).csv'
  
  console.log(`\n⚠️  WARNING: This will permanently delete all data imported from "${fileName}"`)
  console.log(`   This includes releases, tracks, platform requests, comments, and related data.`)
  console.log(`   This action cannot be undone!\n`)

  try {
    await deleteImportData(fileName)
  } catch (error) {
    console.error('\n❌ Error during deletion:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
