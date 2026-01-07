const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteTable(tableName) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`)
    return true
  } catch (error) {
    if (error.message.includes('does not exist')) {
      return false
    }
    throw error
  }
}

async function deleteAllReleases() {
  try {
    console.log('Starting to delete all releases using raw SQL...')
    
    // Delete in order to respect foreign key constraints using raw SQL
    const tables = [
      'TrackArtist',
      'ReleaseArtist',
      'PlatformRequest',
      'Comment',
      'AuditLog',
      'ImportAttachment',
      'Track',
      'Release'
    ]
    
    for (const table of tables) {
      console.log(`Deleting ${table}...`)
      const deleted = await deleteTable(table)
      if (deleted) {
        console.log(`✅ Deleted from ${table}`)
      } else {
        console.log(`⚠️  Table ${table} does not exist (skipping)`)
      }
    }
    
    console.log('\n✅ Successfully deleted all releases and related data!')
  } catch (error) {
    console.error('❌ Error deleting releases:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllReleases()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to delete releases:', error.message)
    process.exit(1)
  })

