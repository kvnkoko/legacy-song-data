import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resumeImportSession } from '@/lib/csv-import-session'
import { processAllRows } from '../route'
import { parseCSV } from '@/lib/csv-importer'
import type { MappingConfig } from '@/lib/csv-importer'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, csvContent } = await req.json()

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

    // Allow resuming if paused OR if in_progress but process appears stuck (rowsProcessed < totalRows)
    const isStuck = importSession.status === 'in_progress' && 
                    importSession.rowsProcessed < importSession.totalRows
    
    if (importSession.status !== 'paused' && !isStuck) {
      return NextResponse.json(
        { error: `Cannot resume import with status: ${importSession.status}` },
        { status: 400 }
      )
    }

    // If stuck in_progress, we need CSV content to restart the process
    if (isStuck && !csvContent) {
      return NextResponse.json(
        { error: 'CSV content required to resume stuck import. Please re-upload the CSV file and click Resume.' },
        { status: 400 }
      )
    }

    // Resume the session (only if paused, otherwise it's already in_progress)
    if (importSession.status === 'paused') {
      await resumeImportSession(sessionId)
    }

    // If CSV content is provided, continue processing from where it left off
    if (csvContent) {
      const { rows } = parseCSV(csvContent)
      const mappingConfig = importSession.mappingConfig as MappingConfig
      const startFromRow = importSession.rowsProcessed

      console.log(`🔄 Restarting import from row ${startFromRow} (${rows.length - startFromRow} rows remaining)`)

      // Continue processing in background (non-blocking)
      processAllRows(sessionId, rows, mappingConfig, startFromRow).catch((error) => {
        console.error('Resume import failed:', error)
      })
    } else {
      // CSV content not provided - this is okay if status is paused, the import loop will check
      // the status and continue automatically when it sees status changed to 'in_progress'
      console.log('Resume requested without CSV content - import will continue automatically')
    }

    return NextResponse.json({
      success: true,
      message: 'Import resumed successfully',
      sessionId,
      resumingFrom: importSession.rowsProcessed,
    })
  } catch (error: any) {
    console.error('Resume import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resume import' },
      { status: 500 }
    )
  }
}
