const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    })

    if (!user) {
      console.log('❌ User admin@example.com not found!')
      console.log('Run: npm run db:seed')
      return
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: !!user.passwordHash,
    })

    // Test password
    if (user.passwordHash) {
      const isValid = await bcrypt.compare('admin123', user.passwordHash)
      console.log('Password check (admin123):', isValid ? '✅ Valid' : '❌ Invalid')
    } else {
      console.log('⚠️  No password hash found')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUser()






