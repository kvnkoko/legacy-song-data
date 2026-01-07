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

    // Get import session
    const importSession = await prisma.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if user owns this session
    if (importSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get total releases and tracks in database (to see if new ones were created)
    const totalReleases = await prisma.release.count()
    const totalTracks = await prisma.track.count()

    // Try to get results from session (stored in mappingConfig._importResult)
    let importResult: any = {
      submissionsCreated: 0,
      submissionsUpdated: 0,
      rowsSkipped: 0,
      songsCreated: 0,
      errors: [] as Array<{ row: number; message: string }>,
    }
    
    if (importSession.mappingConfig && typeof importSession.mappingConfig === 'object') {
      const config = importSession.mappingConfig as any
      if (config._importResult) {
        importResult = config._importResult
      }
    }
    
    const result = {
      sessionId: importSession.id,
      status: importSession.status,
      totalRows: importSession.totalRows,
      rowsProcessed: importSession.rowsProcessed,
      percentage: importSession.totalRows > 0
        ? Math.round((importSession.rowsProcessed / importSession.totalRows) * 100)
        : 0,
      startedAt: importSession.startedAt,
      completedAt: importSession.completedAt,
      error: importSession.error,
      // Import results
      submissionsCreated: importResult.submissionsCreated || 0,
      submissionsUpdated: importResult.submissionsUpdated || 0,
      rowsSkipped: importResult.rowsSkipped || 0,
      songsCreated: importResult.songsCreated || 0,
      errors: importResult.errors || [],
      // Database counts for reference
      totalReleases,
      totalTracks,
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Get import result error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get import result' },
      { status: 500 }
    )
  }
}

