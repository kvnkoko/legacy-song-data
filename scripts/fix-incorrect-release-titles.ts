/**
 * Script to fix incorrect release titles from CSV imports:
 * 1. Titles that came from platform columns (e.g., "All music platforms except SPO...")
 * 2. Titles that came from notes columns
 * 3. Titles that came from status/type columns
 * 4. Titles that are CSV concatenations
 * 
 * Run with: npx tsx scripts/fix-incorrect-release-titles.ts [--dry-run]
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

// Check if title looks like it came from platform/status columns
function isPlatformOrStatusContent(title: string): boolean {
  if (!title || !title.trim()) return false
  
  const trimmed = title.trim().toLowerCase()
  
  // Platform-related phrases - these should NOT be in release titles
  const platformPhrases = [
    'all music platforms',
    'music platforms',
    'platform',
    'except',
    'spo',
    'spotify',
    'youtube',
    'facebook',
    'tiktok',
    'flow',
    'ringtunes',
    'international streaming',
    'vuclip',
    'uploaded',
    'pending',
    'rejected',
    'yes',
    'no',
    'monetization',
    'the licensee will be',
    'music video',
    'lyrics video',
    'none',
    'original',
    'cover',
    'international',
    'single',
    'album',
  ]
  
  // Check if title starts with platform phrases (definite wrong column)
  if (platformPhrases.some(phrase => trimmed.startsWith(phrase))) {
    return true
  }
  
  // Check if title contains "all music platforms" or "except" (definite platform column)
  if (trimmed.includes('all music platforms') || trimmed.includes('except')) {
    return true
  }
  
  // Check if title contains platform phrases
  if (platformPhrases.some(phrase => trimmed.includes(phrase))) {
    // If the title is mostly platform words, it's likely wrong
    const words = trimmed.split(/\s+/)
    const platformWordCount = words.filter(w => 
      platformPhrases.some(phrase => w.includes(phrase) || phrase.includes(w))
    ).length
    
    // If more than 30% of words are platform words, it's likely wrong
    if (platformWordCount / words.length > 0.3) {
      return true
    }
    
    // If title contains multiple platform words, it's likely wrong
    if (platformWordCount >= 2) {
      return true
    }
  }
  
  // Contains status values as standalone or in concatenation
  const statusValues = ['uploaded', 'pending', 'rejected', 'yes', 'no', 'monetization']
  if (statusValues.some(status => {
    const regex = new RegExp(`(^|,|\\s)${status}(,|$|\\s)`, 'i')
    return regex.test(trimmed)
  })) {
    // But allow if it's part of a valid title
    if (trimmed.length < 20 && statusValues.some(status => trimmed === status)) {
      return true
    }
  }
  
  return false
}

// Check if title looks like CSV concatenation
function isCSVConcatenation(title: string): boolean {
  if (!title || !title.trim()) return false
  
  const trimmed = title.trim()
  
  // Contains multiple commas (CSV concatenation)
  if ((trimmed.match(/,/g) || []).length >= 2) return true
  
  // Contains timestamp patterns
  if (/\d{4}[\s.]?\d{1,2}:?\d{2}/.test(trimmed)) return true
  if (/\d{4}\.\d{4}/.test(trimmed)) return true
  
  // Contains date patterns
  if (/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(trimmed)) return true
  
  // Contains multiple consecutive dots (auto-generated pattern)
  if (/\.{2,}/.test(trimmed)) return true
  
  return false
}

// Check if title is likely from wrong column
function isIncorrectReleaseTitle(title: string): boolean {
  if (!title || !title.trim()) return false
  
  const trimmed = title.trim()
  
  // Too long (likely notes or concatenation)
  if (trimmed.length > 150) return true
  
  // Contains notes-like patterns
  if (isNotesLikeContent(trimmed)) return true
  
  // Contains platform/status content
  if (isPlatformOrStatusContent(trimmed)) return true
  
  // Contains CSV concatenation patterns
  if (isCSVConcatenation(trimmed)) return true
  
  // Contains special characters that shouldn't be in titles
  if (/[@#]/.test(trimmed)) return true
  if (/https?:\/\//i.test(trimmed)) return true
  
  // Should contain at least one letter (not just numbers/special chars)
  if (!/[a-zA-Z]/.test(trimmed)) return false
  
  // Should not be just numbers, dates, or status codes
  if (/^[\d\s\-_.,:]+$/.test(trimmed)) return false
  
  return false
}

// Determine the reason for incorrectness
function getIncorrectReason(title: string): string {
  if (isNotesLikeContent(title)) {
    return 'Contains notes-like content'
  } else if (isPlatformOrStatusContent(title)) {
    return 'Contains platform/status content (likely from wrong column)'
  } else if (isCSVConcatenation(title)) {
    return 'Contains CSV concatenation patterns'
  } else if (title.length > 150) {
    return 'Too long (likely from wrong column)'
  } else {
    return 'Invalid title format'
  }
}

async function main() {
  console.log('🔍 Starting cleanup of incorrect release titles...\n')
  
  // Step 1: Find all releases with potentially incorrect titles
  console.log('Step 1: Finding releases with incorrect titles...')
  const allReleases = await prisma.release.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      notes: true,
      rawRow: true, // This might contain the original CSV data
      artist: {
        select: {
          name: true,
        },
      },
      tracks: {
        select: {
          name: true,
        },
      },
    },
  })
  
  const incorrectReleases: Array<{
    release: typeof allReleases[0]
    reason: string
    suggestedFix?: string
  }> = []
  
  for (const release of allReleases) {
    const title = release.title || ''
    
    if (isIncorrectReleaseTitle(title)) {
      const reason = getIncorrectReason(title)
      
      // Try to find a better title from tracks or rawRow
      let suggestedFix: string | undefined
      
      // Check if we have tracks - use first track name as potential title
      if (release.tracks && release.tracks.length > 0) {
        const firstTrackName = release.tracks[0].name
        if (firstTrackName && !isIncorrectReleaseTitle(firstTrackName) && firstTrackName.length < 100) {
          suggestedFix = firstTrackName
        }
      }
      
      // Check rawRow for potential correct title
      if (release.rawRow && typeof release.rawRow === 'object') {
        const rawRow = release.rawRow as Record<string, any>
        
        // Look for columns that might contain the actual release title
        const potentialTitleColumns = [
          'album name',
          'album or single name',
          'release title',
          'release name',
          'single name',
          'song 1 name',
          'song 1 title',
          'track 1 name',
        ]
        
        for (const [key, value] of Object.entries(rawRow)) {
          const keyLower = key.toLowerCase()
          if (potentialTitleColumns.some(col => keyLower.includes(col)) && value && typeof value === 'string') {
            const valueStr = value.trim()
            if (valueStr && !isIncorrectReleaseTitle(valueStr) && valueStr.length < 100) {
              suggestedFix = valueStr
              break
            }
          }
        }
      }
      
      incorrectReleases.push({
        release,
        reason,
        suggestedFix,
      })
    }
  }
  
  console.log(`   Found ${incorrectReleases.length} releases with incorrect titles\n`)
  
  // Step 2: Display findings
  console.log('\n📊 SUMMARY OF FINDINGS:\n')
  console.log(`   Incorrect Release Titles: ${incorrectReleases.length}`)
  if (incorrectReleases.length > 0) {
    console.log('   Examples:')
    incorrectReleases.slice(0, 10).forEach(({ release, reason, suggestedFix }) => {
      console.log(`     - "${release.title}" (${reason})`)
      console.log(`       Artist: ${release.artist.name}`)
      console.log(`       Tracks: ${release.tracks.length}`)
      if (suggestedFix) {
        console.log(`       Suggested fix: "${suggestedFix}"`)
      } else {
        console.log(`       No suggested fix available - will move to notes`)
      }
    })
    if (incorrectReleases.length > 10) {
      console.log(`     ... and ${incorrectReleases.length - 10} more`)
    }
  }
  
  // Step 3: Perform fixes
  if (isDryRun) {
    console.log('\n\n🔍 DRY RUN MODE - No changes will be made\n')
  } else {
    console.log('\n\n🔧 FIXING DATA...\n')
  }
  
  let fixedReleases = 0
  let movedToNotes = 0
  let updatedWithSuggestion = 0
  
  for (const { release, reason, suggestedFix } of incorrectReleases) {
    const currentTitle = release.title
    const currentNotes = release.notes || ''
    
    if (suggestedFix && !isDryRun) {
      // Update title with suggested fix
      const newNotes = currentNotes 
        ? `${currentNotes}\n\n[Auto-fixed from incorrect title]: ${currentTitle}`
        : `[Auto-fixed from incorrect title]: ${currentTitle}`
      
      await prisma.release.update({
        where: { id: release.id },
        data: {
          title: suggestedFix,
          notes: newNotes,
        },
      })
      
      updatedWithSuggestion++
      fixedReleases++
    } else if (!isDryRun) {
      // No good suggestion - move current title to notes and set title to a placeholder
      const newNotes = currentNotes 
        ? `${currentNotes}\n\n[Auto-moved from incorrect title]: ${currentTitle}`
        : `[Auto-moved from incorrect title]: ${currentTitle}`
      
      // Try to create a better placeholder title
      let placeholderTitle = `Untitled ${release.type.toLowerCase()}`
      if (release.tracks.length > 0) {
        placeholderTitle = release.tracks[0].name || placeholderTitle
      }
      
      await prisma.release.update({
        where: { id: release.id },
        data: {
          title: placeholderTitle,
          notes: newNotes,
        },
      })
      
      movedToNotes++
      fixedReleases++
    } else {
      // Dry run - just count
      if (suggestedFix) {
        updatedWithSuggestion++
      } else {
        movedToNotes++
      }
      fixedReleases++
    }
  }
  
  if (isDryRun) {
    console.log(`   📋 Would fix ${fixedReleases} releases`)
    console.log(`      - Would update ${updatedWithSuggestion} with suggested titles`)
    console.log(`      - Would move ${movedToNotes} to notes (no good suggestion)`)
  } else {
    console.log(`   ✅ Fixed ${fixedReleases} releases`)
    console.log(`      - Updated ${updatedWithSuggestion} with suggested titles`)
    console.log(`      - Moved ${movedToNotes} to notes (no good suggestion)`)
  }
  
  if (isDryRun) {
    console.log('\n✅ Dry run complete! No changes were made.\n')
    console.log('📋 PREVIEW SUMMARY:')
    console.log(`   - Would fix releases: ${fixedReleases}`)
    console.log(`   - Would update with suggestions: ${updatedWithSuggestion}`)
    console.log(`   - Would move to notes: ${movedToNotes}`)
    console.log('\n💡 Run without --dry-run to apply these changes')
  } else {
    console.log('\n✅ Cleanup complete!\n')
    console.log('📋 FINAL SUMMARY:')
    console.log(`   - Fixed releases: ${fixedReleases}`)
    console.log(`   - Updated with suggestions: ${updatedWithSuggestion}`)
    console.log(`   - Moved to notes: ${movedToNotes}`)
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
