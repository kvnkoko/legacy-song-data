/**
 * Script to clean the database while preserving the admin user
 * This will:
 * 1. Ensure User.preferences column exists
 * 2. Delete ALL releases, tracks, artists, employees (including admin's employee record)
 * 3. Delete all other users except admin
 * 4. Delete all related data (platform requests, comments, audit logs, import sessions, etc.)
 * 5. Keep ONLY the admin user intact
 * 
 * This ensures a completely fresh start for CSV imports without duplicate detection issues.
 * 
 * ⚠️ WARNING: This will delete ALL data except the admin user account!
 * 
 * Run with: npx tsx scripts/clean-database-preserve-admin.ts
 */

import { prisma } from '../lib/db'
import { UserRole } from '@prisma/client'

async function ensurePreferencesColumn() {
  console.log('🔍 Checking if User.preferences column exists...')
  
  try {
    await prisma.$queryRaw`
      SELECT preferences FROM "User" LIMIT 1
    `
    console.log('✅ User.preferences column already exists')
  } catch (error: any) {
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      console.log('📝 User.preferences column not found. Creating it...')
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS preferences JSONB
      `
      console.log('✅ Successfully added User.preferences column')
    } else {
      throw error
    }
  }
}

async function cleanDatabase() {
  console.log('\n🧹 Starting database cleanup (preserving admin user)...\n')

  try {
    // Step 1: Find and preserve admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      include: { employee: true },
    })

    if (!adminUser) {
      console.log('⚠️  Admin user not found. Creating one...')
      // Create admin user if it doesn't exist
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin',
          role: UserRole.ADMIN,
          passwordHash: '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', // admin123
        },
      })
      console.log('✅ Created admin user')
    } else {
      console.log('✅ Found admin user:', adminUser.email)
    }

    const adminUserId = adminUser?.id || (await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    }))!.id

    // Step 2: Delete all related data first (to handle foreign key constraints)
    // Order matters due to foreign key constraints
    console.log('\n📦 Deleting related data (in correct order)...')
    
    // Delete PlatformDecisions first (references PlatformRequest)
    const platformDecisionsDeleted = await prisma.platformDecision.deleteMany({})
    console.log(`   ✓ Deleted ${platformDecisionsDeleted.count} PlatformDecisions`)
    
    // Delete TrackArtists (references Track and Artist)
    const trackArtistsDeleted = await prisma.trackArtist.deleteMany({})
    console.log(`   ✓ Deleted ${trackArtistsDeleted.count} TrackArtists`)
    
    // Delete ReleaseArtists (references Release and Artist)
    const releaseArtistsDeleted = await prisma.releaseArtist.deleteMany({})
    console.log(`   ✓ Deleted ${releaseArtistsDeleted.count} ReleaseArtists`)
    
    // Delete PlatformRequests (references Release and Track)
    const platformRequestsDeleted = await prisma.platformRequest.deleteMany({})
    console.log(`   ✓ Deleted ${platformRequestsDeleted.count} PlatformRequests`)
    
    // Delete Comments (references Release and User)
    const commentsDeleted = await prisma.comment.deleteMany({})
    console.log(`   ✓ Deleted ${commentsDeleted.count} Comments`)
    
    // Delete AuditLogs (references Release and User)
    const auditLogsDeleted = await prisma.auditLog.deleteMany({})
    console.log(`   ✓ Deleted ${auditLogsDeleted.count} AuditLogs`)
    
    // Delete ImportAttachments (references Release)
    const importAttachmentsDeleted = await prisma.importAttachment.deleteMany({})
    console.log(`   ✓ Deleted ${importAttachmentsDeleted.count} ImportAttachments`)
    
    // Delete ALL ImportSessions (including admin's - fresh start)
    const importSessionsDeleted = await prisma.importSession.deleteMany({})
    console.log(`   ✓ Deleted ${importSessionsDeleted.count} ImportSessions (ALL deleted for fresh start)`)
    
    // Delete ALL SavedViews (including admin's - fresh start)
    const savedViewsDeleted = await prisma.savedView.deleteMany({})
    console.log(`   ✓ Deleted ${savedViewsDeleted.count} SavedViews (ALL deleted for fresh start)`)
    
    // Delete Tracks (references Release)
    const tracksDeleted = await prisma.track.deleteMany({})
    console.log(`   ✓ Deleted ${tracksDeleted.count} Tracks`)
    
    // Step 3: Delete Releases
    console.log('\n📀 Deleting Releases...')
    const releasesDeleted = await prisma.release.deleteMany({})
    console.log(`   ✓ Deleted ${releasesDeleted.count} Releases`)
    
    // Step 4: Delete ALL Artists (including any linked to admin - we'll recreate if needed)
    console.log('\n🎤 Deleting ALL Artists...')
    const artistsDeleted = await prisma.artist.deleteMany({})
    console.log(`   ✓ Deleted ${artistsDeleted.count} Artists`)
    
    // Step 5: Delete ALL Employees (including admin's - we'll recreate if needed)
    console.log('\n👔 Deleting ALL Employees...')
    const employeesDeleted = await prisma.employee.deleteMany({})
    const employeesDeletedCount = employeesDeleted.count
    console.log(`   ✓ Deleted ${employeesDeletedCount} Employees`)
    
    // Step 6: Delete other users (preserve admin)
    console.log('\n👥 Deleting other users...')
    const usersDeleted = await prisma.user.deleteMany({
      where: {
        email: { not: 'admin@example.com' },
      },
    })
    console.log(`   ✓ Deleted ${usersDeleted.count} Users (preserved admin user)`)
    
    // Step 7: Clean up other tables
    console.log('\n🧽 Cleaning up other tables...')
    
    // Delete PlatformChannels
    const channelsDeleted = await prisma.platformChannel.deleteMany({})
    console.log(`   ✓ Deleted ${channelsDeleted.count} PlatformChannels`)
    
    // Note: We keep FieldPermissions, Departments, and FormFields as they are system configuration
    // and not user data. These are typically set up once and reused.
    
    console.log('\n✅ Database cleanup complete!')
    console.log('\n📊 Summary:')
    console.log(`   - Releases: ${releasesDeleted.count}`)
    console.log(`   - Artists: ${artistsDeleted.count} (ALL deleted)`)
    console.log(`   - Employees: ${employeesDeletedCount} (ALL deleted)`)
    console.log(`   - Users: ${usersDeleted.count} (admin preserved)`)
    console.log(`   - Tracks: ${tracksDeleted.count}`)
    console.log(`   - Platform Requests: ${platformRequestsDeleted.count}`)
    console.log(`   - Platform Decisions: ${platformDecisionsDeleted.count}`)
    console.log(`   - Track Artists: ${trackArtistsDeleted.count}`)
    console.log(`   - Release Artists: ${releaseArtistsDeleted.count}`)
    console.log(`   - Comments: ${commentsDeleted.count}`)
    console.log(`   - Audit Logs: ${auditLogsDeleted.count}`)
    console.log(`   - Import Sessions: ${importSessionsDeleted.count} (ALL deleted for fresh start)`)
    console.log(`   - Import Attachments: ${importAttachmentsDeleted.count}`)
    console.log(`   - Saved Views: ${savedViewsDeleted.count} (ALL deleted for fresh start)`)
    console.log(`   - Platform Channels: ${channelsDeleted.count}`)
    
    // Verify admin still exists
    const adminStillExists = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    })
    
    if (adminStillExists) {
      console.log('\n✅ Admin user verified and preserved!')
      console.log(`   Email: ${adminStillExists.email}`)
      console.log(`   Role: ${adminStillExists.role}`)
    } else {
      console.log('\n❌ ERROR: Admin user was deleted! This should not happen.')
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during cleanup:', error)
    console.error('Stack:', error.stack)
    throw error
  }
}

async function main() {
  try {
    // First, ensure preferences column exists
    await ensurePreferencesColumn()
    
    // Then clean the database
    await cleanDatabase()
    
    console.log('\n🎉 All done!')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

