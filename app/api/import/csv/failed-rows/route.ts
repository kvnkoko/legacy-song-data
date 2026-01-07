import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get import session
    const importSession = await prisma.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession) {
      return NextResponse.json({ error: 'Import session not found' }, { status: 404 })
    }

    // Verify session belongs to user
    if (importSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Extract failed rows from mappingConfig
    const mappingConfig = importSession.mappingConfig as any
    const failedRows = mappingConfig?._failedRows || []

    return NextResponse.json({
      failedRows,
      totalFailed: failedRows.length,
      sessionStatus: importSession.status,
    })
  } catch (error: any) {
    console.error('Failed to get failed rows:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get failed rows' },
      { status: 500 }
    )
  }
}


