import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

/**
 * Database Cleanup API Endpoint
 * Deletes all data except admin user
 * 
 * WARNING: This is a destructive operation!
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow ADMIN users
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    console.log('🧹 Starting database cleanup...')

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        id: session.user.id, // Ensure it's the current user
      },
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`)

    const results: Record<string, number> = {}

    // STEP 1: Cancel all active imports FIRST
    console.log('\n🛑 Stopping all active imports...')
    const activeImports = await prisma.importSession.findMany({
      where: {
        status: 'in_progress',
      },
    })
    
    for (const importSession of activeImports) {
      try {
        await prisma.importSession.update({
          where: { id: importSession.id },
          data: {
            status: 'cancelled',
            completedAt: new Date(),
            error: 'Cancelled by admin cleanup',
          },
        })
        console.log(`   ✅ Cancelled import session: ${importSession.id}`)
      } catch (e) {
        console.warn(`   ⚠️  Failed to cancel import session ${importSession.id}:`, e)
      }
    }
    console.log(`   Cancelled ${activeImports.length} active import(s)`)

    // STEP 2: Delete all import sessions
    console.log('\n📦 Deleting all data...')
    results.importSessions = (await prisma.importSession.deleteMany({})).count
    console.log(`   Deleted ${results.importSessions} import sessions`)
    
    // Double-check: delete any remaining import sessions
    const remainingSessions = await prisma.importSession.deleteMany({})
    if (remainingSessions.count > 0) {
      console.log(`   Deleted ${remainingSessions.count} additional import sessions`)
      results.importSessions += remainingSessions.count
    }

    // Use a transaction to ensure all deletions are atomic
    await prisma.$transaction(async (tx) => {
      // Delete in correct order to respect foreign keys
      // 1. Delete all audit logs
      results.auditLogs = (await tx.auditLog.deleteMany({})).count
      console.log(`   Deleted ${results.auditLogs} audit logs`)

      // 2. Delete all comments
      results.comments = (await tx.comment.deleteMany({})).count
      console.log(`   Deleted ${results.comments} comments`)

      // 3. Delete all platform decisions
      results.platformDecisions = (await tx.platformDecision.deleteMany({})).count
      console.log(`   Deleted ${results.platformDecisions} platform decisions`)

      // 4. Delete all platform requests
      results.platformRequests = (await tx.platformRequest.deleteMany({})).count
      console.log(`   Deleted ${results.platformRequests} platform requests`)

      // 5. Delete all import attachments
      results.importAttachments = (await tx.importAttachment.deleteMany({})).count
      console.log(`   Deleted ${results.importAttachments} import attachments`)

      // 6. Delete all track artists
      results.trackArtists = (await tx.trackArtist.deleteMany({})).count
      console.log(`   Deleted ${results.trackArtists} track artists`)

      // 7. Delete all release artists
      results.releaseArtists = (await tx.releaseArtist.deleteMany({})).count
      console.log(`   Deleted ${results.releaseArtists} release artists`)

      // 8. Delete all tracks (cascade from releases, but delete explicitly to be sure)
      results.tracks = (await tx.track.deleteMany({})).count
      console.log(`   Deleted ${results.tracks} tracks`)

      // 9. Delete ALL releases (this will cascade delete related data)
      results.releases = (await tx.release.deleteMany({})).count
      console.log(`   Deleted ${results.releases} releases`)

      // 10. Delete all platform channels (after platform requests are gone)
      results.platformChannels = (await tx.platformChannel.deleteMany({})).count
      console.log(`   Deleted ${results.platformChannels} platform channels`)

      // 11. Delete all artists (after releases are gone)
      results.artists = (await tx.artist.deleteMany({})).count
      console.log(`   Deleted ${results.artists} artists`)
    })

    // Force delete any remaining data using raw SQL as fallback
    console.log('\n🔍 Force deleting any remaining data with raw SQL...')
    try {
      // Delete all related data first
      await prisma.$executeRawUnsafe(`DELETE FROM "TrackArtist"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "ReleaseArtist"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "Track"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "PlatformRequest"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "PlatformDecision"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "Comment"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "AuditLog"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "ImportAttachment"`)
      await prisma.$executeRawUnsafe(`DELETE FROM "Release"`)
      // Delete artists that don't belong to admin user
      await prisma.$executeRaw`DELETE FROM "Artist" WHERE "userId" != ${adminUser.id} OR "userId" IS NULL`
      console.log('   ✅ Force deleted remaining data with raw SQL')
    } catch (sqlError: any) {
      console.warn('   ⚠️  Raw SQL deletion failed (may be expected):', sqlError.message)
    }

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
    results.employees = employees.length
    console.log(`   Deleted ${results.employees} employees`)

    // 14. Delete all users except admin
    results.users = (await prisma.user.deleteMany({
      where: {
        id: {
          not: adminUser.id,
        },
      },
    })).count
    console.log(`   Deleted ${results.users} users`)

    // 15. Delete all saved views
    results.savedViews = (await prisma.savedView.deleteMany({})).count
    console.log(`   Deleted ${results.savedViews} saved views`)

    // 16. Delete all form fields (optional - uncomment if you want to reset these too)
    // results.formFields = (await prisma.formField.deleteMany({})).count
    // console.log(`   Deleted ${results.formFields} form fields`)

    // 17. Delete all departments (optional - uncomment if you want to reset these too)
    // results.departments = (await prisma.department.deleteMany({})).count
    // console.log(`   Deleted ${results.departments} departments`)

    // Final cleanup pass - delete any remaining data
    console.log('\n🧹 Final cleanup pass...')
    const finalCleanup = await prisma.$transaction(async (tx) => {
      const counts = {
        releases: await tx.release.deleteMany({}),
        tracks: await tx.track.deleteMany({}),
        artists: await tx.artist.deleteMany({}),
        platformRequests: await tx.platformRequest.deleteMany({}),
        comments: await tx.comment.deleteMany({}),
        auditLogs: await tx.auditLog.deleteMany({}),
        trackArtists: await tx.trackArtist.deleteMany({}),
        releaseArtists: await tx.releaseArtist.deleteMany({}),
      }
      return counts
    })

    if (finalCleanup.releases.count > 0) {
      console.log(`   Deleted ${finalCleanup.releases.count} remaining releases`)
      results.releases = (results.releases || 0) + finalCleanup.releases.count
    }
    if (finalCleanup.tracks.count > 0) {
      console.log(`   Deleted ${finalCleanup.tracks.count} remaining tracks`)
      results.tracks = (results.tracks || 0) + finalCleanup.tracks.count
    }
    if (finalCleanup.artists.count > 0) {
      console.log(`   Deleted ${finalCleanup.artists.count} remaining artists`)
      results.artists = (results.artists || 0) + finalCleanup.artists.count
    }

    console.log('\n✅ Database cleanup completed!')
    console.log(`   Admin user preserved: ${adminUser.email}`)
    
    // Final verification - ensure everything is deleted
    const remaining = {
      releases: await prisma.release.count(),
      artists: await prisma.artist.count(),
      users: await prisma.user.count(),
      tracks: await prisma.track.count(),
      importSessions: await prisma.importSession.count(),
      platformRequests: await prisma.platformRequest.count(),
      comments: await prisma.comment.count(),
      auditLogs: await prisma.auditLog.count(),
    }

    // If anything remains, log a warning
    const hasRemaining = Object.values(remaining).some(count => count > 0)
    if (hasRemaining) {
      console.warn('⚠️  Some data still remains after cleanup:', remaining)
    } else {
      console.log('✅ All data successfully deleted')
    }

    // Return cache clearing instructions
    return NextResponse.json({
      success: true,
      message: hasRemaining 
        ? 'Database cleanup completed with some remaining data. Check logs for details.'
        : 'Database cleanup completed successfully. All imported data deleted.',
      deleted: results,
      remaining,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
      },
      cacheClearing: {
        localStorage: [
          'csv-import-file',
          'csv-import-preview',
          'csv-import-mappings',
          'csv-import-progress',
        ],
        sessionStorage: [
          'csv-import-file',
          'csv-import-preview',
          'csv-import-mappings',
          'csv-import-progress',
        ],
      },
      allCleared: !hasRemaining,
    })
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup database' },
      { status: 500 }
    )
  }
}

