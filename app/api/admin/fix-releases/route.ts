import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { processRow } from '@/app/api/import/csv/route'
import type { MappingConfig } from '@/lib/csv-importer'

// Identify releases with titles that look like they came from wrong columns
function looksLikeWrongColumn(title: string): boolean {
  if (!title) return false
  
  const lowerTitle = title.toLowerCase()
  
  // Patterns that indicate notes content
  const notesPatterns = [
    'will whitelist',
    'p.s.',
    'copyright',
    'note:',
    'please',
    'important',
    'warning',
    'reminder',
    'youtube တွင်', // Burmese text from user's example
    'cannot upload',
    'due to',
  ]
  
  // Patterns that indicate payment remarks
  const paymentPatterns = [
    'payment',
    'royalty',
    'receive method',
    'bank',
    'account',
    'transfer',
  ]
  
  // Patterns that indicate platform status
  const platformPatterns = [
    'uploaded',
    'pending',
    'rejected',
    'monetization',
    'the licensee will be',
    'youtube',
    'facebook',
    'tiktok',
    'flow',
    'ringtunes',
  ]
  
  // Patterns that indicate dates (but not release dates)
  const datePatterns = [
    /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/, // DD-MM-YY or similar
    /^(january|february|march|april|may|june|july|august|september|october|november|december)/i,
  ]
  
  // Patterns that indicate status codes or IDs
  const codePatterns = [
    /^[a-z0-9]{4,10}$/i, // Short codes
    /^id=/i, // ID patterns
    /accessToken/i,
  ]
  
  // Check if title is very long (likely notes or other text field)
  if (title.length > 100) return true
  
  // Check if it contains multiple sentences (likely notes)
  if (title.includes('. ') && title.split('. ').length > 2) return true
  
  // Check for notes patterns
  if (notesPatterns.some(pattern => lowerTitle.includes(pattern))) return true
  
  // Check for payment remarks patterns
  if (paymentPatterns.some(pattern => lowerTitle.includes(pattern))) return true
  
  // Check for platform status patterns (but not if it's a valid release title)
  if (platformPatterns.some(pattern => lowerTitle.includes(pattern)) && 
      !lowerTitle.includes('platform') && 
      title.length < 50) return true
  
  // Check if it's just a date
  if (datePatterns.some(pattern => pattern.test(title.trim()))) return true
  
  // Check if it's just a code/ID
  if (codePatterns.some(pattern => pattern.test(title.trim()))) return true
  
  // Check if it contains URLs or access tokens
  if (/https?:\/\/|www\.|accessToken|id=/i.test(title)) return true
  
  // Check if it's mostly special characters, numbers, or commas (likely concatenated data)
  if (/^[,;\s\d\-_]+$/.test(title) || (title.split(',').length > 3 && title.length < 50)) return true
  
  return false
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, releaseIds, sessionId } = await req.json()

    if (action === 'identify') {
      // Identify releases with titles that look like they came from wrong columns
      const allReleases = await prisma.release.findMany({
        select: {
          id: true,
          title: true,
          notes: true,
          rawRow: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const problematicReleases = allReleases.filter(r => looksLikeWrongColumn(r.title || ''))

      return NextResponse.json({
        count: problematicReleases.length,
        releases: problematicReleases.map(r => ({
          id: r.id,
          title: r.title,
          notes: r.notes,
          hasRawRow: !!r.rawRow,
          createdAt: r.createdAt,
          // Try to extract potential correct title for preview
          potentialTitle: (() => {
            if (!r.rawRow) return null
            try {
              const rawData = typeof r.rawRow === 'string' ? JSON.parse(r.rawRow) : r.rawRow
              const titleFields = [
                'Album/Single Name', 'Album or Single Name', 'Release Title',
                'Album Name', 'Single Name', 'Title', 'title'
              ]
              for (const field of titleFields) {
                const value = rawData[field]
                if (value && typeof value === 'string') {
                  const trimmed = value.trim()
                  if (trimmed.length > 0 && !looksLikeWrongColumn(trimmed) && /[a-zA-Z]/.test(trimmed)) {
                    return trimmed.substring(0, 100)
                  }
                }
              }
            } catch (e) {
              // Ignore
            }
            return null
          })(),
        })),
      })
    } else if (action === 'fix' && releaseIds && Array.isArray(releaseIds)) {
      // Fix specific releases
      const fixed: string[] = []
      const errors: Array<{ id: string; error: string }> = []

      for (const releaseId of releaseIds) {
        try {
          const release = await prisma.release.findUnique({
            where: { id: releaseId },
            select: {
              id: true,
              title: true,
              notes: true,
              rawRow: true,
            },
          })

          if (!release) {
            errors.push({ id: releaseId, error: 'Release not found' })
            continue
          }

          // Try to extract correct title from rawRow or other fields
          let correctTitle: string | null = null
          let sourceField: string | null = null

          // Try to extract from rawRow if available
          if (release.rawRow) {
            try {
              const rawData = typeof release.rawRow === 'string' 
                ? JSON.parse(release.rawRow) 
                : release.rawRow
              
              // Comprehensive list of possible title column names (in priority order)
              const titleFields = [
                'Album/Single Name',
                'Album or Single Name',
                'Release Title',
                'Release Name',
                'Album Name',
                'Single Name',
                'Album Title',
                'Single Title',
                'Title',
                'title',
                'Release',
                'release',
                'Name',
                'name',
              ]
              
              // First, try to find a valid title field
              for (const field of titleFields) {
                const value = rawData[field]
                if (value && typeof value === 'string') {
                  const trimmed = value.trim()
                  // Check if this looks like a valid title (not from wrong column)
                  if (trimmed.length > 0 && 
                      trimmed.length <= 200 && // Reasonable title length
                      !looksLikeWrongColumn(trimmed) &&
                      /[a-zA-Z]/.test(trimmed)) { // Contains letters
                    correctTitle = trimmed
                    sourceField = field
                    break
                  }
                }
              }
              
              // If we found a title, also check other fields to see if current title came from them
              if (correctTitle) {
                // Check if current title matches other non-title fields (indicating wrong mapping)
                const nonTitleFields = [
                  'Notes', 'notes', 'Note', 'note',
                  'Payment Remarks', 'payment remarks', 'PaymentRemarks',
                  'YouTube', 'youtube', 'Facebook', 'facebook', 'TikTok', 'tiktok',
                  'Flow', 'flow', 'Ringtunes', 'ringtunes',
                  'Upload Status', 'upload status', 'UploadStatus',
                  'Copyright Status', 'copyright status', 'CopyrightStatus',
                  'Video Type', 'video type', 'VideoType',
                  'Assigned A&R', 'assigned a&r', 'AssignedAR',
                  'Legal Name', 'legal name', 'LegalName',
                  'Signature', 'signature',
                ]
                
                for (const field of nonTitleFields) {
                  const value = rawData[field]
                  if (value && typeof value === 'string' && value.trim() === release.title?.trim()) {
                    // Current title matches a non-title field - definitely wrong mapping
                    console.log(`Release ${releaseId}: Title "${release.title}" matches ${field}, correct title should be "${correctTitle}"`)
                    break
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing rawRow:', e)
            }
          }
          
          // Fallback: If notes field has content and title looks wrong, check if notes might be the actual title
          if (!correctTitle && release.notes && release.notes.length > 0 && looksLikeWrongColumn(release.title || '')) {
            // Check if notes might be the actual title (not too long, doesn't look like notes)
            if (release.notes.length <= 200 && 
                !looksLikeWrongColumn(release.notes) &&
                /[a-zA-Z]/.test(release.notes)) {
              correctTitle = release.notes
              sourceField = 'notes'
            }
          }

          if (correctTitle && correctTitle !== release.title) {
            // Determine what to do with the old title
            let newNotes = release.notes
            
            // If old title looks like it came from a wrong column and notes is empty, preserve it in notes
            if (!newNotes && looksLikeWrongColumn(release.title || '')) {
              // Only preserve if it's not just garbage (has some meaningful content)
              if (release.title && release.title.length > 5 && /[a-zA-Z]/.test(release.title)) {
                newNotes = release.title
              }
            }
            
            await prisma.release.update({
              where: { id: releaseId },
              data: {
                title: correctTitle,
                notes: newNotes || null,
              },
            })
            fixed.push(releaseId)
            console.log(`Fixed release ${releaseId}: "${release.title}" -> "${correctTitle}" (from ${sourceField || 'unknown'})`)
          } else {
            const reason = correctTitle 
              ? 'Title already correct' 
              : 'Could not determine correct title from rawRow or notes'
            errors.push({ id: releaseId, error: reason })
          }
        } catch (error: any) {
          errors.push({ id: releaseId, error: error.message || 'Unknown error' })
        }
      }

      return NextResponse.json({
        fixed: fixed.length,
        errors: errors.length,
        fixedIds: fixed,
        errorDetails: errors,
      })
    } else if (action === 'reprocess-failed' && sessionId) {
      // Re-process failed rows from an import session
      const importSession = await prisma.importSession.findUnique({
        where: { id: sessionId },
      })

      if (!importSession) {
        return NextResponse.json({ error: 'Import session not found' }, { status: 404 })
      }

      const mappingConfig = importSession.mappingConfig as MappingConfig
      const failedRows = mappingConfig?._failedRows || []

      if (failedRows.length === 0) {
        return NextResponse.json({ error: 'No failed rows to reprocess' }, { status: 400 })
      }

      // Use the imported processRow function with improved validation
      
      let successCount = 0
      let errorCount = 0
      const errors: Array<{ row: number; message: string; data: any }> = []

      for (const failedRow of failedRows) {
        try {
          await processRow(failedRow.data, failedRow.row, mappingConfig)
          successCount++
        } catch (error: any) {
          errorCount++
          errors.push({
            row: failedRow.row,
            message: error.message || 'Unknown error',
            data: failedRow.data,
          })
        }
      }

      // Update the session's failed rows - only keep rows that still failed
      const updatedFailedRows = errors.map(e => ({
        row: e.row,
        message: e.message,
        data: e.data,
      }))

      await prisma.importSession.update({
        where: { id: sessionId },
        data: {
          mappingConfig: {
            ...mappingConfig,
            _failedRows: updatedFailedRows,
          },
        },
      })

      return NextResponse.json({
        success: true,
        reprocessed: failedRows.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      })
    } else {
      return NextResponse.json({ error: 'Invalid action or parameters' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Fix releases error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fix releases' },
      { status: 500 }
    )
  }
}

