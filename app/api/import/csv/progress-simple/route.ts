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

    const searchParams = req.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    const importSession = await prisma.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const percentage =
      importSession.totalRows > 0
        ? Math.round((importSession.rowsProcessed / importSession.totalRows) * 100)
        : 0

    return NextResponse.json({
      sessionId: importSession.id,
      totalRows: importSession.totalRows,
      rowsProcessed: importSession.rowsProcessed,
      percentage,
      status: importSession.status,
      error: importSession.error,
    })
  } catch (error: any) {
    console.error('Progress check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check progress' },
      { status: 500 }
    )
  }
}


