/**
 * Backfill script to fix platform approvals
 * 
 * This script finds all releases with platform requests that have APPROVED or UPLOADED status
 * and ensures that ALL channels for those platforms are also approved.
 * 
 * Usage: npx tsx scripts/backfill-platform-approvals.ts
 */

import { PrismaClient, PlatformRequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillPlatformApprovals() {
  console.log('🚀 Starting platform approvals backfill...\n')

  try {
    // Find all platform requests with APPROVED or UPLOADED status
    const approvedRequests = await prisma.platformRequest.findMany({
      where: {
        status: {
          in: [PlatformRequestStatus.APPROVED, PlatformRequestStatus.UPLOADED],
        },
      },
      include: {
        release: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    console.log(`📊 Found ${approvedRequests.length} approved/uploaded platform requests\n`)

    // Group by release and platform
    const releasePlatformMap = new Map<string, Set<string>>()

    for (const request of approvedRequests) {
      if (!request.releaseId || !request.platform) continue

      const key = `${request.releaseId}:${request.platform}`
      if (!releasePlatformMap.has(key)) {
        releasePlatformMap.set(key, new Set())
      }
      releasePlatformMap.get(key)!.add(request.id)
    }

    console.log(`📦 Processing ${releasePlatformMap.size} unique release-platform combinations\n`)

    let totalUpdated = 0
    let totalSkipped = 0

    // Process each release-platform combination
    for (const [key, requestIds] of releasePlatformMap.entries()) {
      const [releaseId, platform] = key.split(':')

      // Find ALL platform requests for this release and platform
      const allRequests = await prisma.platformRequest.findMany({
        where: {
          releaseId,
          platform,
        },
      })

      // Get the status from the first approved request
      const approvedRequest = allRequests.find(r => 
        r.status === PlatformRequestStatus.APPROVED || 
        r.status === PlatformRequestStatus.UPLOADED
      )

      if (!approvedRequest) {
        totalSkipped++
        continue
      }

      // Find requests that need to be updated (not already in the same status)
      const requestsToUpdate = allRequests.filter(r => {
        if (r.id === approvedRequest.id) return false // Skip the one that's already approved
        return r.status !== approvedRequest.status
      })

      if (requestsToUpdate.length === 0) {
        totalSkipped++
        continue
      }

      // Update all channel requests to match the approved status
      const updateData: any = {
        status: approvedRequest.status,
      }

      if (approvedRequest.status === PlatformRequestStatus.UPLOADED) {
        updateData.uploadedAt = approvedRequest.uploadedAt || new Date()
      }

      await prisma.platformRequest.updateMany({
        where: {
          releaseId,
          platform,
          id: {
            in: requestsToUpdate.map(r => r.id),
          },
        },
        data: updateData,
      })

      totalUpdated += requestsToUpdate.length

      const release = approvedRequests.find(r => r.releaseId === releaseId)?.release
      console.log(
        `✅ Updated ${requestsToUpdate.length} request(s) for ${platform} ` +
        `on release "${release?.title || releaseId}"`
      )
    }

    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Updated: ${totalUpdated} platform requests`)
    console.log(`   ⏭️  Skipped: ${totalSkipped} (already up to date)`)
    console.log(`\n✨ Backfill completed successfully!`)

  } catch (error) {
    console.error('❌ Error during backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backfill
backfillPlatformApprovals()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })



