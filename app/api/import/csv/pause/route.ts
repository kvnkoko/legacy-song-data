import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { pauseImportSession } from '@/lib/csv-import-session'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    // Verify session belongs to user
    const importSession = await prisma.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (importSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow pausing if in progress
    if (importSession.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot pause import with status: ${importSession.status}` },
        { status: 400 }
      )
    }

    await pauseImportSession(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Import paused successfully',
      sessionId,
    })
  } catch (error: any) {
    console.error('Pause import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to pause import' },
      { status: 500 }
    )
  }
}
