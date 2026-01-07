/**
 * Script to fix incorrect data from CSV imports:
 * 1. Employees created from notes content (should be deleted or fixed)
 * 2. A&R assignments that contain notes content (should be moved to release.notes)
 * 
 * Run with: npx tsx scripts/fix-incorrect-import-data.ts [--dry-run]
 * 
 * Use --dry-run to preview changes without making them
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--dryrun')

// Patterns that indicate notes-like content (same as in CSV importer)
function isNotesLikeContent(text: string): boolean {
  if (!text || !text.trim()) return false
  
  const trimmed = text.trim()
  
  // Very long text is likely notes
  if (trimmed.length > 100) return true
  
  // Multiple sentences (more than 2)
  if (trimmed.includes('. ') && trimmed.split('. ').length > 2) return true
  
  // Common note prefixes
  if (/^(please|note|note:|important|warning|reminder|will whitelist)/i.test(trimmed)) return true
  
  // Copyright notes (without "status")
  if (trimmed.toLowerCase().includes('copyright') && !trimmed.toLowerCase().includes('status')) return true
  
  // Contains URLs (likely notes)
  if (/https?:\/\//i.test(trimmed)) return true
  
  // Contains email addresses (likely notes)
  if (/@/.test(trimmed)) return true
  
  // Very long single word (likely notes)
  if (trimmed.split(/\s+/).length === 1 && trimmed.length > 50) return true
  
  return false
}

// Check if a name looks like it came from CSV concatenation or wrong column
function isCSVConcatenation(name: string): boolean {
  if (!name || !name.trim()) return false
  
  const trimmed = name.trim()
  
  // Contains multiple commas (CSV concatenation)
  if ((trimmed.match(/,/g) || []).length >= 2) return true
  
  // Contains timestamp patterns (e.g., "2024 10:50 AM", "2024.1050")
  if (/\d{4}[\s.]?\d{1,2}:?\d{2}/.test(trimmed)) return true
  if (/\d{4}\.\d{4}/.test(trimmed)) return true // Pattern like "2024.1050"
  
  // Contains status values that shouldn't be names
  const statusValues = [
    'uploaded', 'pending', 'rejected', 'yes', 'no', 'monetization',
    'music video', 'lyrics video', 'none', 'flow', 'youtube', 'facebook',
    'tiktok', 'ringtunes', 'international streaming', 'original', 'cover',
    'single', 'album', 'done', 'am', 'pm'
  ]
  const lowerName = trimmed.toLowerCase()
  if (statusValues.some(status => lowerName === status || lowerName.includes(`,${status},`) || lowerName.includes(`,${status}`))) {
    return true
  }
  
  // Contains auto-generated email pattern (@ar.imported.local)
  if (/@ar\.imported\.local/i.test(trimmed)) return true
  
  // Contains multiple consecutive dots (auto-generated email pattern)
  if (/\.{2,}/.test(trimmed)) return true
  
  // Contains date patterns (e.g., "15-Jan-25", "01/15/25")
  if (/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(trimmed)) return true
  
  // Contains platform names as standalone or in concatenation
  const platforms = ['flow', 'youtube', 'facebook', 'tiktok', 'ringtunes', 'vuclip']
  if (platforms.some(platform => {
    const regex = new RegExp(`(^|,|\\s)${platform}(,|$|\\s)`, 'i')
    return regex.test(trimmed)
  })) {
    // But allow if it's part of a valid name like "YouTube Manager"
    const words = trimmed.split(/\s+/)
    if (words.length === 1 || words.every(w => platforms.includes(w.toLowerCase()))) {
      return true
    }
  }
  
  return false
}

// Check if a name looks like a valid employee name
function isValidEmployeeName(name: string): boolean {
  if (!name || !name.trim()) return false
  
  const trimmed = name.trim()
  
  // Too long
  if (trimmed.length > 50) return false
  
  // Contains notes-like patterns
  if (isNotesLikeContent(trimmed)) return false
  
  // Contains CSV concatenation patterns
  if (isCSVConcatenation(trimmed)) return false
  
  // Valid names are typically 2-50 chars, may contain spaces, hyphens, periods
  // Should not contain special characters like @, http, etc.
  if (/[@#]/.test(trimmed)) return false
  if (/https?:\/\//i.test(trimmed)) return false
  
  // Should contain at least one letter (not just numbers/special chars)
  if (!/[a-zA-Z]/.test(trimmed)) return false
  
  // Should not be just numbers, dates, or status codes
  if (/^[\d\s\-_.,:]+$/.test(trimmed)) return false
  
  return true
}

async function main() {
  console.log('🔍 Starting cleanup of incorrect import data...\n')
  
  // Step 1: Find employees created from incorrect columns (notes, status values, timestamps, etc.)
  console.log('Step 1: Finding employees with incorrect names (from wrong columns)...')
  const allEmployees = await prisma.employee.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          createdAt: true,
        },
      },
      assignedReleases: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })
  
  const incorrectEmployees: Array<{
    employee: typeof allEmployees[0]
    reason: string
  }> = []
  
  for (const employee of allEmployees) {
    const userName = employee.user?.name || ''
    const userEmail = employee.user?.email || ''
    
    // Check both name and email for patterns
    let reason = ''
    if (!isValidEmployeeName(userName)) {
      if (isNotesLikeContent(userName)) {
        reason = 'Contains notes-like content'
      } else if (isCSVConcatenation(userName)) {
        reason = 'Contains CSV concatenation patterns (timestamps, status values, etc.)'
      } else if (/@ar\.imported\.local/i.test(userEmail)) {
        reason = 'Auto-generated email from invalid name'
      } else {
        reason = 'Invalid name format'
      }
      
      incorrectEmployees.push({
        employee,
        reason,
      })
    } else if (/@ar\.imported\.local/i.test(userEmail)) {
      // Auto-generated email means this was definitely created from CSV import
      // Even if name looks valid, it's likely from wrong column
      // Be more aggressive: any employee with @ar.imported.local is suspicious
      if (isCSVConcatenation(userName) || userName.length > 30 || !/[a-zA-Z]{2,}/.test(userName) || userName.includes(',') || /\d{4}/.test(userName)) {
        incorrectEmployees.push({
          employee,
          reason: 'Auto-generated email suggests name came from wrong column',
        })
      } else {
        // Even if name looks somewhat valid, if email is auto-generated, it's likely wrong
        // Check for subtle patterns like timestamps, status words, etc.
        const lowerName = userName.toLowerCase()
        const suspiciousWords = ['uploaded', 'pending', 'rejected', 'yes', 'no', 'music', 'video', 'lyrics', 'flow', 'youtube', 'facebook', 'tiktok', 'am', 'pm']
        if (suspiciousWords.some(word => lowerName.includes(word)) && userName.length < 15) {
          incorrectEmployees.push({
            employee,
            reason: 'Auto-generated email + suspicious words in name (likely from status/type columns)',
          })
        }
      }
    }
  }
  
  console.log(`   Found ${incorrectEmployees.length} incorrect employees\n`)
  
  // Additional check: Find ALL employees with auto-generated emails that might have been missed
  // These are employees created during CSV import - if they have @ar.imported.local, they're suspicious
  const allAutoGeneratedEmployees = allEmployees.filter(emp => {
    const email = emp.user?.email || ''
    return /@ar\.imported\.local/i.test(email) && !incorrectEmployees.find(ie => ie.employee.id === emp.id)
  })
  
  if (allAutoGeneratedEmployees.length > 0) {
    console.log(`   ⚠️  Found ${allAutoGeneratedEmployees.length} additional employees with auto-generated emails`)
    console.log(`      (These may be valid but were created during import - reviewing...)`)
    
    // Check these more carefully - they might be valid employees created during import
    for (const emp of allAutoGeneratedEmployees) {
      const name = emp.user?.name || ''
      // If name contains suspicious patterns, add to incorrect list
      if (name.includes(',') || /\d{4}/.test(name) || name.length > 30 || !/[a-zA-Z]{2,}/.test(name)) {
        incorrectEmployees.push({
          employee: emp,
          reason: 'Auto-generated email + suspicious name patterns',
        })
      }
    }
    
    console.log(`   After review: ${incorrectEmployees.length} total incorrect employees\n`)
  }
  
  // Step 2: Find releases with notes-like A&R assignments
  console.log('Step 2: Finding releases with notes-like A&R assignments...')
  const releasesWithAR = await prisma.release.findMany({
    where: {
      assignedA_RId: {
        not: null,
      },
    },
    include: {
      assignedA_R: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })
  
  const releasesToFix: Array<{
    release: typeof releasesWithAR[0]
    reason: string
  }> = []
  
  for (const release of releasesWithAR) {
    const arName = release.assignedA_R?.user?.name || ''
    const arEmail = release.assignedA_R?.user?.email || ''
    
    // Check if A&R assignment is incorrect
    const hasAutoGeneratedEmail = /@ar\.imported\.local/i.test(arEmail)
    const isInvalidName = !isValidEmployeeName(arName)
    
    if (isNotesLikeContent(arName) || isCSVConcatenation(arName) || (hasAutoGeneratedEmail && isInvalidName)) {
      let reason = ''
      if (hasAutoGeneratedEmail) {
        reason = 'A&R has auto-generated email (likely from wrong column)'
      } else if (isCSVConcatenation(arName)) {
        reason = 'A&R name contains CSV concatenation patterns'
      } else {
        reason = 'A&R assignment contains notes content'
      }
      
      releasesToFix.push({
        release,
        reason,
      })
    }
  }
  
  console.log(`   Found ${releasesToFix.length} releases with notes-like A&R assignments\n`)
  
  // Step 3: Display findings and ask for confirmation
  console.log('\n📊 SUMMARY OF FINDINGS:\n')
  console.log(`   Incorrect Employees: ${incorrectEmployees.length}`)
  if (incorrectEmployees.length > 0) {
    console.log('   Examples:')
    incorrectEmployees.slice(0, 5).forEach(({ employee, reason }) => {
      console.log(`     - "${employee.user?.name}" (${reason})`)
      console.log(`       Email: ${employee.user?.email}`)
      console.log(`       Assigned to ${employee.assignedReleases.length} releases`)
    })
    if (incorrectEmployees.length > 5) {
      console.log(`     ... and ${incorrectEmployees.length - 5} more`)
    }
  }
  
  console.log(`\n   Releases to Fix: ${releasesToFix.length}`)
  if (releasesToFix.length > 0) {
    console.log('   Examples:')
    releasesToFix.slice(0, 5).forEach(({ release, reason }) => {
      const arName = release.assignedA_R?.user?.name || 'N/A'
      console.log(`     - Release: "${release.title}"`)
      console.log(`       Current A&R: "${arName}" (${reason})`)
      console.log(`       Current Notes: ${release.notes ? `"${release.notes.substring(0, 50)}..."` : 'None'}`)
    })
    if (releasesToFix.length > 5) {
      console.log(`     ... and ${releasesToFix.length - 5} more`)
    }
  }
  
  // Step 4: Perform fixes
  if (isDryRun) {
    console.log('\n\n🔍 DRY RUN MODE - No changes will be made\n')
  } else {
    console.log('\n\n🔧 FIXING DATA...\n')
  }
  
  let fixedReleases = 0
  let removedARAssignments = 0
  
  // Fix releases: Move notes content from A&R assignment to release.notes
  for (const { release } of releasesToFix) {
    const arName = release.assignedA_R?.user?.name || ''
    const currentNotes = release.notes || ''
    
    // Combine current notes with the notes content from A&R assignment
    const newNotes = currentNotes 
      ? `${currentNotes}\n\n[Auto-moved from A&R assignment]: ${arName}`
      : `[Auto-moved from A&R assignment]: ${arName}`
    
    if (!isDryRun) {
      await prisma.release.update({
        where: { id: release.id },
        data: {
          notes: newNotes,
          assignedA_RId: null, // Remove incorrect A&R assignment
        },
      })
    }
    
    fixedReleases++
    removedARAssignments++
  }
  
  if (isDryRun) {
    console.log(`   📋 Would fix ${fixedReleases} releases (move notes content and remove incorrect A&R assignments)`)
  } else {
    console.log(`   ✅ Fixed ${fixedReleases} releases (moved notes content and removed incorrect A&R assignments)`)
  }
  
  // Step 5: Handle incorrect employees
  // Option 1: Delete employees that have no assigned releases
  // Option 2: Keep employees but mark them for review
  
  let deletedEmployees = 0
  let employeesToReview = 0
  
  for (const { employee } of incorrectEmployees) {
    if (employee.assignedReleases.length === 0) {
      // Safe to delete - no releases assigned
      if (!isDryRun) {
        await prisma.employee.delete({
          where: { id: employee.id },
        })
        // User will be cascade deleted
      }
      deletedEmployees++
    } else {
      // Has assigned releases - mark for review
      employeesToReview++
      console.log(`   ⚠️  Employee "${employee.user?.name}" has ${employee.assignedReleases.length} assigned releases - needs manual review`)
    }
  }
  
  if (isDryRun) {
    console.log(`   📋 Would delete ${deletedEmployees} employees with no assigned releases`)
  } else {
    console.log(`   ✅ Deleted ${deletedEmployees} employees with no assigned releases`)
  }
  if (employeesToReview > 0) {
    console.log(`   ⚠️  ${employeesToReview} employees need manual review (they have assigned releases)`)
  }
  
  if (isDryRun) {
    console.log('\n✅ Dry run complete! No changes were made.\n')
    console.log('📋 PREVIEW SUMMARY:')
    console.log(`   - Would fix releases: ${fixedReleases}`)
    console.log(`   - Would remove A&R assignments: ${removedARAssignments}`)
    console.log(`   - Would delete employees: ${deletedEmployees}`)
    console.log(`   - Employees needing review: ${employeesToReview}`)
    console.log('\n💡 Run without --dry-run to apply these changes')
  } else {
    console.log('\n✅ Cleanup complete!\n')
    console.log('📋 FINAL SUMMARY:')
    console.log(`   - Fixed releases: ${fixedReleases}`)
    console.log(`   - Removed A&R assignments: ${removedARAssignments}`)
    console.log(`   - Deleted employees: ${deletedEmployees}`)
    console.log(`   - Employees needing review: ${employeesToReview}`)
  }
  
  // List employees that need manual review
  if (employeesToReview > 0) {
    console.log('\n⚠️  EMPLOYEES REQUIRING MANUAL REVIEW:')
    for (const { employee } of incorrectEmployees) {
      if (employee.assignedReleases.length > 0) {
        console.log(`   - "${employee.user?.name}" (${employee.user?.email})`)
        console.log(`     Assigned to ${employee.assignedReleases.length} releases:`)
        employee.assignedReleases.slice(0, 3).forEach(release => {
          console.log(`       - "${release.title}"`)
        })
        if (employee.assignedReleases.length > 3) {
          console.log(`       ... and ${employee.assignedReleases.length - 3} more`)
        }
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
