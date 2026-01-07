/**
 * Script to re-import previously skipped rows from import sessions
 * 
 * This script queries ImportSession table for completed/failed imports and
 * attempts to re-import rows that were skipped due to missing optional data
 * (not duplicates). Rows skipped due to duplicates are not re-imported.
 * 
 * Usage: npx tsx scripts/re-import-skipped-rows.ts [sessionId]
 * 
 * If sessionId is provided, only that session will be processed.
 * Otherwise, all incomplete/failed sessions will be processed.
 */

import { PrismaClient } from '@prisma/client'
import { parseCSV } from '../lib/csv-importer'

const prisma = new PrismaClient()

async function reImportSkippedRows(sessionId?: string) {
  console.log('🚀 Starting re-import of skipped rows...\n')

  try {
    // Find import sessions
    const where: any = {
      status: {
        in: ['completed', 'failed'],
      },
    }

    if (sessionId) {
      where.id = sessionId
    }

    const sessions = await prisma.importSession.findMany({
      where,
      orderBy: {
        startedAt: 'desc',
      },
      take: sessionId ? 1 : 10, // Limit to 10 most recent if no sessionId specified
    })

    if (sessions.length === 0) {
      console.log('✨ No import sessions found to process.')
      return
    }

    console.log(`📊 Found ${sessions.length} import session(s) to process\n`)

    for (const session of sessions) {
      console.log(`\n📝 Processing session: ${session.id}`)
      console.log(`   File: ${session.fileName}`)
      console.log(`   Status: ${session.status}`)
      console.log(`   Progress: ${session.rowsProcessed} / ${session.totalRows} rows`)

      // Extract results from mappingConfig
      let importResult: any = null
      if (session.mappingConfig && typeof session.mappingConfig === 'object') {
        const config = session.mappingConfig as any
        if (config._importResult) {
          importResult = config._importResult
        }
      }

      if (!importResult || !importResult.errors || importResult.errors.length === 0) {
        console.log(`   ⏭️  No errors found in this session. Skipping.`)
        continue
      }

      console.log(`   📋 Found ${importResult.errors.length} error(s) to review`)

      // Group errors by type
      const duplicateErrors: any[] = []
      const dataErrors: any[] = []
      const otherErrors: any[] = []

      for (const error of importResult.errors) {
        const message = error.message?.toLowerCase() || ''
        if (message.includes('already exists') || message.includes('duplicate')) {
          duplicateErrors.push(error)
        } else if (
          message.includes('missing') ||
          message.includes('no valid') ||
          message.includes('failed to')
        ) {
          dataErrors.push(error)
        } else {
          otherErrors.push(error)
        }
      }

      console.log(`   📊 Error breakdown:`)
      console.log(`      - Duplicates (will skip): ${duplicateErrors.length}`)
      console.log(`      - Data errors (will re-attempt): ${dataErrors.length}`)
      console.log(`      - Other errors: ${otherErrors.length}`)

      if (dataErrors.length === 0) {
        console.log(`   ⏭️  No data errors to re-import. All errors are duplicates or other issues.`)
        continue
      }

      // Note: To actually re-import, we would need the original CSV content
      // This script identifies which rows should be re-imported
      // The actual re-import would need to be done through the UI or another script
      // that has access to the original CSV file

      console.log(`\n   💡 To re-import these rows:`)
      console.log(`      1. Find the original CSV file: ${session.fileName}`)
      console.log(`      2. Use the import page to re-import`)
      console.log(`      3. The system will skip duplicates but import rows with fixed data`)
      console.log(`\n   📋 Rows to re-import (${dataErrors.length} rows):`)
      
      for (const error of dataErrors.slice(0, 10)) {
        console.log(`      - Row ${error.row}: ${error.message}`)
      }
      
      if (dataErrors.length > 10) {
        console.log(`      ... and ${dataErrors.length - 10} more rows`)
      }
    }

    console.log(`\n✨ Re-import analysis completed!`)
    console.log(`\n💡 Note: This script identifies rows that should be re-imported.`)
    console.log(`   To actually re-import, use the import page with the original CSV file.`)

  } catch (error) {
    console.error('❌ Error during re-import analysis:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Get sessionId from command line args if provided
const sessionId = process.argv[2]

// Run the re-import analysis
reImportSkippedRows(sessionId)
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })



