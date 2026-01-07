/**
 * Migration script to add User.preferences column if it doesn't exist
 * This ensures the database schema matches the Prisma schema
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking if User.preferences column exists...')

  try {
    // Try to query the preferences column
    // If it doesn't exist, this will throw an error
    await prisma.$queryRaw`
      SELECT preferences FROM "User" LIMIT 1
    `
    console.log('✅ User.preferences column already exists')
  } catch (error: any) {
    // Column doesn't exist, create it
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      console.log('📝 User.preferences column not found. Creating it...')
      
      try {
        await prisma.$executeRaw`
          ALTER TABLE "User" ADD COLUMN IF NOT EXISTS preferences JSONB
        `
        console.log('✅ Successfully added User.preferences column')
      } catch (createError: any) {
        console.error('❌ Failed to create User.preferences column:', createError.message)
        throw createError
      }
    } else {
      // Some other error occurred
      console.error('❌ Unexpected error:', error.message)
      throw error
    }
  }

  console.log('✅ Migration complete!')
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



