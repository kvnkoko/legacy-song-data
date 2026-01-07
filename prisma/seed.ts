import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user (always update password to ensure it's correct)
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  })

  // Create A&R user
  const arPassword = await bcrypt.hash('ar123', 10)
  const ar = await prisma.user.upsert({
    where: { email: 'ar@example.com' },
    update: {},
    create: {
      email: 'ar@example.com',
      passwordHash: arPassword,
      name: 'A&R User',
      role: UserRole.A_R,
    },
  })

  // Create platform user
  const platformPassword = await bcrypt.hash('platform123', 10)
  const platform = await prisma.user.upsert({
    where: { email: 'youtube@example.com' },
    update: {},
    create: {
      email: 'youtube@example.com',
      passwordHash: platformPassword,
      name: 'YouTube Team',
      role: UserRole.PLATFORM_YOUTUBE,
    },
  })

  console.log('Seeded users:', { admin, ar, platform })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })






