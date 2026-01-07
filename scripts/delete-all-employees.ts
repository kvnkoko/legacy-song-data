/**
 * Script to delete all employees and associated users
 * 
 * WARNING: This is a destructive operation that will delete:
 * - All employees
 * - All associated users (cascade delete)
 * - All employee relationships (reportingTo, reports)
 * 
 * Usage: npx tsx scripts/delete-all-employees.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllEmployees() {
  console.log('🗑️  Starting deletion of all employees...\n')

  try {
    // Get count before deletion
    const employeeCount = await prisma.employee.count()
    console.log(`📊 Found ${employeeCount} employees to delete\n`)

    if (employeeCount === 0) {
      console.log('✅ No employees found. Nothing to delete.')
      return
    }

    // Delete all employees (this will cascade delete users due to onDelete: Cascade)
    console.log('🗑️  Deleting all employees...')
    const result = await prisma.employee.deleteMany({})
    
    console.log(`✅ Deleted ${result.count} employees`)
    console.log(`✅ Associated users were also deleted (cascade)`)

    // Verify deletion
    const remainingCount = await prisma.employee.count()
    if (remainingCount === 0) {
      console.log('\n✨ All employees successfully deleted!')
    } else {
      console.warn(`\n⚠️  Warning: ${remainingCount} employees still remain`)
    }
  } catch (error) {
    console.error('❌ Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deletion
deleteAllEmployees()
  .then(() => {
    console.log('\n🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
