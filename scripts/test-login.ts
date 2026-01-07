import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testLogin() {
  try {
    console.log('🧪 Testing login credentials...\n')
    
    const email = 'admin@example.com'
    const password = 'admin123'
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    
    if (!user) {
      console.log('❌ User not found!')
      console.log('   Run: npm run ensure:admin')
      return
    }
    
    console.log('✅ User found:')
    console.log('   ID:', user.id)
    console.log('   Email:', user.email)
    console.log('   Name:', user.name)
    console.log('   Role:', user.role)
    console.log('   Has password hash:', !!user.passwordHash)
    console.log('')
    
    if (!user.passwordHash) {
      console.log('❌ User has no password hash!')
      console.log('   Run: npm run ensure:admin')
      return
    }
    
    // Test password
    console.log('🔐 Testing password...')
    const isValid = await bcrypt.compare(password, user.passwordHash)
    
    if (isValid) {
      console.log('✅ Password is CORRECT!')
      console.log('')
      console.log('💡 If login still fails, check:')
      console.log('   1. Server terminal for auth debug messages')
      console.log('   2. NEXTAUTH_SECRET is set in .env')
      console.log('   3. Restart dev server after fixing .env')
    } else {
      console.log('❌ Password is WRONG!')
      console.log('   The password hash doesn\'t match "admin123"')
      console.log('   Run: npm run ensure:admin')
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('must start with the protocol')) {
      console.log('   Run: npm run fix:env')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testLogin()






