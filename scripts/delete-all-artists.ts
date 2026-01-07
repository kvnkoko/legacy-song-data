/**
 * Script to delete all artists and associated data
 * 
 * WARNING: This is a destructive operation that will delete:
 * - All artists
 * - All releases (cascade delete)
 * - All tracks (cascade delete)
 * - All platform requests (cascade delete)
 * - All release artists, track artists (cascade delete)
 * - Associated users (if any)
 * 
 * Usage: npx tsx scripts/delete-all-artists.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllArtists() {
  console.log('🗑️  Starting deletion of all artists...\n')

  try {
    // Get counts before deletion
    const artistCount = await prisma.artist.count()
    const releaseCount = await prisma.release.count()
    const trackCount = await prisma.track.count()
    
    console.log(`📊 Found:`)
    console.log(`   - ${artistCount} artists`)
    console.log(`   - ${releaseCount} releases`)
    console.log(`   - ${trackCount} tracks\n`)

    if (artistCount === 0) {
      console.log('✅ No artists found. Nothing to delete.')
      return
    }

    // Delete all artists (this will cascade delete releases, tracks, etc.)
    console.log('🗑️  Deleting all artists...')
    const result = await prisma.artist.deleteMany({})
    
    console.log(`✅ Deleted ${result.count} artists`)
    console.log(`✅ Associated releases were also deleted (cascade)`)
    console.log(`✅ Associated tracks were also deleted (cascade)`)
    console.log(`✅ Associated platform requests were also deleted (cascade)`)

    // Verify deletion
    const remainingArtists = await prisma.artist.count()
    const remainingReleases = await prisma.release.count()
    const remainingTracks = await prisma.track.count()
    
    if (remainingArtists === 0) {
      console.log('\n✨ All artists successfully deleted!')
      console.log(`   - Remaining releases: ${remainingReleases}`)
      console.log(`   - Remaining tracks: ${remainingTracks}`)
    } else {
      console.warn(`\n⚠️  Warning: ${remainingArtists} artists still remain`)
    }
  } catch (error) {
    console.error('❌ Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deletion
deleteAllArtists()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
