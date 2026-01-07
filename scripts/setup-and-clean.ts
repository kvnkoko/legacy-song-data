/**
 * Comprehensive setup and cleanup script
 * 1. Tests database connection
 * 2. Ensures User.preferences column exists
 * 3. Cleans database while preserving admin user
 * 
 * Run with: npx tsx scripts/setup-and-clean.ts
 */

import { prisma } from '../lib/db'
import { checkDatabaseConnection } from '../lib/db'

async function testConnection() {
  console.log('🔍 Testing database connection...\n')
  
  const isConnected = await checkDatabaseConnection()
  
  if (!isConnected) {
    console.error('❌ Cannot connect to database!')
    console.error('\nPlease check:')
    console.error('1. Your DATABASE_URL in .env file')
    console.error('2. That your Neon database is active')
    console.error('3. Your network connection')
    console.error('\nRun: npm run db:test to test connection')
    process.exit(1)
  }
  
  console.log('✅ Database connection successful!\n')
}

async function ensurePreferencesColumn() {
  console.log('🔍 Checking if User.preferences column exists...')
  
  try {
    await prisma.$queryRaw`
      SELECT preferences FROM "User" LIMIT 1
    `
    console.log('✅ User.preferences column already exists\n')
  } catch (error: any) {
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      console.log('📝 User.preferences column not found. Creating it...')
      try {
        await prisma.$executeRaw`
          ALTER TABLE "User" ADD COLUMN IF NOT EXISTS preferences JSONB
        `
        console.log('✅ Successfully added User.preferences column\n')
      } catch (createError: any) {
        console.error('❌ Failed to create User.preferences column:', createError.message)
        throw createError
      }
    } else {
      console.error('❌ Unexpected error checking preferences column:', error.message)
      throw error
    }
  }
}

async function main() {
  try {
    // Step 1: Test connection
    await testConnection()
    
    // Step 2: Ensure preferences column exists
    await ensurePreferencesColumn()
    
    // Step 3: Run cleanup
    console.log('🧹 Running database cleanup...\n')
    const { execSync } = require('child_process')
    execSync('npx tsx scripts/clean-database-preserve-admin.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    console.log('\n✅ Setup and cleanup complete!')
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()


