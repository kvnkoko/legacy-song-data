/**
 * Migration script to convert all APPROVED statuses to UPLOADED
 * 
 * This script finds all platform requests with APPROVED status and updates them
 * to UPLOADED status. It also sets uploadedAt timestamp if not already set.
 * 
 * Usage: npx tsx scripts/migrate-approved-to-uploaded.ts
 */

import { PrismaClient, PlatformRequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateApprovedToUploaded() {
  console.log('🚀 Starting migration of APPROVED to UPLOADED...\n')

  try {
    // Find all platform requests with APPROVED status
    const approvedRequests = await prisma.platformRequest.findMany({
      where: {
        status: PlatformRequestStatus.APPROVED,
      },
      select: {
        id: true,
        releaseId: true,
        platform: true,
        createdAt: true,
        updatedAt: true,
        uploadedAt: true,
      },
    })

    console.log(`📊 Found ${approvedRequests.length} platform requests with APPROVED status\n`)

    if (approvedRequests.length === 0) {
      console.log('✨ No APPROVED requests found. Nothing to migrate.')
      return
    }

    let totalMigrated = 0
    let totalSkipped = 0

    // Update each request
    for (const request of approvedRequests) {
      try {
        // Set uploadedAt if not already set
        const uploadedAt = request.uploadedAt || request.updatedAt || request.createdAt || new Date()

        await prisma.platformRequest.update({
          where: { id: request.id },
          data: {
            status: PlatformRequestStatus.UPLOADED,
            uploadedAt: uploadedAt,
          },
        })

        totalMigrated++
        console.log(
          `✅ Migrated request ${request.id} ` +
          `(${request.platform} for release ${request.releaseId})`
        )

      } catch (error: any) {
        console.error(`❌ Error migrating request ${request.id}:`, error.message)
        totalSkipped++
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Migrated: ${totalMigrated} platform requests`)
    console.log(`   ⏭️  Skipped: ${totalSkipped} (errors)`)
    console.log(`\n✨ Migration completed successfully!`)

  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateApprovedToUploaded()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })



