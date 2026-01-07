/**
 * Database Cleanup Script
 * Deletes all data except admin user
 * 
 * Usage: npx tsx scripts/cleanup-database.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...')
  
  try {
    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
    })

    if (!adminUser) {
      console.error('❌ No admin user found! Aborting cleanup to prevent data loss.')
      process.exit(1)
    }

    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`)

    // Delete in order to respect foreign key constraints
    console.log('\n📦 Deleting data...')

    // 1. Delete all import sessions
    const importSessions = await prisma.importSession.deleteMany({})
    console.log(`   Deleted ${importSessions.count} import sessions`)

    // 2. Delete all audit logs
    const auditLogs = await prisma.auditLog.deleteMany({})
    console.log(`   Deleted ${auditLogs.count} audit logs`)

    // 3. Delete all comments
    const comments = await prisma.comment.deleteMany({})
    console.log(`   Deleted ${comments.count} comments`)

    // 4. Delete all platform decisions
    const platformDecisions = await prisma.platformDecision.deleteMany({})
    console.log(`   Deleted ${platformDecisions.count} platform decisions`)

    // 5. Delete all platform requests
    const platformRequests = await prisma.platformRequest.deleteMany({})
    console.log(`   Deleted ${platformRequests.count} platform requests`)

    // 6. Delete all platform channels
    const platformChannels = await prisma.platformChannel.deleteMany({})
    console.log(`   Deleted ${platformChannels.count} platform channels`)

    // 7. Delete all import attachments
    const importAttachments = await prisma.importAttachment.deleteMany({})
    console.log(`   Deleted ${importAttachments.count} import attachments`)

    // 8. Delete all track artists
    const trackArtists = await prisma.trackArtist.deleteMany({})
    console.log(`   Deleted ${trackArtists.count} track artists`)

    // 9. Delete all release artists
    const releaseArtists = await prisma.releaseArtist.deleteMany({})
    console.log(`   Deleted ${releaseArtists.count} release artists`)

    // 10. Delete all tracks
    const tracks = await prisma.track.deleteMany({})
    console.log(`   Deleted ${tracks.count} tracks`)

    // 11. Delete all releases
    const releases = await prisma.release.deleteMany({})
    console.log(`   Deleted ${releases.count} releases`)

    // 12. Delete all artists (delete all, admin user's artist will be recreated if needed)
    const artists = await prisma.artist.deleteMany({})
    console.log(`   Deleted ${artists.count} artists`)

    // 13. Delete all employees (and their associated users except admin)
    const employees = await prisma.employee.findMany({
      where: {
        userId: {
          not: adminUser.id,
        },
      },
    })
    
    for (const employee of employees) {
      // Delete employee (this will cascade delete the user)
      await prisma.employee.delete({
        where: { id: employee.id },
      })
    }
    console.log(`   Deleted ${employees.length} employees`)

    // 14. Delete all users except admin
    const users = await prisma.user.deleteMany({
      where: {
        id: {
          not: adminUser.id,
        },
      },
    })
    console.log(`   Deleted ${users.count} users`)

    // 15. Delete all saved views
    const savedViews = await prisma.savedView.deleteMany({})
    console.log(`   Deleted ${savedViews.count} saved views`)

    // 16. Delete all field permissions (optional - you might want to keep these)
    // Uncomment if you want to delete field permissions too
    // const fieldPermissions = await prisma.fieldPermission.deleteMany({})
    // console.log(`   Deleted ${fieldPermissions.count} field permissions`)

    // 17. Keep departments, form fields, and other system data

    console.log('\n✅ Database cleanup completed!')
    console.log(`   Admin user preserved: ${adminUser.email}`)
    
    // Verify cleanup
    const remainingReleases = await prisma.release.count()
    const remainingArtists = await prisma.artist.count()
    const remainingUsers = await prisma.user.count()
    const remainingTracks = await prisma.track.count()

    console.log('\n📊 Remaining data:')
    console.log(`   Releases: ${remainingReleases}`)
    console.log(`   Artists: ${remainingArtists}`)
    console.log(`   Users: ${remainingUsers}`)
    console.log(`   Tracks: ${remainingTracks}`)

    if (remainingReleases > 0 || remainingArtists > 0 || remainingUsers > 1 || remainingTracks > 0) {
      console.log('\n⚠️  Warning: Some data still remains. Check foreign key constraints.')
    } else {
      console.log('\n✨ Database is clean!')
    }

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run cleanup
cleanupDatabase()
  .then(() => {
    console.log('\n🎉 Cleanup script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Cleanup script failed:', error)
    process.exit(1)
  })

