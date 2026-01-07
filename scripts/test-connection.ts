import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  try {
    console.log('🔍 Testing database connection...')
    console.log('DATABASE_URL from env:', process.env.DATABASE_URL ? 'Set (hidden)' : 'NOT SET')
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful!')
    console.log('Result:', result)
    
    // Check if users table exists
    const userCount = await prisma.user.count()
    console.log(`✅ Users table exists. Total users: ${userCount}`)
    
    // Check for admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    })
    
    if (admin) {
      console.log('✅ Admin user exists!')
      console.log('   Email:', admin.email)
      console.log('   Name:', admin.name)
      console.log('   Role:', admin.role)
      console.log('   Has password:', !!admin.passwordHash)
    } else {
      console.log('❌ Admin user NOT found')
      console.log('   Run: npm run db:seed')
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('must start with the protocol')) {
      console.log('\n💡 The DATABASE_URL format is wrong.')
      console.log('   It should be: DATABASE_URL="postgresql://user:pass@host/db"')
      console.log('   Check for:')
      console.log('   - No "psql" command')
      console.log('   - No extra quotes inside')
      console.log('   - Starts with postgresql://')
    } else if (error.message.includes('P1001')) {
      console.log('\n💡 Cannot reach database server.')
      console.log('   Check:')
      console.log('   - Is your Neon database active?')
      console.log('   - Is the connection string correct?')
      console.log('   - Are there firewall/network issues?')
    } else if (error.message.includes('P1000')) {
      console.log('\n💡 Authentication failed.')
      console.log('   Check your database credentials in DATABASE_URL')
    } else {
      console.log('\n💡 Full error details:')
      console.log(error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

test()






