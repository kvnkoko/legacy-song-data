import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking for admin user...')
  
  // Check if admin exists
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  })

  if (!admin) {
    console.log('❌ Admin user not found. Creating...')
    const passwordHash = await bcrypt.hash('admin123', 10)
    admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        name: 'Admin User',
        role: UserRole.ADMIN,
      },
    })
    console.log('✅ Admin user created!')
  } else {
    console.log('✅ Admin user exists')
    
    // Verify password
    const isValid = await bcrypt.compare('admin123', admin.passwordHash || '')
    if (!isValid) {
      console.log('⚠️  Password is incorrect. Resetting...')
      const passwordHash = await bcrypt.hash('admin123', 10)
      await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash },
      })
      console.log('✅ Password reset to: admin123')
    } else {
      console.log('✅ Password is correct')
    }
  }

  console.log('\n📋 Admin user details:')
  console.log('   Email:', admin.email)
  console.log('   Name:', admin.name)
  console.log('   Role:', admin.role)
  console.log('\n✅ You can now login with:')
  console.log('   Email: admin@example.com')
  console.log('   Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })






