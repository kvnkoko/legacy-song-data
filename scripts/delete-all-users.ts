/**
 * Script to delete all users
 * 
 * WARNING: This is a destructive operation that will delete:
 * - All users
 * - This will cascade delete employees and artists (if onDelete: Cascade)
 * 
 * Usage: npx tsx scripts/delete-all-users.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllUsers() {
  console.log('🗑️  Starting deletion of all users...\n')

  try {
    // Get count before deletion
    const userCount = await prisma.user.count()
    console.log(`📊 Found ${userCount} users to delete\n`)

    if (userCount === 0) {
      console.log('✅ No users found. Nothing to delete.')
      return
    }

    // Note: We need to delete employees and artists first if they have foreign key constraints
    // Check if there are any employees or artists
    const employeeCount = await prisma.employee.count()
    const artistCount = await prisma.artist.count()
    
    if (employeeCount > 0 || artistCount > 0) {
      console.log(`⚠️  Warning: Found ${employeeCount} employees and ${artistCount} artists`)
      console.log(`   These will be deleted if they have onDelete: Cascade`)
      console.log(`   Proceeding with user deletion...\n`)
    }

    // Delete all users
    console.log('🗑️  Deleting all users...')
    const result = await prisma.user.deleteMany({})
    
    console.log(`✅ Deleted ${result.count} users`)

    // Verify deletion
    const remainingCount = await prisma.user.count()
    if (remainingCount === 0) {
      console.log('\n✨ All users successfully deleted!')
    } else {
      console.warn(`\n⚠️  Warning: ${remainingCount} users still remain`)
    }
  } catch (error) {
    console.error('❌ Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deletion
deleteAllUsers()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })



