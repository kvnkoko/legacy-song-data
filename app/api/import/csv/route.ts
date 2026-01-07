import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReleaseType, PlatformRequestStatus } from '@prisma/client'
import {
  parseCSV,
  extractSubmissionData,
  extractSongs,
  parseArtists,
  parseCommaSeparatedList,
  parsePlatformChannels,
  findOrCreateArtists,
  findOrCreateEmployeeByName,
  findOrCreatePlatformChannel,
  normalizeColumnName,
  type MappingConfig,
  type ParsedRow,
} from '@/lib/csv-importer'
import {
  createImportSession,
  updateImportSessionProgress,
  completeImportSession,
  failImportSession,
  calculateFileHash,
  findExistingSession,
  pauseImportSession,
  resumeImportSession,
} from '@/lib/csv-import-session'

// Process a single row
async function processRow(
  row: ParsedRow,
  rowIndex: number,
  mappings: MappingConfig['columns'],
  tx: any,
  caches?: {
    artistCache: Map<string, { id: string; name: string }>
    employeeCache: Map<string, string>
    channelCache: Map<string, { id: string; name: string; platform: string }>
  }
): Promise<{
  success: boolean
  error?: string
  releaseCreated?: boolean
  releaseUpdated?: boolean
  tracksCreated?: number
}> {
  let submission: any = null
  try {
    submission = extractSubmissionData(row, mappings)
    
    // Validate required fields
    if (!submission.releaseTitle || !submission.releaseTitle.trim()) {
      return {
        success: false,
        error: `Missing required field: releaseTitle. Row has artistName: ${submission.artistName ? 'yes' : 'no'}`,
      }
    }
    
    // Extract songs early to check release type and if they have artist names
    const songs = extractSongs(row, mappings)
    const songsWithArtists = songs.filter(s => 
      (s.artistName && s.artistName.trim()) || 
      (s.performerName && s.performerName.trim())
    )
    
    // Determine release type early to check if it's an album
    const validSongsCount = songs.filter(s => s.name && s.name.trim().length > 0).length
    const isAlbum = submission.releaseType === ReleaseType.ALBUM || 
                    (!submission.releaseType && validSongsCount > 1)
    
    // Handle missing album artist: 
    // - Always allow empty artistName (user will fill in later)
    // - Use "Unknown Artist" as placeholder when artistName is missing
    let artistNames: string[] = []
    let usePlaceholderArtist = false
    
    if (!submission.artistName || !submission.artistName.trim()) {
      // No artist name provided - use placeholder (works for both albums and singles)
      usePlaceholderArtist = true
      artistNames = ['Unknown Artist']
    } else {
      // Album artist is provided - parse it normally
      artistNames = parseArtists(submission.artistName)
      if (artistNames.length === 0) {
        // If parsing results in empty array, also use placeholder
        usePlaceholderArtist = true
        artistNames = ['Unknown Artist']
      }
    }
    
    // Find or create artists (including placeholder if needed)
    const artists = await findOrCreateArtists(artistNames, tx, caches?.artistCache)
    if (artists.length === 0) {
      return {
        success: false,
        error: `Failed to find or create artists. Parsed names: ${JSON.stringify(artistNames)}`,
      }
    }
    
    const primaryArtist = artists[0]
    
    // Update legal name if provided (only if not using placeholder artist)
    if (!usePlaceholderArtist && submission.legalName && submission.legalName.trim()) {
      await tx.artist.update({
        where: { id: primaryArtist.id },
        data: { legalName: submission.legalName.trim() },
      })
    }
    
    // Get A&R employee - support comma-separated (take first one for backward compatibility)
    let assignedARId: string | null = null
    if (submission.assignedAR) {
      const arNames = parseCommaSeparatedList(submission.assignedAR)
      if (arNames.length > 0) {
        assignedARId = await findOrCreateEmployeeByName(arNames[0].trim(), tx, caches?.employeeCache)
      }
    }
    
    // Determine release type: 1 track = SINGLE, 2+ tracks = ALBUM
    // Allow CSV to override if explicitly set, otherwise use track count
    // If no songs found, default to SINGLE (can be overridden by CSV)
    let releaseType: ReleaseType
    if (submission.releaseType) {
      // CSV explicitly set release type, use it
      releaseType = submission.releaseType
    } else if (validSongsCount >= 2) {
      // 2 or more tracks = ALBUM
      releaseType = ReleaseType.ALBUM
    } else {
      // 0 or 1 track = SINGLE (default)
      releaseType = ReleaseType.SINGLE
    }
    
    // Prepare release data
    // Store all extracted metadata in rawRow for future use
    // This includes fields like signature, royaltyReceiveMethod, respondentId, etc.
    // that don't have dedicated database columns yet
    const rawRowData = submission.rawRow || row
    const metadata = {
      // Original CSV row (preserve original structure)
      rawCSVRow: typeof rawRowData === 'object' && 'unmappedFields' in rawRowData 
        ? Object.fromEntries(Object.entries(rawRowData).filter(([key]) => key !== 'unmappedFields'))
        : rawRowData,
      // Extracted submission metadata (all fields that don't have dedicated columns)
      submissionMetadata: {
        signature: submission.signature,
        royaltyReceiveMethod: submission.royaltyReceiveMethod,
        respondentId: submission.respondentId,
        createdBy: submission.createdBy,
        albumId: submission.albumId,
        larsReleasedDate: submission.larsReleasedDate,
        // Platform metadata
        youtubeRemarks: submission.youtubeRemarks,
        vuclip: submission.vuclip,
        filezilla: submission.filezilla,
        uploadStatus: submission.uploadStatus,
        fullyUploaded: submission.fullyUploaded,
        permitStatus: submission.permitStatus,
        done: submission.done,
        moreTracks: submission.moreTracks,
        // Store all other fields from submission that might be useful
        // Exclude channel fields as they're handled separately
        ...Object.fromEntries(
          Object.entries(submission).filter(([key]) => 
            !['artistName', 'legalName', 'releaseTitle', 'releaseType', 
              'artistsChosenDate', 'releasedDate', 'legacyReleaseDate',
              'assignedAR', 'copyrightStatus', 'videoType', 'paymentRemarks', 
              'notes', 'submissionId', 'submittedAt', 'createdTime', 'rawRow',
              'youtubeChannel', 'facebookChannel', 'tiktokChannel', 'flowChannel',
              'ringtunesChannel', 'intlStreamingChannel'].includes(key)
          )
        ),
        // Include any unmapped fields from the extraction
        ...(typeof rawRowData === 'object' && 'unmappedFields' in rawRowData 
          ? rawRowData.unmappedFields 
          : {}),
      },
    }
    
    const releaseData: any = {
      type: releaseType,
      title: submission.releaseTitle.trim(),
      artistId: primaryArtist.id,
      assignedA_RId: assignedARId, // Set first A&R for backward compatibility
      artistsChosenDate: submission.artistsChosenDate || submission.releasedDate || null,
      legacyReleaseDate: submission.legacyReleaseDate || null,
      copyrightStatus: submission.copyrightStatus || null,
      videoType: submission.videoType || undefined,
      paymentRemarks: submission.paymentRemarks || null,
      notes: submission.notes || null,
      rawRow: metadata, // Store both raw CSV and extracted metadata
      submittedAt: submission.submittedAt || submission.createdTime || new Date(),
    }
    
    // Upsert release
    let release
    let releaseCreated = false
    let releaseUpdated = false
    
    if (submission.submissionId) {
      const existing = await tx.release.findFirst({
        where: { submissionId: submission.submissionId },
      })
      
      if (existing) {
        release = await tx.release.update({
          where: { id: existing.id },
          data: releaseData,
        })
        releaseUpdated = true
      } else {
        release = await tx.release.create({
          data: {
            ...releaseData,
            submissionId: submission.submissionId,
          },
        })
        releaseCreated = true
      }
    } else {
      // No submissionId - try to find by title and artist
      const existing = await tx.release.findFirst({
        where: {
          title: submission.releaseTitle.trim(),
          artistId: primaryArtist.id,
        },
      })
      
      if (existing) {
        release = await tx.release.update({
          where: { id: existing.id },
          data: releaseData,
        })
        releaseUpdated = true
      } else {
        release = await tx.release.create({
          data: releaseData,
        })
        releaseCreated = true
      }
    }
    
    // Assign A&Rs via junction table (multiple A&R support - comma-separated)
    if (submission.assignedAR && release) {
      const arNames = parseCommaSeparatedList(submission.assignedAR)
      const arEmployeeIds: string[] = []
      
      for (const arName of arNames) {
        if (!arName || arName.trim().length === 0) continue
        const employeeId = await findOrCreateEmployeeByName(arName.trim(), tx, caches?.employeeCache)
        if (employeeId) {
          arEmployeeIds.push(employeeId)
        }
      }
      
      if (arEmployeeIds.length > 0) {
        // Delete existing A&R assignments
        await tx.releaseA_R.deleteMany({
          where: { releaseId: release.id },
        })
        
        // Create new A&R assignments
        await tx.releaseA_R.createMany({
          data: arEmployeeIds.map((employeeId: string) => ({
            releaseId: release.id,
            employeeId,
            isPrimary: false,
          })),
          skipDuplicates: true,
        })
      }
    }
    
    // Add additional artists if multiple
    if (artists.length > 1 && release) {
      // Delete existing release artists
      await tx.releaseArtist.deleteMany({
        where: { releaseId: release.id },
      })
      
      // Create release artists
      await tx.releaseArtist.createMany({
        data: artists.slice(1).map((artist) => ({
          releaseId: release.id,
          artistId: artist.id,
        })),
        skipDuplicates: true,
      })
    }
    
    // Create songs (already extracted above for release type determination)
    let tracksCreated = 0
    
    if (songs.length > 0) {
      // Delete existing tracks
      await tx.track.deleteMany({
        where: { releaseId: release.id },
      })
      
      // Create tracks
      for (let songIdx = 0; songIdx < songs.length; songIdx++) {
        const song = songs[songIdx]
        if (!song.name) continue
        
        // Get song artists
        let songArtists = [primaryArtist]
        if (song.artistName) {
          const songArtistNames = parseArtists(song.artistName)
          const foundArtists = await findOrCreateArtists(songArtistNames, tx, caches?.artistCache)
          if (foundArtists.length > 0) {
            songArtists = foundArtists
          }
        }
        
        const track = await tx.track.create({
      data: {
            releaseId: release.id,
            trackNumber: songIdx + 1,
            name: song.name.trim(),
            composer: song.composerName || null,
            performer: song.performerName || null,
            band: song.bandName || null,
            musicProducer: song.producerArchived || null,
            studio: song.studioName || null,
            recordLabel: song.recordLabelName || null,
            genre: song.genre || null,
          },
        })
        
        tracksCreated++
        
        // Create track artists
        if (songArtists.length > 0) {
          await tx.trackArtist.createMany({
            data: songArtists.map((artist) => ({
              trackId: track.id,
              artistId: artist.id,
            })),
            skipDuplicates: true,
          })
        }
      }
    }
    
    // Create platform requests
    if (release) {
      const platforms = [
        { key: 'youtubeRequest', platform: 'youtube', statusKey: 'youtube', channelKey: 'youtubeChannel' },
        { key: 'flowRequest', platform: 'flow', statusKey: 'flow', channelKey: 'flowChannel' },
        { key: 'tiktokRequest', platform: 'tiktok', statusKey: 'tiktok', channelKey: 'tiktokChannel' },
        { key: 'fbRequest', platform: 'facebook', statusKey: 'fb', channelKey: 'facebookChannel' },
        { key: 'intlStreamingRequest', platform: 'international_streaming', statusKey: 'intlStreaming', channelKey: 'intlStreamingChannel' },
        { key: 'ringtunesRequest', platform: 'ringtunes', statusKey: 'ringtunes', channelKey: 'ringtunesChannel' },
      ]
      
      for (const { key, platform, statusKey, channelKey } of platforms) {
        const requestValue = submission[key as keyof typeof submission] as string | undefined
        const statusValue = submission[statusKey as keyof typeof submission] as string | undefined
        const channelValue = submission[channelKey as keyof typeof submission] as string | undefined
        
        // Check if there's a request (any non-empty value means requested)
        const isRequested = requestValue && requestValue.trim().length > 0 && 
          (requestValue.toLowerCase() === 'yes' || 
           requestValue.toLowerCase() === 'true' || 
           requestValue.toLowerCase() === '1' ||
           requestValue.toLowerCase() === 'y' ||
           requestValue.trim().length > 0) // Any non-empty value means requested
        
        // Determine status - handle "checked" and "completed" as approved
        let status = PlatformRequestStatus.PENDING
        let uploadedAt: Date | undefined = undefined
        if (statusValue && statusValue.trim().length > 0) {
          const statusLower = statusValue.toLowerCase().trim()
          if (statusLower.includes('uploaded') || 
              statusLower.includes('approved') || 
              statusLower.includes('checked') || 
              statusLower.includes('completed') ||
              statusLower === 'yes' ||
              statusLower === 'y' ||
              statusLower === '1' ||
              statusLower === 'true') {
            status = PlatformRequestStatus.UPLOADED
            uploadedAt = new Date() // Set uploadedAt when status is UPLOADED
          } else if (statusLower.includes('rejected')) {
            status = PlatformRequestStatus.REJECTED
          }
        }
        
        // Only create/update if there's a request or status
        if (isRequested || (statusValue && statusValue.trim().length > 0)) {
          try {
            // Parse channel names (can be comma-separated for multiple channels)
            const channelNames = channelValue ? parsePlatformChannels(channelValue) : []
            
            // Delete existing platform requests for this release/platform combination
            // We'll recreate them with proper channel associations
            await tx.platformRequest.deleteMany({
              where: {
                releaseId: release.id,
                platform: platform as any,
              },
            })
            
            // For platforms with channels (YouTube, Facebook), if status is "checked" but no channels specified,
            // we need to find existing channel requests and mark them all as UPLOADED
            const hasChannels = (platform === 'youtube' || platform === 'facebook')
            const isChecked = statusValue && statusValue.trim().length > 0 && 
              (statusValue.toLowerCase().trim().includes('checked') || 
               statusValue.toLowerCase().trim().includes('completed'))
            
            if (channelNames.length > 0) {
              // Create a platform request for each channel
              // If platform is checked, all channels should be marked as UPLOADED
              const finalStatus = isChecked ? PlatformRequestStatus.UPLOADED : status
              const finalUploadedAt = isChecked ? new Date() : uploadedAt
              
              // Bulk create platform requests for better performance
              const platformRequestsToCreate = []
              
              for (const channelName of channelNames) {
                try {
                  const channel = await findOrCreatePlatformChannel(platform, channelName, tx, caches?.channelCache)
                  
                  if (channel) {
                    platformRequestsToCreate.push({
                      releaseId: release.id,
                      platform: platform,
                      requested: isRequested || false,
                      status: finalStatus,
                      uploadedAt: finalUploadedAt || undefined,
                      channelId: channel.id,
                      channelName: channel.name,
                    })
                  } else {
                    // Fallback: create without channel record
                    platformRequestsToCreate.push({
                      releaseId: release.id,
                      platform: platform,
                      requested: isRequested || false,
                      status: finalStatus,
                      uploadedAt: finalUploadedAt || undefined,
                      channelId: null,
                      channelName: channelName,
                    })
                  }
                } catch (channelError: any) {
                  // If channel creation fails, create request without channel
                  console.warn(`Failed to create channel ${channelName} for ${platform}:`, channelError?.message)
                  platformRequestsToCreate.push({
                    releaseId: release.id,
                    platform: platform,
                    requested: isRequested || false,
                    status: finalStatus,
                    uploadedAt: finalUploadedAt || undefined,
                    channelId: null,
                    channelName: channelName,
                  })
                }
              }
              
              // Bulk create all platform requests at once
              if (platformRequestsToCreate.length > 0) {
                await tx.platformRequest.createMany({
                  data: platformRequestsToCreate,
                  skipDuplicates: true,
                })
              }
            } else if (hasChannels && isChecked) {
              // Platform is checked but no channels specified - find all existing channel requests and mark as UPLOADED
              const existingChannelRequests = await tx.platformRequest.findMany({
                where: {
                  releaseId: release.id,
                  platform: platform,
                  channelId: { not: null },
                },
              })
              
              if (existingChannelRequests.length > 0) {
                // Update all channel requests to UPLOADED
                await tx.platformRequest.updateMany({
                  where: {
                    releaseId: release.id,
                    platform: platform,
                    channelId: { not: null },
                  },
                  data: {
                    status: PlatformRequestStatus.UPLOADED,
                    uploadedAt: new Date(),
                  },
                })
              } else {
              // No existing channel requests - create a single request without channel (will be handled below)
            }
            } else {
              // No channels specified, create a single request without channel
              // First, try to find existing request
              const existingRequest = await tx.platformRequest.findFirst({
                where: {
                  releaseId: release.id,
                  platform: platform,
                  channelId: null, // No channel
                },
              })
              
              if (existingRequest) {
                // Update existing request
                await tx.platformRequest.update({
                  where: { id: existingRequest.id },
                  data: {
                    requested: isRequested || false,
                    status,
                    uploadedAt: uploadedAt || undefined,
                  },
                })
              } else {
                // Create new request
                await tx.platformRequest.create({
                  data: {
                    releaseId: release.id,
                    platform: platform,
                    requested: isRequested || false,
                    status,
                    uploadedAt: uploadedAt || undefined,
                  },
                })
              }
            }
          } catch (platformError: any) {
            // Log error but don't fail the entire import
            // Platform requests are optional metadata
            console.warn(`Failed to create platform request for ${platform}:`, platformError?.message)
          }
        }
      }
    }
    
    return {
      success: true,
      releaseCreated,
      releaseUpdated,
      tracksCreated,
    }
  } catch (error: any) {
    // Log detailed error for debugging
    console.error(`Error processing row ${rowIndex + 1}:`, {
      error: error.message,
      stack: error.stack,
      submission: {
        artistName: submission?.artistName,
        releaseTitle: submission?.releaseTitle,
        submissionId: submission?.submissionId,
      },
    })
    return {
      success: false,
      error: error.message || 'Unknown error',
    }
  }
}

// Process all rows
export async function processAllRows(
  sessionId: string,
  rows: ParsedRow[],
  mappingConfig: MappingConfig,
  startFromRow: number = 0
) {
  const mappings = mappingConfig.columns
  const errors: Array<{ row: number; message: string }> = []
  let submissionsCreated = 0
  let submissionsUpdated = 0
  let songsCreated = 0
  let rowsSkipped = 0
  
  // Helper function to update session with current stats
  const updateSessionStats = async () => {
    try {
      const session = await prisma.importSession.findUnique({
        where: { id: sessionId },
        select: { mappingConfig: true },
      })
      
      if (session) {
        const successCount = submissionsCreated + submissionsUpdated
        await prisma.importSession.update({
          where: { id: sessionId },
          data: {
            mappingConfig: {
              ...(typeof session.mappingConfig === 'object' ? session.mappingConfig : {}),
              _currentSuccessCount: successCount,
              _currentErrorCount: rowsSkipped,
              _failedRows: errors,
            },
          },
        })
      }
    } catch (err: any) {
      // Don't fail import if stats update fails
      console.warn('Failed to update session stats:', err?.message)
    }
  }
  
  try {
    console.log(`🚀 Starting import: ${rows.length} rows, starting from row ${startFromRow}`)
    
    // Initialize caches for performance optimization
    const artistCache = new Map<string, { id: string; name: string }>()
    const employeeCache = new Map<string, string>()
    const channelCache = new Map<string, { id: string; name: string; platform: string }>()
    const caches = { artistCache, employeeCache, channelCache }
    
    // Initial progress update
    try {
      await updateImportSessionProgress(sessionId, startFromRow)
      await updateSessionStats()
    } catch (progressError: any) {
      console.warn('Initial progress update failed (import continues):', progressError?.message)
    }
    
    // Process rows individually with Notion-style approach
    // Each row gets its own transaction - fast, reliable, no timeout risk
    for (let rowIndex = startFromRow; rowIndex < rows.length; rowIndex++) {
      // Check if import is paused before processing each row
      const session = await prisma.importSession.findUnique({
        where: { id: sessionId },
        select: { status: true },
      })
      
      if (session?.status === 'paused') {
        console.log(`⏸️ Import paused at row ${rowIndex + 1}. Waiting for resume...`)
        // Wait in a loop until resumed or cancelled
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Check every 2 seconds
          
          const currentSession = await prisma.importSession.findUnique({
            where: { id: sessionId },
            select: { status: true },
          })
          
          if (currentSession?.status === 'in_progress') {
            console.log(`▶️ Import resumed. Continuing from row ${rowIndex + 1}...`)
            break // Resume processing
          } else if (currentSession?.status === 'cancelled' || currentSession?.status === 'completed' || currentSession?.status === 'failed') {
            console.log(`⏹️ Import ${currentSession.status}. Stopping at row ${rowIndex + 1}.`)
            return // Stop processing
          }
          // If still paused, continue waiting
        }
      }
      
      // Check if cancelled or failed
      if (session?.status === 'cancelled' || session?.status === 'failed' || session?.status === 'completed') {
        console.log(`⏹️ Import ${session.status}. Stopping at row ${rowIndex + 1}.`)
        break
      }
      
      const row = rows[rowIndex]
      
      try {
        // Individual transaction per row - 30 seconds is plenty for a single row
        await prisma.$transaction(async (tx) => {
          const result = await processRow(row, rowIndex, mappings, tx, caches)
          
          if (result.success) {
            if (result.releaseCreated) {
              submissionsCreated++
            }
            if (result.releaseUpdated) {
              submissionsUpdated++
            }
            if (result.tracksCreated) {
              songsCreated += result.tracksCreated
            }
          } else {
            errors.push({
              row: rowIndex + 1,
              message: result.error || 'Unknown error',
            })
            rowsSkipped++
          }
        }, {
          timeout: 30000, // 30 seconds per row is plenty
          maxWait: 5000,
        })
      } catch (error: any) {
        // Individual row failed - log error but continue with other rows
        console.error(`❌ Row ${rowIndex + 1} failed:`, error.message || 'Unknown error')
        errors.push({
          row: rowIndex + 1,
          message: `Transaction failed: ${error.message || 'Unknown error'}`,
        })
        rowsSkipped++
      }
      
      // Update progress every 10 rows (non-blocking)
      if ((rowIndex + 1) % 10 === 0 || rowIndex === rows.length - 1) {
        try {
          await updateImportSessionProgress(sessionId, rowIndex + 1)
          await updateSessionStats()
        } catch (progressError: any) {
          // Don't fail import if progress update fails
          console.warn('Progress update failed (import continues):', progressError?.message)
        }
      }
    }
    
    console.log(`✅ Import complete: ${submissionsCreated} created, ${submissionsUpdated} updated, ${songsCreated} tracks, ${rowsSkipped} skipped`)

    // Complete the session
    await completeImportSession(sessionId, {
      submissionsCreated,
      submissionsUpdated,
      songsCreated,
      rowsSkipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Import processing failed:', error)
    await failImportSession(sessionId, error.message || 'Import failed')
    throw error
  }
}

// POST handler - start import
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { csvContent, mappingConfig, fileName } = await req.json()
    
    if (!csvContent || !mappingConfig) {
      return NextResponse.json(
        { error: 'CSV content and mapping config required' },
        { status: 400 }
      )
    }
    
    // Parse CSV
    const { headers, rows } = parseCSV(csvContent)
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows found in CSV' }, { status: 400 })
    }
    
    // Check for existing session
    const fileHash = calculateFileHash(csvContent)
    const existingSession = await findExistingSession(session.user.id, fileHash)
    
    if (existingSession) {
      return NextResponse.json({
        sessionId: existingSession.id,
        message: 'Found existing import session',
        existing: true,
      })
    }
    
    // Create import session
    const importSession = await createImportSession({
      userId: session.user.id,
      fileHash,
      fileName: fileName || 'import.csv',
      totalRows: rows.length,
      mappingConfig,
    })
    
    // Start processing in background
    setImmediate(() => {
      processAllRows(importSession.id, rows, mappingConfig, 0).catch((error) => {
        console.error('❌ Background import failed:', error)
        failImportSession(importSession.id, error.message || 'Import failed').catch((failError) => {
          console.error('Failed to mark session as failed:', failError)
        })
      })
    })
    
    return NextResponse.json({
      success: true,
      sessionId: importSession.id,
      totalRows: rows.length,
      message: 'Import started',
    })
              } catch (error: any) {
    console.error('CSV import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start import' },
      { status: 500 }
    )
  }
}
