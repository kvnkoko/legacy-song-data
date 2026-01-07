/**
 * Backfill script to update platform requests from CSV uploadStatus column
 * 
 * This script reads all releases with rawRow data (original CSV row) and extracts
 * the uploadStatus column. For each platform listed in uploadStatus, it creates or
 * updates the platform request to UPLOADED status.
 * 
 * Usage: npx tsx scripts/backfill-upload-status-from-csv.ts
 */

import { PrismaClient, PlatformRequestStatus } from '@prisma/client'
import { parseUploadStatus } from '../lib/csv-importer'

const prisma = new PrismaClient()

async function backfillUploadStatusFromCSV() {
  console.log('🚀 Starting upload status backfill from CSV...\n')

  try {
    // Find all releases that have rawRow data
    const releases = await prisma.release.findMany({
      where: {
        rawRow: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        rawRow: true,
        artist: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`📊 Found ${releases.length} releases with rawRow data\n`)

    let totalProcessed = 0
    let totalUpdated = 0
    let totalCreated = 0
    let totalSkipped = 0

    // Process each release
    for (const release of releases) {
      try {
        // Extract rawRow JSON
        const rawRow = release.rawRow as any
        if (!rawRow || typeof rawRow !== 'object') {
          totalSkipped++
          continue
        }

        // Get uploadStatus from rawRow
        // Try different possible column names
        const uploadStatus = 
          rawRow.uploadStatus || 
          rawRow['Upload Status'] || 
          rawRow['upload status'] ||
          rawRow['UploadStatus'] ||
          null

        if (!uploadStatus || typeof uploadStatus !== 'string') {
          totalSkipped++
          continue
        }

        // Parse platforms from uploadStatus
        const platforms = parseUploadStatus(uploadStatus)
        
        if (platforms.length === 0) {
          totalSkipped++
          continue
        }

        console.log(
          `📝 Processing release "${release.title}" by ${release.artist.name} ` +
          `(Platforms: ${platforms.join(', ')})`
        )

        // Process each platform
        for (const platform of platforms) {
          try {
            // Check if platform request already exists
            let existingRequest = await prisma.platformRequest.findFirst({
              where: {
                releaseId: release.id,
                platform: platform,
                channelId: null, // Base request (not channel-specific)
              },
            })

            if (existingRequest) {
              // Update existing request if not already UPLOADED
              if (existingRequest.status !== PlatformRequestStatus.UPLOADED) {
                await prisma.platformRequest.update({
                  where: { id: existingRequest.id },
                  data: {
                    status: PlatformRequestStatus.UPLOADED,
                    uploadedAt: existingRequest.uploadedAt || release.createdAt || new Date(),
                  },
                })
                totalUpdated++
                console.log(`   ✅ Updated ${platform} request to UPLOADED`)
              } else {
                console.log(`   ⏭️  ${platform} request already UPLOADED`)
              }
            } else {
              // Create new platform request
              await prisma.platformRequest.create({
                data: {
                  releaseId: release.id,
                  platform: platform,
                  status: PlatformRequestStatus.UPLOADED,
                  requested: true,
                  uploadedAt: release.createdAt || new Date(),
                },
              })
              totalCreated++
              console.log(`   ✨ Created ${platform} request as UPLOADED`)
            }

            // Handle channel-specific platforms (YouTube, Facebook)
            // Check if uploadStatus contains channel information
            // Format might be like "youtube-legacy" or "youtube, facebook-imagine"
            const channelMatch = uploadStatus.match(new RegExp(`${platform}-([^,\\s]+)`, 'i'))
            if (channelMatch && (platform === 'youtube' || platform === 'facebook')) {
              const channelName = channelMatch[1].trim()
              
              // Find or create platform channel
              let channel = await prisma.platformChannel.findFirst({
                where: {
                  platform: platform,
                  name: { equals: channelName, mode: 'insensitive' },
                },
              })

              if (!channel) {
                // Create channel if it doesn't exist
                channel = await prisma.platformChannel.create({
                  data: {
                    platform: platform,
                    name: channelName,
                    active: true,
                  },
                })
                console.log(`   📺 Created channel: ${platform} - ${channelName}`)
              }

              // Check if channel-specific request exists
              let channelRequest = await prisma.platformRequest.findFirst({
                where: {
                  releaseId: release.id,
                  platform: platform,
                  channelId: channel.id,
                },
              })

              if (channelRequest) {
                // Update existing channel request
                if (channelRequest.status !== PlatformRequestStatus.UPLOADED) {
                  await prisma.platformRequest.update({
                    where: { id: channelRequest.id },
                    data: {
                      status: PlatformRequestStatus.UPLOADED,
                      uploadedAt: channelRequest.uploadedAt || release.createdAt || new Date(),
                    },
                  })
                  totalUpdated++
                  console.log(`   ✅ Updated ${platform} (${channelName}) channel request to UPLOADED`)
                }
              } else {
                // Create new channel-specific request
                await prisma.platformRequest.create({
                  data: {
                    releaseId: release.id,
                    platform: platform,
                    channelId: channel.id,
                    channelName: channel.name,
                    status: PlatformRequestStatus.UPLOADED,
                    requested: true,
                    uploadedAt: release.createdAt || new Date(),
                  },
                })
                totalCreated++
                console.log(`   ✨ Created ${platform} (${channelName}) channel request as UPLOADED`)
              }
            }

          } catch (platformError: any) {
            console.error(`   ❌ Error processing platform ${platform}:`, platformError.message)
            // Continue with next platform
          }
        }

        totalProcessed++

      } catch (releaseError: any) {
        console.error(
          `❌ Error processing release "${release.title}":`,
          releaseError.message
        )
        // Continue with next release
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   📝 Processed: ${totalProcessed} releases`)
    console.log(`   ✨ Created: ${totalCreated} platform requests`)
    console.log(`   ✅ Updated: ${totalUpdated} platform requests`)
    console.log(`   ⏭️  Skipped: ${totalSkipped} releases (no uploadStatus or invalid data)`)
    console.log(`\n✨ Backfill completed successfully!`)

  } catch (error) {
    console.error('❌ Error during backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backfill
backfillUploadStatusFromCSV()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })



