import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking database connection and admin user...\n')
  
  try {
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connection successful\n')
    
    // Check if User table exists by trying to count
    try {
      const userCount = await prisma.user.count()
      console.log(`✅ User table exists (${userCount} users)\n`)
    } catch (e: any) {
      if (e.message.includes('does not exist')) {
        console.log('❌ User table does not exist!')
        console.log('   Run: npm run db:migrate')
        process.exit(1)
      }
      throw e
    }
    
    // Check for admin user
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    })
    
    if (!admin) {
      console.log('❌ Admin user not found. Creating...\n')
      const passwordHash = await bcrypt.hash('admin123', 10)
      admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash,
          name: 'Admin User',
          role: UserRole.ADMIN,
        },
      })
      console.log('✅ Admin user created!\n')
    } else {
      console.log('✅ Admin user exists\n')
      
      // Verify password
      if (!admin.passwordHash) {
        console.log('⚠️  Admin user has no password. Setting password...\n')
        const passwordHash = await bcrypt.hash('admin123', 10)
        admin = await prisma.user.update({
          where: { id: admin.id },
          data: { passwordHash },
        })
        console.log('✅ Password set to: admin123\n')
      } else {
        // Test password
        const isValid = await bcrypt.compare('admin123', admin.passwordHash)
        if (!isValid) {
          console.log('⚠️  Password is incorrect. Resetting...\n')
          const passwordHash = await bcrypt.hash('admin123', 10)
          admin = await prisma.user.update({
            where: { id: admin.id },
            data: { passwordHash },
          })
          console.log('✅ Password reset to: admin123\n')
        } else {
          console.log('✅ Password is correct\n')
        }
      }
    }
    
    console.log('📋 Admin User Details:')
    console.log('   ID:', admin.id)
    console.log('   Email:', admin.email)
    console.log('   Name:', admin.name)
    console.log('   Role:', admin.role)
    console.log('   Has Password:', !!admin.passwordHash)
    console.log('')
    
    // Test password one more time
    if (admin.passwordHash) {
      const testPassword = await bcrypt.compare('admin123', admin.passwordHash)
      console.log('🧪 Final Password Test:', testPassword ? '✅ PASS' : '❌ FAIL')
      console.log('')
    }
    
    console.log('✅ Everything is ready!')
    console.log('')
    console.log('🔑 Login Credentials:')
    console.log('   Email: admin@example.com')
    console.log('   Password: admin123')
    console.log('')
    console.log('🚀 You can now log in at http://localhost:3000/auth/signin')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('must start with the protocol')) {
      console.log('')
      console.log('💡 DATABASE_URL is still wrong!')
      console.log('   Run: npm run fix:env')
    } else if (error.message.includes('P1001') || error.message.includes('connect')) {
      console.log('')
      console.log('💡 Cannot connect to database!')
      console.log('   Check your DATABASE_URL in .env')
      console.log('   Make sure your Neon database is active')
    } else {
      console.log('')
      console.log('💡 Full error:', error)
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()






