/**
 * Comprehensive script to fix incorrect data from CSV imports:
 * 1. Release titles that came from notes/platform columns
 * 2. Artist names that came from channel/platform columns
 * 
 * Run with: npx tsx scripts/fix-incorrect-artists-and-titles.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--dryrun')

// Check if text looks like notes/platform content (for release titles)
function isNotesOrPlatformContent(text: string): boolean {
  if (!text || !text.trim()) return false
  
  const trimmed = text.trim().toLowerCase()
  
  // Platform-related phrases
  if (trimmed.includes('all music platforms') || 
      trimmed.includes('except') ||
      trimmed.includes('spotify') ||
      trimmed.includes('apple music') ||
      trimmed.includes('youtube') ||
      trimmed.includes('facebook') ||
      trimmed.includes('tiktok') ||
      trimmed.includes('flow') ||
      trimmed.includes('ringtunes') ||
      trimmed.includes('platform')) {
    return true
  }
  
  // Notes patterns
  if (text.length > 100) return true
  if (text.includes('. ') && text.split('. ').length > 2) return true
  if (/^(please|note|note:|important|warning|reminder)/i.test(text)) return true
  if (text.toLowerCase().includes('copyright') && !text.toLowerCase().includes('status')) return true
  if (/https?:\/\//i.test(text)) return true
  if (/@/.test(text)) return true
  
  return false
}

// Check if text looks like a channel/platform name (for artist names)
function isChannelOrPlatformName(text: string): boolean {
  if (!text || !text.trim()) return false
  
  const trimmed = text.trim().toLowerCase()
  
  // Channel/platform indicators
  if (trimmed.includes('channel') ||
      trimmed.includes('youtube') ||
      trimmed.includes('facebook') ||
      trimmed.includes('tiktok') ||
      trimmed.includes('flow') ||
      trimmed.includes('ringtunes') ||
      trimmed.includes('spotify') ||
      trimmed.includes('apple music') ||
      trimmed.includes('platform') ||
      trimmed.includes('except') ||
      /^(all|music platforms|platform)/i.test(trimmed)) {
    return true
  }
  
  // Notes patterns (shouldn't be artist names)
  if (text.length > 100) return true
  if (text.includes('. ') && text.split('. ').length > 2) return true
  if (/^(please|note|note:|important|warning|reminder)/i.test(text)) return true
  
  return false
}

async function main() {
  console.log('🔍 Starting comprehensive cleanup of incorrect import data...\n')
  
  // Step 1: Find releases with incorrect titles
  console.log('Step 1: Finding releases with incorrect titles (from notes/platform columns)...')
  const allReleases = await prisma.release.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      notes: true,
      rawRow: true,
      artist: {
        select: {
          id: true,
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
    
    if (isNotesOrPlatformContent(title)) {
      const reason = 'Title contains notes/platform content (likely from wrong column)'
      
      // Try to find a better title from tracks or rawRow
      let suggestedFix: string | undefined
      
      // Check tracks first
      if (release.tracks && release.tracks.length > 0) {
        const firstTrackName = release.tracks[0].name
        if (firstTrackName && !isNotesOrPlatformContent(firstTrackName) && firstTrackName.length < 100) {
          suggestedFix = firstTrackName
        }
      }
      
      // Check rawRow for potential correct title
      if (!suggestedFix && release.rawRow && typeof release.rawRow === 'object') {
        const rawRow = release.rawRow as Record<string, any>
        
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
            if (valueStr && !isNotesOrPlatformContent(valueStr) && valueStr.length < 100) {
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
  
  // Step 2: Find artists with incorrect names (from channel/platform columns)
  console.log('Step 2: Finding artists with incorrect names (from channel/platform columns)...')
  const allArtists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      releases: {
        select: {
          id: true,
          title: true,
          rawRow: true,
        },
      },
    },
  })
  
  const incorrectArtists: Array<{
    artist: typeof allArtists[0]
    reason: string
    suggestedFix?: string
  }> = []
  
  for (const artist of allArtists) {
    const name = artist.name || ''
    
    if (isChannelOrPlatformName(name)) {
      const reason = 'Name looks like channel/platform name (likely from wrong column)'
      
      // Try to find correct artist name from releases' rawRow data
      let suggestedFix: string | undefined
      
      for (const release of artist.releases) {
        if (release.rawRow && typeof release.rawRow === 'object') {
          const rawRow = release.rawRow as Record<string, any>
          
          // Look for artist name columns
          const potentialArtistColumns = [
            'artist name',
            'artistname',
            'artist',
          ]
          
          for (const [key, value] of Object.entries(rawRow)) {
            const keyLower = key.toLowerCase()
            if (potentialArtistColumns.some(col => keyLower.includes(col)) && value && typeof value === 'string') {
              const valueStr = value.trim()
              if (valueStr && !isChannelOrPlatformName(valueStr) && valueStr.length < 100) {
                // Check if this looks like a valid artist name
                if (valueStr.length >= 2 && /[a-zA-Z]/.test(valueStr)) {
                  suggestedFix = valueStr
                  break
                }
              }
            }
          }
          
          if (suggestedFix) break
        }
      }
      
      incorrectArtists.push({
        artist,
        reason,
        suggestedFix,
      })
    }
  }
  
  console.log(`   Found ${incorrectArtists.length} artists with incorrect names\n`)
  
  // Step 3: Display findings
  console.log('\n📊 SUMMARY OF FINDINGS:\n')
  console.log(`   Incorrect Release Titles: ${incorrectReleases.length}`)
  if (incorrectReleases.length > 0) {
    console.log('   Examples:')
    incorrectReleases.slice(0, 5).forEach(({ release, reason, suggestedFix }) => {
      console.log(`     - "${release.title}" (${reason})`)
      console.log(`       Artist: ${release.artist.name}`)
      console.log(`       Tracks: ${release.tracks.length}`)
      if (suggestedFix) {
        console.log(`       Suggested fix: "${suggestedFix}"`)
      } else {
        console.log(`       No suggested fix - will move to notes`)
      }
    })
    if (incorrectReleases.length > 5) {
      console.log(`     ... and ${incorrectReleases.length - 5} more`)
    }
  }
  
  console.log(`\n   Incorrect Artist Names: ${incorrectArtists.length}`)
  if (incorrectArtists.length > 0) {
    console.log('   Examples:')
    incorrectArtists.slice(0, 5).forEach(({ artist, reason, suggestedFix }) => {
      console.log(`     - "${artist.name}" (${reason})`)
      console.log(`       Releases: ${artist.releases.length}`)
      if (suggestedFix) {
        console.log(`       Suggested fix: "${suggestedFix}"`)
      } else {
        console.log(`       No suggested fix - needs manual review`)
      }
    })
    if (incorrectArtists.length > 5) {
      console.log(`     ... and ${incorrectArtists.length - 5} more`)
    }
  }
  
  // Step 4: Perform fixes
  if (isDryRun) {
    console.log('\n\n🔍 DRY RUN MODE - No changes will be made\n')
  } else {
    console.log('\n\n🔧 FIXING DATA...\n')
  }
  
  let fixedReleases = 0
  let fixedArtists = 0
  let movedToNotes = 0
  let artistsNeedingReview = 0
  
  // Fix releases
  for (const { release, suggestedFix } of incorrectReleases) {
    const currentTitle = release.title
    const currentNotes = release.notes || ''
    
    if (suggestedFix && !isDryRun) {
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
      
      fixedReleases++
    } else if (!isDryRun) {
      const newNotes = currentNotes 
        ? `${currentNotes}\n\n[Auto-moved from incorrect title]: ${currentTitle}`
        : `[Auto-moved from incorrect title]: ${currentTitle}`
      
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
      fixedReleases++
      if (!suggestedFix) movedToNotes++
    }
  }
  
  // Fix artists (be more careful - need to check if they have releases)
  for (const { artist, suggestedFix } of incorrectArtists) {
    if (suggestedFix && !isDryRun) {
      // Update artist name
      await prisma.artist.update({
        where: { id: artist.id },
        data: {
          name: suggestedFix,
        },
      })
      
      fixedArtists++
    } else {
      // No good suggestion - mark for review
      artistsNeedingReview++
      if (!isDryRun) {
        console.log(`   ⚠️  Artist "${artist.name}" needs manual review (${artist.releases.length} releases)`)
      }
    }
  }
  
  if (isDryRun) {
    console.log(`   📋 Would fix ${fixedReleases} releases`)
    console.log(`      - Would update ${fixedReleases - movedToNotes} with suggested titles`)
    console.log(`      - Would move ${movedToNotes} to notes`)
    console.log(`   📋 Would fix ${fixedArtists} artists`)
    console.log(`   ⚠️  ${artistsNeedingReview} artists need manual review`)
  } else {
    console.log(`   ✅ Fixed ${fixedReleases} releases`)
    console.log(`      - Updated ${fixedReleases - movedToNotes} with suggested titles`)
    console.log(`      - Moved ${movedToNotes} to notes`)
    console.log(`   ✅ Fixed ${fixedArtists} artists`)
    if (artistsNeedingReview > 0) {
      console.log(`   ⚠️  ${artistsNeedingReview} artists need manual review`)
    }
  }
  
  if (isDryRun) {
    console.log('\n✅ Dry run complete! No changes were made.\n')
    console.log('📋 PREVIEW SUMMARY:')
    console.log(`   - Would fix releases: ${fixedReleases}`)
    console.log(`   - Would fix artists: ${fixedArtists}`)
    console.log(`   - Artists needing review: ${artistsNeedingReview}`)
    console.log('\n💡 Run without --dry-run to apply these changes')
  } else {
    console.log('\n✅ Cleanup complete!\n')
    console.log('📋 FINAL SUMMARY:')
    console.log(`   - Fixed releases: ${fixedReleases}`)
    console.log(`   - Fixed artists: ${fixedArtists}`)
    console.log(`   - Artists needing review: ${artistsNeedingReview}`)
  }
  
  // List artists that need manual review
  if (artistsNeedingReview > 0) {
    console.log('\n⚠️  ARTISTS REQUIRING MANUAL REVIEW:')
    for (const { artist } of incorrectArtists) {
      if (!incorrectArtists.find(ia => ia.artist.id === artist.id && ia.suggestedFix)) {
        console.log(`   - "${artist.name}" (${artist.releases.length} releases)`)
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
