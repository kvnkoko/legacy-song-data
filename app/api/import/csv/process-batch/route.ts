import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { processAllRows, processRow } from '../route'
import { parseCSV } from '@/lib/csv-importer'
import type { ParsedRow, MappingConfig } from '@/lib/csv-importer'
import { updateImportSessionProgress, completeImportSession, failImportSession, resumeImportSession } from '@/lib/csv-import-session'

// Batch size - process this many rows per API call
// Keep it small to stay within Vercel's 10-second free tier limit
const BATCH_SIZE = 20

export async function POST(req: NextRequest) {
  let sessionId: string | null = null
  
  // #region agent log - Very first log to confirm route is hit
  const logDataEntry = {
    location: 'app/api/import/csv/process-batch/route.ts:14',
    message: 'Batch processor route ENTRY',
    data: {
      method: 'POST',
      url: req.url,
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'I',
  };
  console.log('[DEBUG] Batch Processor Entry:', logDataEntry);
  fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataEntry) }).catch(() => {});
  // #endregion
  
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      // #region agent log
      const logDataNoAuth = {
        location: 'app/api/import/csv/process-batch/route.ts:25',
        message: 'Batch processor: No auth session',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'I',
      };
      console.error('[DEBUG] No Auth:', logDataNoAuth);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataNoAuth) }).catch(() => {});
      // #endregion
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // #region agent log
    const logDataAuth = {
      location: 'app/api/import/csv/process-batch/route.ts:35',
      message: 'Batch processor: Auth OK',
      data: {
        userId: session.user.id,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'I',
    };
    console.log('[DEBUG] Auth OK:', logDataAuth);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataAuth) }).catch(() => {});
    // #endregion

    let body: any
    try {
      body = await req.json()
    } catch (jsonError: any) {
      // #region agent log
      const logDataJsonError = {
        location: 'app/api/import/csv/process-batch/route.ts:45',
        message: 'Batch processor: Failed to parse JSON',
        data: {
          error: jsonError.message || 'Unknown JSON error',
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'I',
      };
      console.error('[DEBUG] JSON Parse Error:', logDataJsonError);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataJsonError) }).catch(() => {});
      // #endregion
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    sessionId = body.sessionId

    // #region agent log
    const logData1 = {
      location: 'app/api/import/csv/process-batch/route.ts:55',
      message: 'Batch processor called',
      data: {
        sessionId: sessionId || 'missing',
        hasSessionId: !!sessionId,
        bodyKeys: Object.keys(body),
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'I',
    };
    console.log('[DEBUG] Batch Processor Called:', logData1);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData1) }).catch(() => {});
    // #endregion

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    // Get the import session
    let importSession = await prisma.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession) {
      // #region agent log
      const logDataNotFound = {
        location: 'app/api/import/csv/process-batch/route.ts:48',
        message: 'Session not found',
        data: { sessionId },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      };
      console.error('[DEBUG] Session Not Found:', logDataNotFound);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataNotFound) }).catch(() => {});
      // #endregion
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (importSession.userId !== session.user.id) {
      // #region agent log
      const logDataUnauthorized = {
        location: 'app/api/import/csv/process-batch/route.ts:58',
        message: 'Unauthorized access to session',
        data: { sessionId, userId: session.user.id, sessionUserId: importSession.userId },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      };
      console.error('[DEBUG] Unauthorized:', logDataUnauthorized);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataUnauthorized) }).catch(() => {});
      // #endregion
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If paused, auto-resume it (batch processor should always process if called)
    if (importSession.status === 'paused') {
      // #region agent log
      const logDataResume = {
        location: 'app/api/import/csv/process-batch/route.ts:70',
        message: 'Session paused - auto-resuming',
        data: {
          sessionId,
          rowsProcessed: importSession.rowsProcessed,
          totalRows: importSession.totalRows,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      };
      console.log('[DEBUG] Auto-resuming:', logDataResume);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataResume) }).catch(() => {});
      // #endregion
      await resumeImportSession(sessionId)
      // Re-fetch session after resume to get updated status
      const updatedSession = await prisma.importSession.findUnique({
        where: { id: sessionId },
      })
      if (!updatedSession) {
        return NextResponse.json({ error: 'Session not found after resume' }, { status: 404 })
      }
      // Use updated session for rest of processing
      importSession = updatedSession
    }

    // Check if already completed or failed
    if (importSession.status === 'completed' || importSession.status === 'failed' || importSession.status === 'cancelled') {
      // #region agent log
      const logDataCompleted = {
        location: 'app/api/import/csv/process-batch/route.ts:90',
        message: 'Session already completed/failed/cancelled',
        data: {
          sessionId,
          status: importSession.status,
          rowsProcessed: importSession.rowsProcessed,
          totalRows: importSession.totalRows,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      };
      console.log('[DEBUG] Session Completed:', logDataCompleted);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataCompleted) }).catch(() => {});
      // #endregion
      return NextResponse.json({
        success: true,
        completed: true,
        status: importSession.status,
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
    const mappingConfig = importSession.mappingConfig as MappingConfig & { 
      _csvRows?: ParsedRow[]
      _csvContent?: string
    }
    
    let rows: ParsedRow[]
    
    if (mappingConfig._csvRows && mappingConfig._csvRows.length > 0) {
      rows = mappingConfig._csvRows
    } else if (mappingConfig._csvContent) {
      // CSV rows not available, but we have the original CSV content - re-parse it
      // #region agent log
      const logDataReParse = {
        location: 'app/api/import/csv/process-batch/route.ts:60',
        message: 'CSV rows not found, re-parsing from CSV content',
        data: {
          sessionId,
          hasCsvContent: !!mappingConfig._csvContent,
          csvContentLength: mappingConfig._csvContent?.length || 0,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      };
      console.log('[DEBUG] Re-parsing CSV:', logDataReParse);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataReParse) }).catch(() => {});
      // #endregion
      
      try {
        const parsed = parseCSV(mappingConfig._csvContent)
        rows = parsed.rows
        
        // Update mappingConfig with parsed rows
        const updatedMappingConfig = {
          ...mappingConfig,
          _csvRows: rows,
        }
        
        await prisma.importSession.update({
          where: { id: sessionId },
          data: { mappingConfig: updatedMappingConfig },
        })
      } catch (parseError: any) {
        // #region agent log
        const logDataParseError = {
          location: 'app/api/import/csv/process-batch/route.ts:85',
          message: 'Failed to re-parse CSV content',
          data: {
            sessionId,
            error: parseError.message || 'Unknown error',
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'C',
        };
        console.error('[DEBUG] CSV Re-parse Failed:', logDataParseError);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataParseError) }).catch(() => {});
        // #endregion
        return NextResponse.json({ error: `Failed to parse CSV: ${parseError.message}` }, { status: 400 })
      }
    } else {
      // #region agent log
      const logData3 = {
        location: 'app/api/import/csv/process-batch/route.ts:200',
        message: 'CSV rows and content not found in session',
        data: {
          sessionId,
          hasMappingConfig: !!mappingConfig,
          mappingConfigKeys: mappingConfig ? Object.keys(mappingConfig) : [],
          mappingConfigType: typeof mappingConfig,
          mappingConfigString: JSON.stringify(mappingConfig).substring(0, 500),
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'I',
      };
      console.error('[DEBUG] Missing CSV Data:', logData3);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData3) }).catch(() => {});
      // #endregion
      return NextResponse.json({ 
        error: 'CSV rows and content not found in session',
        details: 'The import session does not contain the CSV data. Please restart the import.',
      }, { status: 400 })
    }
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
