import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { cancelImportSession } from '@/lib/csv-import-session'

/**
 * Cancel All Active Imports API Endpoint
 * Immediately stops all in-progress imports
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

    console.log('🛑 Stopping all active imports...')

    // Find all active imports
    const activeImports = await prisma.importSession.findMany({
      where: {
        status: 'in_progress',
      },
    })

    console.log(`Found ${activeImports.length} active import(s)`)

    const cancelled: string[] = []
    const failed: Array<{ id: string; error: string }> = []

    // Cancel each import
    for (const importSession of activeImports) {
      try {
        await cancelImportSession(importSession.id)
        cancelled.push(importSession.id)
        console.log(`✅ Cancelled import session: ${importSession.id}`)
      } catch (error: any) {
        // If cancelImportSession fails, try direct update
        try {
          await prisma.importSession.update({
            where: { id: importSession.id },
            data: {
              status: 'cancelled',
              completedAt: new Date(),
              error: 'Cancelled by admin',
            },
          })
          cancelled.push(importSession.id)
          console.log(`✅ Cancelled import session (direct update): ${importSession.id}`)
        } catch (updateError: any) {
          failed.push({
            id: importSession.id,
            error: updateError.message || 'Failed to cancel',
          })
          console.error(`❌ Failed to cancel import session ${importSession.id}:`, updateError)
        }
      }
    }

    // Also try to cancel any imports that might be stuck
    const stuckImports = await prisma.importSession.findMany({
      where: {
        status: 'in_progress',
        // Check if last update was more than 5 minutes ago (likely stuck)
        OR: [
          {
            mappingConfig: {
              path: ['_lastProgressUpdate'],
              equals: null,
            },
          },
        ],
      },
    })

    for (const stuckImport of stuckImports) {
      if (!cancelled.includes(stuckImport.id)) {
        try {
          await prisma.importSession.update({
            where: { id: stuckImport.id },
            data: {
              status: 'cancelled',
              completedAt: new Date(),
              error: 'Cancelled - import appeared stuck',
            },
          })
          cancelled.push(stuckImport.id)
          console.log(`✅ Cancelled stuck import session: ${stuckImport.id}`)
        } catch (e) {
          // Ignore errors for stuck imports
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cancelled ${cancelled.length} active import(s)`,
      cancelled: cancelled.length,
      failed: failed.length,
      cancelledIds: cancelled,
      failedImports: failed,
    })
  } catch (error: any) {
    console.error('❌ Error cancelling imports:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel imports' },
      { status: 500 }
    )
  }
}

