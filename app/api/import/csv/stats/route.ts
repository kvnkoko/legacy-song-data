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

    // Verify session belongs to user
    if (importSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Extract failed rows and get error summary
    const mappingConfig = importSession.mappingConfig as any
    const failedRows = mappingConfig?._failedRows || []
    
    // Get real-time success/error counts if available
    const currentSuccessCount = mappingConfig?._currentSuccessCount ?? 0
    const currentErrorCount = mappingConfig?._currentErrorCount ?? 0
    
    // If import is completed, get final counts from result
    const importResult = mappingConfig?._importResult
    // Success count should include both created and updated releases
    const finalSuccessCount = importResult 
      ? (importResult.submissionsCreated || 0) + (importResult.submissionsUpdated || 0)
      : currentSuccessCount
    const finalErrorCount = importResult?.rowsSkipped ?? currentErrorCount
    
    // Count errors by type
    const errorCounts: Record<string, number> = {}
    failedRows.forEach((err: any) => {
      const errorType = err.message?.split(':')[0] || 'Unknown'
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1
    })

    // Get sample errors (first 10)
    const sampleErrors = failedRows.slice(0, 10).map((err: any) => ({
      row: err.row,
      message: err.message,
    }))

    // Use real-time counts if available, otherwise estimate
    const successCount = importSession.status === 'completed' ? finalSuccessCount : currentSuccessCount
    const errorCount = importSession.status === 'completed' ? finalErrorCount : currentErrorCount

    return NextResponse.json({
      sessionId: importSession.id,
      totalRows: importSession.totalRows,
      rowsProcessed: importSession.rowsProcessed,
      status: importSession.status,
      totalFailed: failedRows.length,
      errorCounts,
      sampleErrors,
      // Use actual success count from import process
      estimatedSuccess: successCount,
      actualSuccessCount: successCount,
      actualErrorCount: errorCount,
      // Calculate success rate
      successRate: importSession.rowsProcessed > 0 
        ? ((successCount / importSession.rowsProcessed) * 100).toFixed(1)
        : '0.0',
    })
  } catch (error: any) {
    console.error('Stats check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get import stats' },
      { status: 500 }
    )
  }
}

