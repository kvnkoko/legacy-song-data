import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseCSV, type MappingConfig } from '@/lib/csv-importer'
import { failImportSession } from '@/lib/csv-import-session'

// Import the processAllRows function by re-importing the route module
// We'll need to make it accessible - for now, we'll just trigger a re-import
// by calling the main import endpoint with the same file

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, csvContent } = await req.json()

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

    if (importSession.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Session is ${importSession.status}, cannot resume` },
        { status: 400 }
      )
    }

    // Parse CSV if provided, otherwise we can't resume
    if (!csvContent) {
      return NextResponse.json(
        { error: 'CSV content required to resume import' },
        { status: 400 }
      )
    }

    const { rows } = parseCSV(csvContent)
    const mappingConfig = importSession.mappingConfig as MappingConfig
    
    // CRITICAL: Ensure we start from the exact row where we left off
    // rowsProcessed is the count of rows already processed (0-indexed in terms of count)
    // So if rowsProcessed is 100, we've processed rows 0-99, and should start from row 100
    const startFromRow = importSession.rowsProcessed
    
    // Validate that we're not starting beyond the array bounds
    if (startFromRow < 0 || startFromRow > rows.length) {
      return NextResponse.json(
        { error: `Invalid start row: ${startFromRow}. Total rows: ${rows.length}` },
        { status: 400 }
      )
    }
    
    // Verify that we're not skipping any rows
    if (startFromRow >= rows.length) {
      // All rows have been processed, just mark as complete
      await prisma.importSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      })
      
      return NextResponse.json({
        success: true,
        message: 'All rows have already been processed',
        sessionId: importSession.id,
        rowsProcessed: importSession.rowsProcessed,
        totalRows: importSession.totalRows,
      })
    }

    console.log(`🔄 Resuming import session ${sessionId} from row ${startFromRow} (${rows.length - startFromRow} rows remaining)`)

    // Dynamically import and call processAllRows from the main route
    const { processAllRows } = await import('../route')
    
    // Resume processing in background - this will continue from startFromRow
    // and process all remaining rows (startFromRow to rows.length-1)
    processAllRows(importSession.id, rows, mappingConfig, startFromRow).catch(
      (error) => {
        console.error('Resume processing failed:', error)
        failImportSession(importSession.id, error.message || 'Resume failed')
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Import resumed',
      sessionId: importSession.id,
      resumingFrom: startFromRow,
      totalRows: importSession.totalRows,
    })
  } catch (error: any) {
    console.error('Resume error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resume import' },
      { status: 500 }
    )
  }
}
