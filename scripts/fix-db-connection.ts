import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Testing database connection...\n')
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!\n')
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query test successful!\n')
    
    // Check if tables exist
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    
    console.log(`📊 Found ${tables.length} tables:`)
    tables.forEach(t => console.log(`   - ${t.tablename}`))
    console.log('')
    
    console.log('✅ Database is ready to use!')
    
  } catch (error: any) {
    console.error('❌ Database connection failed!\n')
    console.error('Error:', error.message)
    console.error('\n🔧 Troubleshooting steps:')
    console.error('1. Check your DATABASE_URL in .env file')
    console.error('2. Make sure it starts with: postgresql://')
    console.error('3. Verify your Neon database is active at https://console.neon.tech')
    console.error('4. Check if the connection string has the correct password')
    console.error('5. Try copying a fresh connection string from Neon dashboard')
    console.error('\n💡 To get a new connection string:')
    console.error('   1. Go to https://console.neon.tech')
    console.error('   2. Select your project')
    console.error('   3. Go to Connection Details')
    console.error('   4. Copy the connection string')
    console.error('   5. Update .env file')
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()






