import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { findExistingSession, cancelImportSession } from '@/lib/csv-import-session'

// GET: Check for existing session
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const fileHash = searchParams.get('fileHash')
    const status = searchParams.get('status')

    // If status is provided, get the most recent session with that status
    if (status) {
      const activeSession = await prisma.importSession.findFirst({
        where: {
          userId: session.user.id,
          status: status as any,
        },
        orderBy: {
          startedAt: 'desc',
        },
      })

      if (activeSession) {
        return NextResponse.json({
          session: {
            id: activeSession.id,
            rowsProcessed: activeSession.rowsProcessed,
            totalRows: activeSession.totalRows,
            status: activeSession.status,
            startedAt: activeSession.startedAt,
            completedAt: activeSession.completedAt,
            error: activeSession.error,
          },
        })
      }

      return NextResponse.json({ session: null })
    }

    // Otherwise, check by fileHash
    if (!fileHash) {
      return NextResponse.json({ error: 'fileHash or status required' }, { status: 400 })
    }

    const existingSession = await findExistingSession(session.user.id, fileHash)

    if (existingSession) {
      return NextResponse.json({
        exists: true,
        sessionId: existingSession.id,
        rowsProcessed: existingSession.rowsProcessed,
        totalRows: existingSession.totalRows,
        status: existingSession.status,
        startedAt: existingSession.startedAt,
      })
    }

    return NextResponse.json({ exists: false })
  } catch (error: any) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check session' },
      { status: 500 }
    )
  }
}

// DELETE: Cancel a session
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    // Verify session belongs to user
    const importSession = await prisma.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession || importSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await cancelImportSession(sessionId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Cancel session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel session' },
      { status: 500 }
    )
  }
}


