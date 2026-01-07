import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndResumeImport() {
  try {
    console.log('Checking latest import session...\n')
    
    // Find the latest import session (most recent by startedAt)
    const latestSession = await prisma.importSession.findFirst({
      orderBy: {
        startedAt: 'desc',
      },
    })

    if (!latestSession) {
      console.log('No import session found.')
      return
    }

    console.log(`Found latest import session: ${latestSession.id}`)
    console.log(`Started at: ${latestSession.startedAt}`)
    console.log(`Status: ${latestSession.status}`)
    console.log(`File: ${latestSession.fileName}`)
    console.log(`Total rows: ${latestSession.totalRows}`)
    console.log(`Rows processed: ${latestSession.rowsProcessed}`)
    console.log(`Rows remaining: ${latestSession.totalRows - latestSession.rowsProcessed}`)
    
    if (latestSession.error) {
      console.log(`\nError: ${latestSession.error}`)
    }

    if (latestSession.status === 'failed' || latestSession.status === 'paused') {
      console.log(`\n⚠️  Import is ${latestSession.status}.`)
      console.log(`\nTo resume this import:`)
      console.log(`1. Go to the import CSV page in your browser`)
      console.log(`2. The import should automatically resume from row ${latestSession.rowsProcessed + 1}`)
      console.log(`\nOr use the API endpoint:`)
      console.log(`POST /api/import/csv/resume`)
      console.log(`Body: { "sessionId": "${latestSession.id}", "csvContent": "<your-csv-content>" }`)
      
      // Update status to in_progress so it can be resumed
      if (latestSession.status === 'failed') {
        console.log(`\nUpdating status from 'failed' to 'in_progress' to allow resume...`)
        await prisma.importSession.update({
          where: { id: latestSession.id },
          data: {
            status: 'in_progress',
          },
        })
        console.log(`✅ Status updated. Import can now be resumed.`)
      }
    } else if (latestSession.status === 'in_progress') {
      console.log(`\n✅ Import is still in progress.`)
      console.log(`Progress: ${latestSession.rowsProcessed}/${latestSession.totalRows} (${Math.round((latestSession.rowsProcessed / latestSession.totalRows) * 100)}%)`)
    } else if (latestSession.status === 'completed') {
      console.log(`\n✅ Import is already completed.`)
    } else if (latestSession.status === 'cancelled') {
      console.log(`\n⏹️  Import was cancelled.`)
    }

  } catch (error) {
    console.error('Error checking import session:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkAndResumeImport()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
