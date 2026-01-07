/**
 * Comprehensive cleanup script to remove all imported data
 * 
 * This script will:
 * 1. Delete all releases with rawRow data (CSV imports)
 * 2. Delete associated tracks, platform requests, release artists, track artists
 * 3. Delete artists that were only created for imports (no other releases)
 * 4. Delete employees/users created for imports (@imported.local emails)
 * 5. Delete import sessions
 * 
 * WARNING: This is a destructive operation. Use with caution.
 * 
 * Usage: npx tsx scripts/cleanup-imported-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupImportedData() {
  console.log('🧹 Starting cleanup of imported data...\n')

  try {
    // Step 1: Find all releases with rawRow data (CSV imports)
    console.log('📊 Step 1: Finding imported releases...')
    const importedReleases = await prisma.release.findMany({
      where: {
        rawRow: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        artistId: true,
        submissionId: true,
      },
    })

    console.log(`   Found ${importedReleases.length} imported releases\n`)

    if (importedReleases.length === 0) {
      console.log('✅ No imported releases found. Nothing to clean up.')
      return
    }

    // Step 2: Delete associated data (tracks, platform requests, etc.)
    // These will cascade delete, but let's be explicit
    console.log('🗑️  Step 2: Deleting associated data...')
    
    const releaseIds = importedReleases.map(r => r.id)
    const artistIds = new Set(importedReleases.map(r => r.artistId))

    // Delete platform requests (cascade should handle, but explicit for clarity)
    const deletedPlatformRequests = await prisma.platformRequest.deleteMany({
      where: {
        releaseId: {
          in: releaseIds,
        },
      },
    })
    console.log(`   Deleted ${deletedPlatformRequests.count} platform requests`)

    // Delete tracks (cascade should handle, but explicit for clarity)
    const deletedTracks = await prisma.track.deleteMany({
      where: {
        releaseId: {
          in: releaseIds,
        },
      },
    })
    console.log(`   Deleted ${deletedTracks.count} tracks`)

    // Delete release artists
    const deletedReleaseArtists = await prisma.releaseArtist.deleteMany({
      where: {
        releaseId: {
          in: releaseIds,
        },
      },
    })
    console.log(`   Deleted ${deletedReleaseArtists.count} release artist associations`)

    // Step 3: Delete the releases
    console.log('\n🗑️  Step 3: Deleting imported releases...')
    const deletedReleases = await prisma.release.deleteMany({
      where: {
        id: {
          in: releaseIds,
        },
      },
    })
    console.log(`   Deleted ${deletedReleases.count} releases`)

    // Step 4: Delete artists that were only created for imports
    console.log('\n🗑️  Step 4: Checking for orphaned artists...')
    let deletedArtists = 0
    for (const artistId of artistIds) {
      const artistReleases = await prisma.release.count({
        where: {
          artistId,
        },
      })
      
      if (artistReleases === 0) {
        // Check if artist has any other associations
        const hasTracks = await prisma.trackArtist.count({
          where: {
            artistId,
          },
        })
        
        if (hasTracks === 0) {
          await prisma.artist.delete({
            where: { id: artistId },
          })
          deletedArtists++
        }
      }
    }
    console.log(`   Deleted ${deletedArtists} orphaned artists`)

    // Step 5: Delete employees/users created for imports
    console.log('\n🗑️  Step 5: Deleting imported employees and users...')
    
    // Find all users with @imported.local emails
    const importedUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@imported.local',
        },
      },
      select: {
        id: true,
        email: true,
        employee: {
          select: {
            id: true,
          },
        },
      },
    })

    console.log(`   Found ${importedUsers.length} imported users`)

    let deletedEmployees = 0
    let deletedUsers = 0

    for (const user of importedUsers) {
      if (user.employee) {
        // Delete employee first (cascade will handle user, but let's be explicit)
        await prisma.employee.delete({
          where: { id: user.employee.id },
        })
        deletedEmployees++
      }
      
      // Delete user (if not already deleted by cascade)
      try {
        await prisma.user.delete({
          where: { id: user.id },
        })
        deletedUsers++
      } catch (error: any) {
        // User might already be deleted by cascade
        if (error.code !== 'P2025') {
          console.warn(`   Warning: Could not delete user ${user.email}: ${error.message}`)
        }
      }
    }

    console.log(`   Deleted ${deletedEmployees} imported employees`)
    console.log(`   Deleted ${deletedUsers} imported users`)

    // Step 6: Delete import sessions
    console.log('\n🗑️  Step 6: Deleting import sessions...')
    const deletedSessions = await prisma.importSession.deleteMany({})
    console.log(`   Deleted ${deletedSessions.count} import sessions`)

    // Step 7: Delete platform channels created for imports (if any)
    // Note: We'll keep platform channels as they might be used by other data
    // Only delete if they have no associated platform requests
    console.log('\n🗑️  Step 7: Checking for unused platform channels...')
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
    console.log(`   Deleted ${deletedChannels} unused platform channels`)

    // Summary
    console.log('\n📊 Cleanup Summary:')
    console.log(`   ✅ Deleted ${deletedReleases.count} releases`)
    console.log(`   ✅ Deleted ${deletedTracks.count} tracks`)
    console.log(`   ✅ Deleted ${deletedPlatformRequests.count} platform requests`)
    console.log(`   ✅ Deleted ${deletedReleaseArtists.count} release artist associations`)
    console.log(`   ✅ Deleted ${deletedArtists} orphaned artists`)
    console.log(`   ✅ Deleted ${deletedEmployees} imported employees`)
    console.log(`   ✅ Deleted ${deletedUsers} imported users`)
    console.log(`   ✅ Deleted ${deletedSessions.count} import sessions`)
    console.log(`   ✅ Deleted ${deletedChannels} unused platform channels`)
    console.log('\n✨ Cleanup completed successfully!')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupImportedData()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })



