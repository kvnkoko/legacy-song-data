import { prisma } from '../lib/db'

async function deleteAllUsersExceptAdmin() {
  try {
    console.log('Starting to delete all users except admin...')
    
    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
    })

    if (!adminUser) {
      console.error('ERROR: No admin user found. Aborting deletion.')
      throw new Error('No admin user found')
    }

    console.log(`Found admin user: ${adminUser.email} (ID: ${adminUser.id})`)
    console.log('This user will be preserved.')

    // Delete all users except admin
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: {
          not: adminUser.id,
        },
      },
    })

    console.log(`Successfully deleted ${deletedUsers.count} users.`)
    console.log(`Admin user (${adminUser.email}) preserved.`)
  } catch (error) {
    console.error('Error deleting users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllUsersExceptAdmin()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to delete users:', error)
    process.exit(1)
  })



