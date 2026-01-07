// Script to delete all releases, artists, and employees
// Run with: npx tsx scripts/delete-all-releases-artists-employees.ts

import { prisma } from '../lib/db'

async function deleteAllReleasesArtistsAndEmployees() {
  console.log('Starting deletion of all releases, artists, and employees...')

  try {
    // Step 1: Delete all related data first (to handle foreign key constraints)
    console.log('Deleting related data...')
    
    // Delete TrackArtists
    const trackArtistsDeleted = await prisma.trackArtist.deleteMany({})
    console.log(`Deleted ${trackArtistsDeleted.count} TrackArtists`)
    
    // Delete ReleaseArtists
    const releaseArtistsDeleted = await prisma.releaseArtist.deleteMany({})
    console.log(`Deleted ${releaseArtistsDeleted.count} ReleaseArtists`)
    
    // Delete PlatformRequests
    const platformRequestsDeleted = await prisma.platformRequest.deleteMany({})
    console.log(`Deleted ${platformRequestsDeleted.count} PlatformRequests`)
    
    // Delete Comments
    const commentsDeleted = await prisma.comment.deleteMany({})
    console.log(`Deleted ${commentsDeleted.count} Comments`)
    
    // Delete AuditLogs related to releases
    const auditLogsDeleted = await prisma.auditLog.deleteMany({
      where: {
        releaseId: { not: null },
      },
    })
    console.log(`Deleted ${auditLogsDeleted.count} AuditLogs`)
    
    // Delete ImportAttachments
    const importAttachmentsDeleted = await prisma.importAttachment.deleteMany({})
    console.log(`Deleted ${importAttachmentsDeleted.count} ImportAttachments`)
    
    // Delete Tracks
    const tracksDeleted = await prisma.track.deleteMany({})
    console.log(`Deleted ${tracksDeleted.count} Tracks`)
    
    // Step 2: Delete Releases
    console.log('Deleting Releases...')
    const releasesDeleted = await prisma.release.deleteMany({})
    console.log(`Deleted ${releasesDeleted.count} Releases`)
    
    // Step 3: Unassign employees from releases (set assignedA_RId to null)
    console.log('Unassigning employees from releases...')
    await prisma.release.updateMany({
      data: { assignedA_RId: null },
    })
    
    // Step 4: Break employee hierarchy
    console.log('Breaking employee hierarchy...')
    await prisma.employee.updateMany({
      data: { reportingToId: null },
    })
    
    // Step 5: Delete Employees (this will cascade delete related User if employee.user relation is set to Cascade)
    console.log('Deleting Employees...')
    const employeesDeleted = await prisma.employee.deleteMany({})
    console.log(`Deleted ${employeesDeleted.count} Employees`)
    
    // Step 6: Delete Artists
    console.log('Deleting Artists...')
    const artistsDeleted = await prisma.artist.deleteMany({})
    console.log(`Deleted ${artistsDeleted.count} Artists`)
    
    console.log('✅ Successfully deleted all releases, artists, and employees!')
    console.log('\nSummary:')
    console.log(`- Releases: ${releasesDeleted.count}`)
    console.log(`- Artists: ${artistsDeleted.count}`)
    console.log(`- Employees: ${employeesDeleted.count}`)
    console.log(`- Tracks: ${tracksDeleted.count}`)
    console.log(`- Platform Requests: ${platformRequestsDeleted.count}`)
    console.log(`- Release Artists: ${releaseArtistsDeleted.count}`)
    console.log(`- Track Artists: ${trackArtistsDeleted.count}`)
  } catch (error) {
    console.error('❌ Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllReleasesArtistsAndEmployees()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })



