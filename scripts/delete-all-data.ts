/**
 * Comprehensive script to delete ALL data from the database
 * 
 * This script will delete in the correct order to respect foreign key constraints:
 * 1. All releases (cascade deletes tracks, platform requests, etc.)
 * 2. All artists
 * 3. All employees (cascade deletes users)
 * 4. All remaining users
 * 5. All import sessions
 * 6. All platform channels (if unused)
 * 
 * WARNING: This is a DESTRUCTIVE operation that will delete ALL data.
 * 
 * Usage: npx tsx scripts/delete-all-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllData() {
  console.log('🗑️  Starting deletion of ALL data...\n')

  try {
    // Get counts before deletion
    const releaseCount = await prisma.release.count()
    const artistCount = await prisma.artist.count()
    const employeeCount = await prisma.employee.count()
    const userCount = await prisma.user.count()
    const trackCount = await prisma.track.count()
    const platformRequestCount = await prisma.platformRequest.count()
    const importSessionCount = await prisma.importSession.count()
    
    console.log('📊 Current database state:')
    console.log(`   - Releases: ${releaseCount}`)
    console.log(`   - Tracks: ${trackCount}`)
    console.log(`   - Platform Requests: ${platformRequestCount}`)
    console.log(`   - Artists: ${artistCount}`)
    console.log(`   - Employees: ${employeeCount}`)
    console.log(`   - Users: ${userCount}`)
    console.log(`   - Import Sessions: ${importSessionCount}\n`)

    if (releaseCount === 0 && artistCount === 0 && employeeCount === 0 && userCount === 0) {
      console.log('✅ Database is already empty. Nothing to delete.')
      return
    }

    // Step 1: Delete all releases (this will cascade delete tracks, platform requests, etc.)
    console.log('🗑️  Step 1: Deleting all releases...')
    const deletedReleases = await prisma.release.deleteMany({})
    console.log(`   ✅ Deleted ${deletedReleases.count} releases`)
    console.log(`   ✅ Associated tracks, platform requests, and related data were also deleted (cascade)\n`)

    // Step 2: Delete all artists
    console.log('🗑️  Step 2: Deleting all artists...')
    const deletedArtists = await prisma.artist.deleteMany({})
    console.log(`   ✅ Deleted ${deletedArtists.count} artists\n`)

    // Step 3: Delete all employees (this will cascade delete users due to onDelete: Cascade)
    console.log('🗑️  Step 3: Deleting all employees...')
    const deletedEmployees = await prisma.employee.deleteMany({})
    console.log(`   ✅ Deleted ${deletedEmployees.count} employees`)
    console.log(`   ✅ Associated users were also deleted (cascade)\n`)

    // Step 4: Delete any remaining users (in case some don't have employees)
    console.log('🗑️  Step 4: Deleting any remaining users...')
    const deletedUsers = await prisma.user.deleteMany({})
    console.log(`   ✅ Deleted ${deletedUsers.count} remaining users\n`)

    // Step 5: Delete all import sessions
    console.log('🗑️  Step 5: Deleting all import sessions...')
    const deletedSessions = await prisma.importSession.deleteMany({})
    console.log(`   ✅ Deleted ${deletedSessions.count} import sessions\n`)

    // Step 6: Delete unused platform channels
    console.log('🗑️  Step 6: Checking for unused platform channels...')
    const allChannels = await prisma.platformChannel.findMany({
      include: {
        _count: {
          select: {
            platformRequests: true,
          },
        },
      },
    })

    let deletedChannels = 0
    for (const channel of allChannels) {
      if (channel._count.platformRequests === 0) {
        await prisma.platformChannel.delete({
          where: { id: channel.id },
        })
        deletedChannels++
      }
    }
    console.log(`   ✅ Deleted ${deletedChannels} unused platform channels\n`)

    // Step 7: Delete any remaining related data
    console.log('🗑️  Step 7: Cleaning up remaining related data...')
    
    // Delete release artists (should be empty, but just in case)
    const deletedReleaseArtists = await prisma.releaseArtist.deleteMany({})
    console.log(`   ✅ Deleted ${deletedReleaseArtists.count} release artist associations`)
    
    // Delete track artists (should be empty, but just in case)
    const deletedTrackArtists = await prisma.trackArtist.deleteMany({})
    console.log(`   ✅ Deleted ${deletedTrackArtists.count} track artist associations`)
    
    // Delete audit logs
    const deletedAuditLogs = await prisma.auditLog.deleteMany({})
    console.log(`   ✅ Deleted ${deletedAuditLogs.count} audit logs`)
    
    // Delete comments
    const deletedComments = await prisma.comment.deleteMany({})
    console.log(`   ✅ Deleted ${deletedComments.count} comments`)
    
    // Delete import attachments
    const deletedAttachments = await prisma.importAttachment.deleteMany({})
    console.log(`   ✅ Deleted ${deletedAttachments.count} import attachments`)
    
    // Delete platform decisions
    const deletedDecisions = await prisma.platformDecision.deleteMany({})
    console.log(`   ✅ Deleted ${deletedDecisions.count} platform decisions\n`)

    // Verify deletion
    const remainingReleases = await prisma.release.count()
    const remainingArtists = await prisma.artist.count()
    const remainingEmployees = await prisma.employee.count()
    const remainingUsers = await prisma.user.count()
    const remainingTracks = await prisma.track.count()
    const remainingPlatformRequests = await prisma.platformRequest.count()

    console.log('📊 Final database state:')
    console.log(`   - Releases: ${remainingReleases}`)
    console.log(`   - Tracks: ${remainingTracks}`)
    console.log(`   - Platform Requests: ${remainingPlatformRequests}`)
    console.log(`   - Artists: ${remainingArtists}`)
    console.log(`   - Employees: ${remainingEmployees}`)
    console.log(`   - Users: ${remainingUsers}\n`)

    if (remainingReleases === 0 && remainingArtists === 0 && remainingEmployees === 0 && remainingUsers === 0) {
      console.log('✨ All data successfully deleted!')
    } else {
      console.warn('⚠️  Warning: Some data still remains:')
      if (remainingReleases > 0) console.warn(`   - ${remainingReleases} releases`)
      if (remainingArtists > 0) console.warn(`   - ${remainingArtists} artists`)
      if (remainingEmployees > 0) console.warn(`   - ${remainingEmployees} employees`)
      if (remainingUsers > 0) console.warn(`   - ${remainingUsers} users`)
    }
  } catch (error) {
    console.error('❌ Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deletion
deleteAllData()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })



