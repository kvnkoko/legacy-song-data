/**
 * Backfill A&R Assignments Script
 * 
 * This script goes through all releases that have rawRow data and assigns A&R employees
 * based on the assignedAR field from the original CSV import.
 * 
 * It will:
 * 1. Find all releases with rawRow data
 * 2. Extract assignedAR from rawRow using the mapping config
 * 3. Create/find users and employees for A&R names (exact name matching to avoid duplicates)
 * 4. Assign the A&R to the releases
 */

import { PrismaClient, EmployeeStatus } from '@prisma/client'
import { parseCommaSeparatedList, cleanARName, normalizeARName } from '../lib/csv-importer'

const prisma = new PrismaClient()

interface MappingConfig {
  columns: Array<{
    csvColumn: string
    targetField: string | null
    fieldType: 'submission' | 'song' | 'ignore'
    songIndex?: number
  }>
}

function extractAssignedARFromRawRow(rawRow: any): string | null {
  if (!rawRow || typeof rawRow !== 'object') return null

  // Try common column names for A&R assignment (case-insensitive search)
  const possibleColumnNames = [
    'assignedAR',
    'assigned A&R',
    'assigned a&r',
    'assigned ar',
    'A&R',
    'a&r',
    'AR',
    'ar',
    'Assigned A&R',
    'Assigned AR',
    'AssignedA&R',
    'AssignedAR',
    'assignedA&R',
    'assignedAR',
  ]

  // First, try exact key match (case-sensitive)
  for (const colName of possibleColumnNames) {
    if (rawRow[colName] && typeof rawRow[colName] === 'string' && rawRow[colName].trim()) {
      return rawRow[colName].trim()
    }
  }

  // If no exact match, try case-insensitive search
  const rawRowKeys = Object.keys(rawRow)
  for (const key of rawRowKeys) {
    const lowerKey = key.toLowerCase().trim()
    if (
      (lowerKey.includes('assigned') && (lowerKey.includes('ar') || lowerKey.includes('a&r'))) ||
      lowerKey === 'a&r' ||
      lowerKey === 'ar'
    ) {
      const value = rawRow[key]
      if (value && typeof value === 'string' && value.trim()) {
        return value.trim()
      }
    }
  }

  return null
}

async function findOrCreateAREmployee(arName: string): Promise<string | null> {
  if (!arName || arName.trim() === '') return null

  const cleanedName = cleanARName(arName) || arName.trim()
  if (!cleanedName) return null

  const normalizedName = normalizeARName(cleanedName)

  // First, try to find existing employee by EXACT name match (case-sensitive for exact matching)
  let existingEmployee = await prisma.employee.findFirst({
    where: {
      user: {
        name: cleanedName, // Exact match (case-sensitive)
      },
      status: EmployeeStatus.ACTIVE,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (existingEmployee) {
    console.log(`  ✓ Found existing A&R employee: "${cleanedName}" (ID: ${existingEmployee.id})`)
    return existingEmployee.id
  }

  // If not found by exact match, try case-insensitive
  existingEmployee = await prisma.employee.findFirst({
    where: {
      user: {
        name: { equals: cleanedName, mode: 'insensitive' },
      },
      status: EmployeeStatus.ACTIVE,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (existingEmployee) {
    console.log(`  ✓ Found existing A&R employee (case-insensitive): "${cleanedName}" -> "${existingEmployee.user.name}" (ID: ${existingEmployee.id})`)
    return existingEmployee.id
  }

  // Create new user and employee
  const baseEmail = `${normalizedName.replace(/\s+/g, '.')}@imported.local`
  let email = baseEmail
  let counter = 1
  const maxEmailAttempts = 100

  // Check if email exists and increment if needed
  while (counter < maxEmailAttempts && await prisma.user.findUnique({ 
    where: { email },
    select: { id: true },
  })) {
    email = `${baseEmail.split('@')[0]}+${counter}@imported.local`
    counter++
  }

  if (counter >= maxEmailAttempts) {
    email = `${baseEmail.split('@')[0]}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@imported.local`
  }

  try {
    // Create user with explicit select to avoid preferences column issue
    const newUser = await prisma.user.create({
      data: {
        email,
        name: cleanedName,
        role: 'A_R',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    // Create employee
    const employeeId = `AR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newEmployee = await prisma.employee.create({
      data: {
        userId: newUser.id,
        employeeId,
        status: EmployeeStatus.ACTIVE,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    console.log(`  ✨ Created new A&R employee: "${cleanedName}" (ID: ${newEmployee.id}, Email: ${email})`)
    return newEmployee.id
  } catch (error: any) {
    console.error(`  ✗ Failed to create A&R employee "${cleanedName}": ${error.message}`)
    
    // If user creation failed due to unique constraint, try to find existing
    if (error.code === 'P2002') {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      })
      
      if (existingUser) {
        const existingEmp = await prisma.employee.findFirst({
          where: { userId: existingUser.id },
          select: { id: true },
        })
        
        if (existingEmp) {
          console.log(`  ✓ Found existing employee after creation conflict: "${cleanedName}" (ID: ${existingEmp.id})`)
          return existingEmp.id
        }
      }
    }
    
    return null
  }
}

async function main() {
  console.log('🚀 Starting A&R Assignment Backfill\n')

  // Get all releases with rawRow data
  // Also get releases that might have A&R but we want to verify/update them
  const releases = await prisma.release.findMany({
    where: {
      rawRow: {
        not: null,
      },
    },
    select: {
      id: true,
      title: true,
      rawRow: true,
      assignedA_RId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc', // Process newest first
    },
    take: 10000, // Process in batches if needed
  })

  // Filter to only process releases without A&R or that we want to verify
  const releasesToProcess = releases.filter(r => !r.assignedA_RId)
  
  console.log(`📊 Found ${releases.length} total releases with rawRow data`)
  console.log(`📊 ${releasesToProcess.length} releases need A&R assignment\n`)

  if (releasesToProcess.length === 0) {
    console.log('✅ No releases need A&R assignment. Exiting.')
    await prisma.$disconnect()
    return
  }

  // Also get ImportSession data to help with mapping config if available
  const importSessions = await prisma.importSession.findMany({
    where: {
      status: 'completed',
    },
    select: {
      id: true,
      mappingConfig: true,
      startedAt: true,
    },
    orderBy: {
      startedAt: 'desc',
    },
    take: 10, // Get recent import sessions
  })

  let processed = 0
  let assigned = 0
  let skipped = 0
  let errors = 0
  let updated = 0

  for (const release of releasesToProcess) {
    try {
      processed++
      const rawRow = release.rawRow as any

      if (!rawRow || typeof rawRow !== 'object') {
        skipped++
        continue
      }

      // Extract A&R value from rawRow
      // First try with mapping config from import sessions if available
      let assignedARValue: string | null = null
      
      // Try to find matching import session and use its mapping config
      for (const session of importSessions) {
        if (session.mappingConfig && typeof session.mappingConfig === 'object') {
          const mappingConfig = session.mappingConfig as any
          if (mappingConfig.columns && Array.isArray(mappingConfig.columns)) {
            const assignedARMapping = mappingConfig.columns.find(
              (col: any) => col.targetField === 'assignedAR' && col.fieldType === 'submission'
            )
            if (assignedARMapping && rawRow[assignedARMapping.csvColumn]) {
              assignedARValue = rawRow[assignedARMapping.csvColumn].trim()
              break
            }
          }
        }
      }
      
      // Fallback to direct extraction if mapping config didn't work
      if (!assignedARValue) {
        assignedARValue = extractAssignedARFromRawRow(rawRow)
      }

      if (!assignedARValue) {
        skipped++
        if (processed % 100 === 0) {
          console.log(`  [${processed}/${releases.length}] Skipped "${release.title}" - No A&R data found`)
        }
        continue
      }

      console.log(`\n[${processed}/${releases.length}] Processing: "${release.title}"`)
      console.log(`  A&R value from CSV: "${assignedARValue}"`)

      // Parse comma-separated A&R names
      const arNames = parseCommaSeparatedList(assignedARValue)
      
      if (arNames.length === 0) {
        skipped++
        console.log(`  ⚠️  No valid A&R names found after parsing`)
        continue
      }

      // Get the first A&R (primary)
      const primaryARName = arNames[0]
      const employeeId = await findOrCreateAREmployee(primaryARName)

      if (!employeeId) {
        errors++
        console.log(`  ✗ Failed to find or create A&R employee for "${primaryARName}"`)
        continue
      }

      // Check if release already has this A&R assigned
      if (release.assignedA_RId === employeeId) {
        console.log(`  ℹ️  Release already has this A&R assigned`)
        continue
      }

      // Update the release with A&R assignment
      await prisma.release.update({
        where: { id: release.id },
        data: {
          assignedA_RId: employeeId,
        },
      })

      if (release.assignedA_RId) {
        updated++
        console.log(`  🔄 Updated A&R assignment to "${primaryARName}" for release "${release.title}"`)
      } else {
        assigned++
        console.log(`  ✅ Assigned A&R "${primaryARName}" to release "${release.title}"`)
      }

      // Progress update every 50 releases
      if (processed % 50 === 0) {
        console.log(`\n📊 Progress: ${processed}/${releasesToProcess.length} processed, ${assigned} assigned, ${updated} updated, ${skipped} skipped, ${errors} errors\n`)
      }
    } catch (error: any) {
      errors++
      console.error(`\n✗ Error processing release "${release.title}": ${error.message}`)
      if (error.stack) {
        console.error(error.stack)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ A&R Assignment Backfill Complete')
  console.log('='.repeat(60))
  console.log(`📊 Summary:`)
  console.log(`   - Total releases processed: ${processed}`)
  console.log(`   - Successfully assigned: ${assigned}`)
  console.log(`   - Updated assignments: ${updated}`)
  console.log(`   - Skipped (no A&R data): ${skipped}`)
  console.log(`   - Errors: ${errors}`)
  console.log('='.repeat(60) + '\n')

  await prisma.$disconnect()
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

