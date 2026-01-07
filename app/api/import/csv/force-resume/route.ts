import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * Force resume a stuck import session
 * This endpoint checks if a session is stuck and marks it as resumable
 * The actual resume requires the CSV content, so this just validates the session
 * and provides status information
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get the import session
    const importSession = await prisma.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (importSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if session is stuck (in_progress but no recent updates)
    if (importSession.status === 'in_progress') {
      const mappingConfig = importSession.mappingConfig as any
      const lastUpdate = mappingConfig?._lastProgressUpdate
      const lastCheckpoint = mappingConfig?._lastCheckpoint
      
      const isStuck = !lastUpdate || (Date.now() - new Date(lastUpdate).getTime()) > 5 * 60 * 1000
      
      if (isStuck && importSession.rowsProcessed < importSession.totalRows) {
        // Session is stuck - return information about resuming
        return NextResponse.json({
          success: true,
          message: 'Session is stuck and can be resumed',
          session: {
            id: importSession.id,
            rowsProcessed: importSession.rowsProcessed,
            totalRows: importSession.totalRows,
            status: importSession.status,
            lastUpdate: lastUpdate || null,
            lastCheckpoint: lastCheckpoint || null,
            remainingRows: importSession.totalRows - importSession.rowsProcessed,
            percentage: Math.round((importSession.rowsProcessed / importSession.totalRows) * 100),
          },
          instructions: 'To resume, you need to call /api/import/csv/resume with the sessionId and csvContent. The import will continue from row ' + importSession.rowsProcessed,
        })
      } else if (importSession.rowsProcessed >= importSession.totalRows) {
        // Session appears complete but status wasn't updated
        // Mark it as completed
        await prisma.importSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        })
        
        return NextResponse.json({
          success: true,
          message: 'Session was already complete, marked as completed',
          session: {
            id: importSession.id,
            rowsProcessed: importSession.rowsProcessed,
            totalRows: importSession.totalRows,
            status: 'completed',
          },
        })
      } else {
        // Session is still active
        return NextResponse.json({
          success: true,
          message: 'Session is still active',
          session: {
            id: importSession.id,
            rowsProcessed: importSession.rowsProcessed,
            totalRows: importSession.totalRows,
            status: importSession.status,
            lastUpdate: lastUpdate || null,
          },
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        message: `Session is ${importSession.status}, cannot resume`,
        session: {
          id: importSession.id,
          status: importSession.status,
          rowsProcessed: importSession.rowsProcessed,
          totalRows: importSession.totalRows,
        },
      })
    }
  } catch (error: any) {
    console.error('Force resume error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check session status' },
      { status: 500 }
    )
  }
}

