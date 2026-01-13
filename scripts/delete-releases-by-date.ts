import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Delete releases created within a specific date range
 * Usage: npx tsx scripts/delete-releases-by-date.ts "2026-01-09" "2026-01-12"
 */
async function deleteReleasesByDate(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999) // End of day

  console.log(`\n⚠️  WARNING: This will permanently delete all releases created between ${start.toISOString()} and ${end.toISOString()}`)
  console.log(`   This includes all related data (tracks, platform requests, comments, etc.)`)
  console.log(`   This action cannot be undone!\n`)

  // Find all releases in the date range
  const releases = await prisma.release.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
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
    console.log(`\n⚠️  No releases found in the specified date range.`)
    return
  }

  // Show first 10 releases as preview
  console.log(`\n📋 Preview of releases to delete (first 10):`)
  releases.slice(0, 10).forEach((r, i) => {
    console.log(`   ${i + 1}. "${r.title}" by ${r.artist.name} - Created: ${r.createdAt.toISOString()}`)
  })
  if (releases.length > 10) {
    console.log(`   ... and ${releases.length - 10} more`)
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

  // Delete in correct order
  console.log(`\n🗑️  Starting deletion...`)

  // 1. Delete platform decisions
  const platformDecisionCount = await prisma.platformDecision.deleteMany({
    where: {
      platformRequestId: {
        in: platformRequestIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${platformDecisionCount.count} platform decision(s)`)

  // 2. Delete track artists
  const trackArtistCount = await prisma.trackArtist.deleteMany({
    where: {
      trackId: {
        in: trackIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${trackArtistCount.count} track artist(s)`)

  // 3. Delete platform requests
  const platformRequestCount = await prisma.platformRequest.deleteMany({
    where: {
      id: {
        in: platformRequestIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${platformRequestCount.count} platform request(s)`)

  // 4. Delete tracks
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

  // 10. Delete releases
  const releaseCount = await prisma.release.deleteMany({
    where: {
      id: {
        in: releaseIds,
      },
    },
  })
  console.log(`   ✅ Deleted ${releaseCount.count} release(s)`)

  // 11. Check and delete orphaned artists
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
      if (artist.releases.length === 0 && artist.releaseArtists.length === 0 && artist.trackArtists.length === 0) {
        await prisma.artist.delete({
          where: { id: artistId },
        })
        orphanedArtists++
      }
    }
  }
  console.log(`   ✅ Deleted ${orphanedArtists} orphaned artist(s)`)

  console.log(`\n✅ Deletion complete!`)
  console.log(`\n📊 Final summary:`)
  console.log(`   - Releases deleted: ${releaseCount.count}`)
  console.log(`   - Tracks deleted: ${trackCount.count}`)
  console.log(`   - Platform requests deleted: ${platformRequestCount.count}`)
  console.log(`   - Artists cleaned up: ${orphanedArtists}`)
}

async function main() {
  const startDate = process.argv[2]
  const endDate = process.argv[3]

  if (!startDate || !endDate) {
    console.error('Usage: npx tsx scripts/delete-releases-by-date.ts "YYYY-MM-DD" "YYYY-MM-DD"')
    console.error('Example: npx tsx scripts/delete-releases-by-date.ts "2026-01-09" "2026-01-12"')
    process.exit(1)
  }

  try {
    await deleteReleasesByDate(startDate, endDate)
  } catch (error) {
    console.error('\n❌ Error during deletion:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
