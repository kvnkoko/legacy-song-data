import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { processAllRows, processRow } from '../route'
import type { ParsedRow, MappingConfig } from '@/lib/csv-importer'
import { updateImportSessionProgress, completeImportSession, failImportSession } from '@/lib/csv-import-session'

// Batch size - process this many rows per API call
// Keep it small to stay within Vercel's 10-second free tier limit
const BATCH_SIZE = 20

export async function POST(req: NextRequest) {
  let sessionId: string | null = null
  
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    sessionId = body.sessionId

    // #region agent log
    const logData1 = {
      location: 'app/api/import/csv/process-batch/route.ts:13',
      message: 'Batch processor called',
      data: {
        sessionId: sessionId || 'missing',
        hasSessionId: !!sessionId,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C',
    };
    console.log('[DEBUG] Batch Processor Called:', logData1);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData1) }).catch(() => {});
    // #endregion

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
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

    // Check if already completed or failed
    if (importSession.status === 'completed' || importSession.status === 'failed' || importSession.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        completed: true,
        status: importSession.status,
        rowsProcessed: importSession.rowsProcessed,
        totalRows: importSession.totalRows,
      })
    }

    // Check if paused
    if (importSession.status === 'paused') {
      return NextResponse.json({
        success: true,
        paused: true,
        rowsProcessed: importSession.rowsProcessed,
        totalRows: importSession.totalRows,
      })
    }

    // #region agent log
    const logData2 = {
      location: 'app/api/import/csv/process-batch/route.ts:50',
      message: 'Starting batch processing',
      data: {
        sessionId,
        currentStatus: importSession.status,
        rowsProcessed: importSession.rowsProcessed,
        totalRows: importSession.totalRows,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C',
    };
    console.log('[DEBUG] Batch Start:', logData2);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData2) }).catch(() => {});
    // #endregion

    // Get CSV rows from mappingConfig
    const mappingConfig = importSession.mappingConfig as MappingConfig & { _csvRows?: ParsedRow[] }
    
    if (!mappingConfig._csvRows) {
      // #region agent log
      const logData3 = {
        location: 'app/api/import/csv/process-batch/route.ts:60',
        message: 'CSV rows not found in session',
        data: {
          sessionId,
          hasMappingConfig: !!mappingConfig,
          mappingConfigKeys: mappingConfig ? Object.keys(mappingConfig) : [],
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      };
      console.error('[DEBUG] Missing CSV Rows:', logData3);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData3) }).catch(() => {});
      // #endregion
      return NextResponse.json({ error: 'CSV rows not found in session' }, { status: 400 })
    }

    const rows = mappingConfig._csvRows
    const startFromRow = importSession.rowsProcessed
    const endRow = Math.min(startFromRow + BATCH_SIZE, rows.length)
    const batchRows = rows.slice(startFromRow, endRow)

    // #region agent log
    const logData4 = {
      location: 'app/api/import/csv/process-batch/route.ts:70',
      message: 'Batch rows prepared',
      data: {
        sessionId,
        startFromRow,
        endRow,
        batchSize: batchRows.length,
        totalRows: rows.length,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C',
    };
    console.log('[DEBUG] Batch Prepared:', logData4);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData4) }).catch(() => {});
    // #endregion

    if (batchRows.length === 0) {
      // All rows processed
      await completeImportSession(sessionId, {
        submissionsCreated: (mappingConfig._submissionsCreated || 0) as number,
        submissionsUpdated: (mappingConfig._submissionsUpdated || 0) as number,
        songsCreated: (mappingConfig._songsCreated || 0) as number,
        rowsSkipped: (mappingConfig._rowsSkipped || 0) as number,
        errors: (mappingConfig._failedRows || []) as Array<{ row: number; message: string }>,
      })

      return NextResponse.json({
        success: true,
        completed: true,
        rowsProcessed: rows.length,
        totalRows: rows.length,
      })
    }

    // Process this batch
    const mappings = mappingConfig.columns
    const errors: Array<{ row: number; message: string }> = []
    let submissionsCreated = (mappingConfig._submissionsCreated || 0) as number
    let submissionsUpdated = (mappingConfig._submissionsUpdated || 0) as number
    let songsCreated = (mappingConfig._songsCreated || 0) as number
    let rowsSkipped = (mappingConfig._rowsSkipped || 0) as number

    // Initialize caches for performance
    const artistCache = new Map<string, { id: string; name: string }>()
    const employeeCache = new Map<string, string>()
    const channelCache = new Map<string, { id: string; name: string; platform: string }>()
    const caches = { artistCache, employeeCache, channelCache }

    // Process each row in the batch
    for (let i = 0; i < batchRows.length; i++) {
      const rowIndex = startFromRow + i
      const row = batchRows[i]

      try {
        await prisma.$transaction(async (tx) => {
          const result = await processRow(row, rowIndex, mappings, tx, caches)

          if (result.success) {
            if (result.releaseCreated) {
              submissionsCreated++
            }
            if (result.releaseUpdated) {
              submissionsUpdated++
            }
            if (result.tracksCreated) {
              songsCreated += result.tracksCreated
            }
          } else {
            errors.push({
              row: rowIndex + 1,
              message: result.error || 'Unknown error',
            })
            rowsSkipped++
          }
        }, {
          timeout: 30000,
          maxWait: 5000,
        })
      } catch (error: any) {
        console.error(`❌ Row ${rowIndex + 1} failed:`, error.message || 'Unknown error')
        errors.push({
          row: rowIndex + 1,
          message: `Transaction failed: ${error.message || 'Unknown error'}`,
        })
        rowsSkipped++
      }
    }

    // Update progress
    const newRowsProcessed = endRow
    await updateImportSessionProgress(sessionId, newRowsProcessed)

    // Update stats in mappingConfig
    const updatedMappingConfig: MappingConfig & {
      _csvRows?: ParsedRow[]
      _submissionsCreated?: number
      _submissionsUpdated?: number
      _songsCreated?: number
      _rowsSkipped?: number
      _failedRows?: Array<{ row: number; message: string }>
    } = {
      ...mappingConfig,
      _submissionsCreated: submissionsCreated,
      _submissionsUpdated: submissionsUpdated,
      _songsCreated: songsCreated,
      _rowsSkipped: rowsSkipped,
      _failedRows: [
        ...((mappingConfig._failedRows || []) as Array<{ row: number; message: string }>),
        ...errors,
      ],
    }

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        mappingConfig: updatedMappingConfig,
      },
    })

    const isComplete = newRowsProcessed >= rows.length

    if (isComplete) {
      await completeImportSession(sessionId, {
        submissionsCreated,
        submissionsUpdated,
        songsCreated,
        rowsSkipped,
        errors: updatedMappingConfig._failedRows,
      })
    }

    return NextResponse.json({
      success: true,
      completed: isComplete,
      rowsProcessed: newRowsProcessed,
      totalRows: rows.length,
      batchSize: batchRows.length,
      needsMore: !isComplete,
    })
  } catch (error: any) {
    console.error('Batch processing error:', error)
    
    // Try to mark session as failed (sessionId is already in scope from above)
    try {
      if (sessionId) {
        await failImportSession(sessionId, error.message || 'Batch processing failed')
      }
    } catch (failError) {
      console.error('Failed to mark session as failed:', failError)
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process batch' },
      { status: 500 }
    )
  }
}
