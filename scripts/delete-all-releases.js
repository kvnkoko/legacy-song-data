const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteAllReleases() {
  try {
    console.log('Starting to delete all releases...')
    
    // Delete in order to respect foreign key constraints
    // First delete related data
    console.log('Deleting TrackArtists...')
    const trackArtistsDeleted = await prisma.trackArtist.deleteMany({})
    console.log(`Deleted ${trackArtistsDeleted.count} track artists`)
    
    console.log('Deleting ReleaseArtists...')
    const releaseArtistsDeleted = await prisma.releaseArtist.deleteMany({})
    console.log(`Deleted ${releaseArtistsDeleted.count} release artists`)
    
    console.log('Deleting PlatformRequests...')
    const platformRequestsDeleted = await prisma.platformRequest.deleteMany({})
    console.log(`Deleted ${platformRequestsDeleted.count} platform requests`)
    
    console.log('Deleting Comments...')
    const commentsDeleted = await prisma.comment.deleteMany({})
    console.log(`Deleted ${commentsDeleted.count} comments`)
    
    console.log('Deleting AuditLogs...')
    const auditLogsDeleted = await prisma.auditLog.deleteMany({})
    console.log(`Deleted ${auditLogsDeleted.count} audit logs`)
    
    console.log('Deleting ImportAttachments...')
    const importAttachmentsDeleted = await prisma.importAttachment.deleteMany({})
    console.log(`Deleted ${importAttachmentsDeleted.count} import attachments`)
    
    console.log('Deleting Tracks...')
    const tracksDeleted = await prisma.track.deleteMany({})
    console.log(`Deleted ${tracksDeleted.count} tracks`)
    
    console.log('Deleting Releases...')
    const releasesDeleted = await prisma.release.deleteMany({})
    console.log(`Deleted ${releasesDeleted.count} releases`)
    
    console.log('\n✅ Successfully deleted all releases and related data!')
    console.log('\nSummary:')
    console.log(`- Releases: ${releasesDeleted.count}`)
    console.log(`- Tracks: ${tracksDeleted.count}`)
    console.log(`- Track Artists: ${trackArtistsDeleted.count}`)
    console.log(`- Release Artists: ${releaseArtistsDeleted.count}`)
    console.log(`- Platform Requests: ${platformRequestsDeleted.count}`)
    console.log(`- Comments: ${commentsDeleted.count}`)
    console.log(`- Audit Logs: ${auditLogsDeleted.count}`)
    console.log(`- Import Attachments: ${importAttachmentsDeleted.count}`)
  } catch (error) {
    console.error('❌ Error deleting releases:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllReleases()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to delete releases:', error)
    process.exit(1)
  })

