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

    // Check if CSV content is available in session mappingConfig
    const mappingConfig = importSession.mappingConfig as MappingConfig & {
      _csvContent?: string
      _csvRows?: any[]
    }
    const hasCsvInSession = !!(mappingConfig._csvContent || mappingConfig._csvRows)
    
    // If stuck in_progress, we need CSV content to restart the process (either from request or session)
    if (isStuck && !csvContent && !hasCsvInSession) {
      return NextResponse.json(
        { error: 'CSV content required to resume stuck import. Please re-upload the CSV file and click Resume.' },
        { status: 400 }
      )
    }

    // Resume the session (only if paused, otherwise it's already in_progress)
    if (importSession.status === 'paused') {
      await resumeImportSession(sessionId)
    }

    // Use the mappingConfig we already defined above
    let csvContentToUse = csvContent
    if (!csvContentToUse && mappingConfig._csvContent) {
      csvContentToUse = mappingConfig._csvContent
    }

    // If CSV content is available (from request or session), continue processing from where it left off
    if (csvContentToUse) {
      const { rows } = parseCSV(csvContentToUse)
      const startFromRow = importSession.rowsProcessed

      console.log(`🔄 Restarting import from row ${startFromRow} (${rows.length - startFromRow} rows remaining)`)

      // Continue processing in background (fire-and-forget)
      // Use void to ensure it doesn't block the response
      void (async () => {
        try {
          await processAllRows(sessionId, rows, mappingConfig, startFromRow)
        } catch (error: any) {
          console.error('❌ Resume import failed:', error)
          try {
            const { failImportSession } = await import('@/lib/csv-import-session')
            await failImportSession(sessionId, error.message || 'Resume import failed')
          } catch (failError) {
            console.error('Failed to mark session as failed:', failError)
          }
        }
      })()
    } else {
      // CSV content not provided and not in session - this is okay if status is paused
      // The batch processor will check the status and continue automatically when it sees status changed to 'in_progress'
      // Since we already resumed the session above, the batch processor should pick it up
      console.log('Resume requested without CSV content - batch processor will continue automatically')
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
