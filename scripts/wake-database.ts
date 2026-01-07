/**
 * Script to wake up a paused Neon database
 * Neon databases auto-pause after inactivity and need to be woken up
 * 
 * Run with: npx tsx scripts/wake-database.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function wakeDatabase() {
  console.log('🔍 Attempting to wake up database...')
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'NOT SET')
  console.log('')

  let attempts = 0
  const maxAttempts = 5
  const delay = 2000 // 2 seconds between attempts

  while (attempts < maxAttempts) {
    attempts++
    console.log(`Attempt ${attempts}/${maxAttempts}...`)

    try {
      // Try a simple query to wake up the database
      const result = await prisma.$queryRaw`SELECT 1 as test`
      console.log('✅ Database is awake and connected!')
      console.log('Result:', result)
      
      // Test a real query
      const userCount = await prisma.user.count()
      console.log(`✅ Users table accessible. Total users: ${userCount}`)
      
      // Check for admin user
      const admin = await prisma.user.findUnique({
        where: { email: 'admin@example.com' },
      })
      
      if (admin) {
        console.log('✅ Admin user exists!')
        console.log(`   Email: ${admin.email}`)
        console.log(`   Role: ${admin.role}`)
      } else {
        console.log('⚠️  Admin user not found')
        console.log('   Run: npm run db:seed to create admin user')
      }
      
      return true
    } catch (error: any) {
      const errorMessage = error.message || ''
      
      if (errorMessage.includes("Can't reach database server")) {
        console.log(`   ⏳ Database might be paused. Waiting ${delay/1000}s before retry...`)
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        } else {
          console.log('')
          console.error('❌ Could not connect to database after', maxAttempts, 'attempts')
          console.log('')
          console.log('💡 Solutions:')
          console.log('1. Go to your Neon console: https://console.neon.tech')
          console.log('2. Check if your database is paused')
          console.log('3. Click "Resume" or "Wake up" on your database')
          console.log('4. Wait a few seconds, then try again')
          console.log('5. If still failing, get a fresh connection string from Neon')
          console.log('')
          console.log('Alternative: Try using the direct connection string (not pooler)')
          console.log('   In Neon console, copy the "Direct connection" string instead of "Pooler"')
          return false
        }
      } else if (errorMessage.includes('P1000')) {
        console.error('❌ Authentication failed')
        console.error('   Check your DATABASE_URL credentials')
        return false
      } else if (errorMessage.includes('P1001')) {
        console.error('❌ Cannot reach database server')
        console.error('   The database might be paused or the connection string is wrong')
        return false
      } else {
        console.error('❌ Unexpected error:', errorMessage)
        return false
      }
    }
  }

  return false
}

async function main() {
  try {
    const success = await wakeDatabase()
    if (success) {
      console.log('')
      console.log('✅ Database connection successful!')
      console.log('   You can now run other scripts like:')
      console.log('   - npx tsx scripts/add-preferences-column.ts')
      console.log('   - npx tsx scripts/clean-database-preserve-admin.ts')
    } else {
      process.exit(1)
    }
  } catch (error: any) {
    console.error('Fatal error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()


