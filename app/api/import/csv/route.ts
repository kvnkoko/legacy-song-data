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
export async function processRow(
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
    
    // #region agent log - Debug extraction
    const releaseTitleMapping = mappings.find(m => m.targetField === 'releaseTitle' && m.fieldType === 'submission')
    const logDataExtraction = {
      location: 'app/api/import/csv/route.ts:51',
      message: 'Submission data extracted',
      data: {
        rowIndex,
        hasReleaseTitle: !!submission.releaseTitle,
        releaseTitle: submission.releaseTitle?.substring(0, 50) || 'MISSING',
        hasArtistName: !!submission.artistName,
        artistName: submission.artistName?.substring(0, 50) || 'MISSING',
        releaseTitleMapping: releaseTitleMapping ? {
          csvColumn: releaseTitleMapping.csvColumn,
          targetField: releaseTitleMapping.targetField,
          fieldType: releaseTitleMapping.fieldType,
        } : 'NOT FOUND',
        rowKeys: Object.keys(row).slice(0, 10),
        rowSample: Object.fromEntries(Object.entries(row).slice(0, 5)),
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'L',
    };
    // Log extraction details - ALWAYS log first 3 rows for debugging
    if (rowIndex < 3) {
      console.log(`\n[IMPORT] ========== Row ${rowIndex + 1} Extraction ==========`)
      console.log(`[IMPORT] Row keys (first 20):`, Object.keys(row).slice(0, 20))
      console.log(`[IMPORT] ReleaseTitle Mapping:`, releaseTitleMapping ? {
        csvColumn: releaseTitleMapping.csvColumn,
        targetField: releaseTitleMapping.targetField,
        fieldType: releaseTitleMapping.fieldType,
      } : '❌ NOT FOUND IN MAPPINGS!')
      
      if (releaseTitleMapping) {
        console.log(`[IMPORT] Looking for column: "${releaseTitleMapping.csvColumn}"`)
        console.log(`[IMPORT] row["${releaseTitleMapping.csvColumn}"] =`, row[releaseTitleMapping.csvColumn]?.substring(0, 100) || '❌ NOT FOUND')
        console.log(`[IMPORT] row[normalized] =`, row[normalizeColumnName(releaseTitleMapping.csvColumn)]?.substring(0, 100) || '❌ NOT FOUND')
      }
      
      console.log(`[IMPORT] Extracted submission:`, {
        hasReleaseTitle: !!submission.releaseTitle,
        releaseTitle: submission.releaseTitle?.substring(0, 100) || '❌ MISSING',
        hasArtistName: !!submission.artistName,
        artistName: submission.artistName?.substring(0, 50) || 'MISSING',
        submissionKeys: Object.keys(submission),
      })
      console.log(`[IMPORT] ============================================\n`)
    } else if (rowIndex % 50 === 0) {
      console.log(`[IMPORT] Row ${rowIndex + 1}: hasReleaseTitle=${!!submission.releaseTitle}`)
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataExtraction) }).catch(() => {});
    // #endregion
    
    // Validate required fields
    if (!submission.releaseTitle || !submission.releaseTitle.trim()) {
      // Log ALL details for first few failures
      const errorDetails = {
        rowIndex: rowIndex + 1,
        submissionKeys: Object.keys(submission),
        releaseTitleMapping: releaseTitleMapping ? {
          csvColumn: releaseTitleMapping.csvColumn,
          targetField: releaseTitleMapping.targetField,
          fieldType: releaseTitleMapping.fieldType,
          csvColumnInRow: releaseTitleMapping.csvColumn in row,
          rowValue: row[releaseTitleMapping.csvColumn] || 'NOT FOUND IN ROW',
          normalizedRowValue: row[normalizeColumnName(releaseTitleMapping.csvColumn)] || 'NOT FOUND NORMALIZED',
        } : 'MAPPING NOT FOUND',
        allSubmissionMappings: mappings.filter(m => m.fieldType === 'submission').map(m => ({
          csvColumn: m.csvColumn,
          targetField: m.targetField,
          rowHasColumn: m.csvColumn in row,
          rowValue: row[m.csvColumn]?.substring(0, 50) || 'EMPTY',
        })),
        sampleRowKeys: Object.keys(row).slice(0, 15),
        sampleRowValues: Object.fromEntries(Object.entries(row).slice(0, 5)),
      }
      
      console.error(`[IMPORT] ❌ Row ${rowIndex + 1} FAILED: Missing releaseTitle`, errorDetails)
      
      // #region agent log
      const logDataMissingTitle = {
        location: 'app/api/import/csv/route.ts:82',
        message: 'Missing releaseTitle - validation failed',
        data: errorDetails,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'L',
      };
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataMissingTitle) }).catch(() => {});
      // #endregion
      
      return {
        success: false,
        error: `Missing required field: releaseTitle. Row has artistName: ${submission.artistName ? 'yes' : 'no'}. Check column mapping for 'releaseTitle'.`,
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
    
    try {
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
          if (rowIndex < 3) {
            console.log(`[IMPORT] ✅ Row ${rowIndex + 1}: Updated existing release "${release.title}" (ID: ${release.id})`)
          }
        } else {
          release = await tx.release.create({
            data: {
              ...releaseData,
              submissionId: submission.submissionId,
            },
          })
          releaseCreated = true
          if (rowIndex < 3) {
            console.log(`[IMPORT] ✅ Row ${rowIndex + 1}: Created new release "${release.title}" (ID: ${release.id})`)
          }
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
          if (rowIndex < 3) {
            console.log(`[IMPORT] ✅ Row ${rowIndex + 1}: Updated existing release "${release.title}" (ID: ${release.id}) by title/artist`)
          }
        } else {
          release = await tx.release.create({
            data: releaseData,
          })
          releaseCreated = true
          if (rowIndex < 3) {
            console.log(`[IMPORT] ✅ Row ${rowIndex + 1}: Created new release "${release.title}" (ID: ${release.id}) by title/artist`)
          }
        }
      }
    } catch (releaseError: any) {
      console.error(`[IMPORT] ❌ Row ${rowIndex + 1}: Failed to create/update release:`, releaseError.message)
      console.error(`[IMPORT] Release data:`, {
        title: releaseData.title,
        artistId: releaseData.artistId,
        type: releaseData.type,
      })
      throw releaseError
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
      // If existing session is paused, resume it automatically
      // If it's stuck at 0% for more than 5 minutes, treat it as failed and create a new one
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const isStuck = existingSession.rowsProcessed === 0 && existingSession.startedAt < fiveMinutesAgo
      
      if (existingSession.status === 'paused') {
        // Resume paused session
        await resumeImportSession(existingSession.id)
        // #region agent log
        const logDataResume = {
          location: 'app/api/import/csv/route.ts:752',
          message: 'Resuming existing paused session',
          data: {
            sessionId: existingSession.id,
            wasPaused: true,
            rowsProcessed: existingSession.rowsProcessed,
            totalRows: existingSession.totalRows,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'F',
        };
        console.log('[DEBUG] Resuming Session:', logDataResume);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataResume) }).catch(() => {});
        // #endregion
        // Return resumed session - batch processor will continue from where it left off
      return NextResponse.json({
        sessionId: existingSession.id,
          totalRows: existingSession.totalRows,
          rowsProcessed: existingSession.rowsProcessed || 0,
          message: 'Resumed existing paused session',
          existing: true,
          needsMore: existingSession.totalRows > (existingSession.rowsProcessed || 0),
        })
      } else if (isStuck) {
        // Session is stuck at 0% - mark as failed and create new one
        await failImportSession(existingSession.id, 'Import stuck at 0% - creating new session')
        // Continue to create new session below
        // #region agent log
        const logDataStuck = {
          location: 'app/api/import/csv/route.ts:765',
          message: 'Existing session stuck at 0% - creating new session',
          data: {
            oldSessionId: existingSession.id,
            rowsProcessed: existingSession.rowsProcessed,
            startedAt: existingSession.startedAt,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'F',
        };
        console.log('[DEBUG] Session Stuck:', logDataStuck);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataStuck) }).catch(() => {});
        // #endregion
      } else if (existingSession.status === 'in_progress') {
        // Existing session is in progress - reuse it
        // #region agent log
        const logDataReuse = {
          location: 'app/api/import/csv/route.ts:775',
          message: 'Reusing existing in-progress session',
          data: {
            sessionId: existingSession.id,
            rowsProcessed: existingSession.rowsProcessed,
            totalRows: existingSession.totalRows,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'F',
        };
        console.log('[DEBUG] Reusing Session:', logDataReuse);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataReuse) }).catch(() => {});
        // #endregion
      return NextResponse.json({
        sessionId: existingSession.id,
          totalRows: existingSession.totalRows,
          rowsProcessed: existingSession.rowsProcessed || 0,
        message: 'Found existing import session',
        existing: true,
          needsMore: existingSession.totalRows > (existingSession.rowsProcessed || 0),
        })
      }
    }
    
    // Store CSV rows in mappingConfig for chunked processing
    // This allows us to process in small batches on Vercel free tier
    // Note: For very large CSVs, we might hit database JSON size limits
    // In that case, we'll need to store CSV content separately or process differently
    const mappingConfigWithRows = {
      ...mappingConfig,
      _csvRows: rows,
      _csvContent: csvContent, // Store original CSV content as backup
      _submissionsCreated: 0,
      _submissionsUpdated: 0,
      _songsCreated: 0,
      _rowsSkipped: 0,
      _failedRows: [] as Array<{ row: number; message: string }>,
    }
    
    // #region agent log
    const logDataCreate = {
      location: 'app/api/import/csv/route.ts:762',
      message: 'Creating import session',
      data: {
        totalRows: rows.length,
        csvRowsSize: JSON.stringify(rows).length,
        mappingConfigSize: JSON.stringify(mappingConfigWithRows).length,
        hasRows: rows.length > 0,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'D',
    };
    console.log('[DEBUG] Creating Session:', logDataCreate);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataCreate) }).catch(() => {});
    // #endregion
    
    // Create import session
    let importSession
    try {
      importSession = await createImportSession({
      userId: session.user.id,
      fileHash,
      fileName: fileName || 'import.csv',
      totalRows: rows.length,
        mappingConfig: mappingConfigWithRows,
      })
      
      // #region agent log
      const logDataCreated = {
        location: 'app/api/import/csv/route.ts:775',
        message: 'Import session created successfully',
        data: {
          sessionId: importSession.id,
          totalRows: rows.length,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D',
      };
      console.log('[DEBUG] Session Created:', logDataCreated);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataCreated) }).catch(() => {});
      // #endregion
    } catch (createError: any) {
      // #region agent log
      const logDataCreateError = {
        location: 'app/api/import/csv/route.ts:775',
        message: 'Failed to create import session',
        data: {
          error: createError.message || 'Unknown error',
          stack: createError.stack,
          totalRows: rows.length,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D',
      };
      console.error('[DEBUG] Session Creation Failed:', logDataCreateError);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataCreateError) }).catch(() => {});
      // #endregion
      throw new Error(`Failed to create import session: ${createError.message}. This might be due to CSV size limits.`)
    }
    
    // Process first small batch synchronously (like it used to work)
    // Only skip for Vercel if we detect we're on Vercel (VERCEL env var)
    // For localhost, process first batch to show immediate progress
    const isVercel = process.env.VERCEL === '1'
    const FIRST_BATCH_SIZE = 3 // Small batch to process synchronously for immediate feedback
    
    let rowsProcessedInFirstBatch = 0
    
    if (!isVercel && rows.length > 0) {
      // Process first small batch synchronously on localhost
      const firstBatch = rows.slice(0, Math.min(FIRST_BATCH_SIZE, rows.length))
      
      // #region agent log
      const logData1 = {
        location: 'app/api/import/csv/route.ts:920',
        message: 'Processing first batch synchronously (localhost)',
        data: {
          totalRows: rows.length,
          firstBatchSize: firstBatch.length,
          sessionId: importSession.id,
          strategy: 'sync-first-batch',
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'K',
      };
      console.log('[DEBUG] Processing First Batch:', logData1);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData1) }).catch(() => {});
      // #endregion
      
      try {
        const mappings = mappingConfigWithRows.columns
        const errors: Array<{ row: number; message: string }> = []
        let submissionsCreated = 0
        let submissionsUpdated = 0
        let songsCreated = 0
        let rowsSkipped = 0

        const artistCache = new Map<string, { id: string; name: string }>()
        const employeeCache = new Map<string, string>()
        const channelCache = new Map<string, { id: string; name: string; platform: string }>()
        const caches = { artistCache, employeeCache, channelCache }

        for (let i = 0; i < firstBatch.length; i++) {
          const row = firstBatch[i]
          rowsProcessedInFirstBatch++
          
          try {
            await prisma.$transaction(async (tx) => {
              const result = await processRow(row, i, mappings, tx, caches)
              if (result.success) {
                if (result.releaseCreated) submissionsCreated++
                if (result.releaseUpdated) submissionsUpdated++
                if (result.tracksCreated) songsCreated += result.tracksCreated
              } else {
                errors.push({ row: i + 1, message: result.error || 'Unknown error' })
                rowsSkipped++
              }
            }, { timeout: 30000, maxWait: 5000 })
          } catch (error: any) {
            errors.push({ row: i + 1, message: `Transaction failed: ${error.message || 'Unknown error'}` })
            rowsSkipped++
          }
        }

        // Update progress and stats
        await updateImportSessionProgress(importSession.id, rowsProcessedInFirstBatch)
        
        const updatedMappingConfig = {
          ...mappingConfigWithRows,
          _submissionsCreated: submissionsCreated,
          _submissionsUpdated: submissionsUpdated,
          _songsCreated: songsCreated,
          _rowsSkipped: rowsSkipped,
          _failedRows: errors,
        }

        await prisma.importSession.update({
          where: { id: importSession.id },
          data: { mappingConfig: updatedMappingConfig },
        })

        // #region agent log
        const logDataFirstBatchComplete = {
          location: 'app/api/import/csv/route.ts:980',
          message: 'First batch processed successfully',
          data: {
            sessionId: importSession.id,
            rowsProcessed: rowsProcessedInFirstBatch,
            submissionsCreated,
            submissionsUpdated,
            songsCreated,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'K',
        };
        console.log('[DEBUG] First Batch Complete:', logDataFirstBatchComplete);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFirstBatchComplete) }).catch(() => {});
        // #endregion
      } catch (batchError: any) {
        // #region agent log
        const logDataFirstBatchError = {
          location: 'app/api/import/csv/route.ts:995',
          message: 'First batch processing failed',
          data: {
            sessionId: importSession.id,
            error: batchError.message || 'Unknown error',
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'K',
        };
        console.error('[DEBUG] First Batch Error:', logDataFirstBatchError);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFirstBatchError) }).catch(() => {});
        // #endregion
        // Continue anyway - batch processor will handle remaining rows
        console.error('First batch processing error (batch processor will continue):', batchError)
      }
    } else if (isVercel) {
      // Skip first batch on Vercel (for free tier compatibility)
      // #region agent log
      const logData1 = {
        location: 'app/api/import/csv/route.ts:1010',
        message: 'Skipping first batch processing (Vercel)',
        data: {
          totalRows: rows.length,
          sessionId: importSession.id,
          strategy: 'batch-processor-only',
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'K',
      };
      console.log('[DEBUG] Skipping First Batch (Vercel):', logData1);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData1) }).catch(() => {});
      // #endregion
      
      // Ensure progress is set to 0 in database
      try {
        await updateImportSessionProgress(importSession.id, 0)
      } catch (progressError: any) {
        console.error('Failed to initialize progress:', progressError)
      }
    }
    
    // Calculate needsMore - true if there are more rows to process after first batch
    const needsMore = rows.length > rowsProcessedInFirstBatch
    
    // #region agent log
    const logData8 = {
      location: 'app/api/import/csv/route.ts:850',
      message: 'Returning import start response',
      data: {
        sessionId: importSession.id,
        totalRows: rows.length,
        rowsProcessed: rowsProcessedInFirstBatch,
        needsMore,
        strategy: 'batch-processor-only',
        willCallBatchProcessor: needsMore,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'E',
    };
    console.log('[DEBUG] Import Response:', logData8);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData8) }).catch(() => {});
    // #endregion
    
    // Verify session status in database before returning
    try {
      const verifySession = await prisma.importSession.findUnique({
        where: { id: importSession.id },
        select: { rowsProcessed: true, status: true, totalRows: true },
      })
      
      // #region agent log
      const logDataVerify = {
        location: 'app/api/import/csv/route.ts:895',
        message: 'Verifying session before returning',
        data: {
          sessionId: importSession.id,
          dbRowsProcessed: verifySession?.rowsProcessed || 0,
          dbStatus: verifySession?.status || 'unknown',
          dbTotalRows: verifySession?.totalRows || 0,
          expectedTotalRows: rows.length,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'D',
      };
      console.log('[DEBUG] Session Verification:', logDataVerify);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataVerify) }).catch(() => {});
      // #endregion
    } catch (verifyError: any) {
      // #region agent log
      const logDataVerifyError = {
        location: 'app/api/import/csv/route.ts:905',
        message: 'Failed to verify session',
        data: {
          sessionId: importSession.id,
          error: verifyError.message || 'Unknown error',
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'D',
      };
      console.error('[DEBUG] Session Verification Error:', logDataVerifyError);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataVerifyError) }).catch(() => {});
      // #endregion
      console.error('Failed to verify session:', verifyError)
    }
    
    return NextResponse.json({
      success: true,
      sessionId: importSession.id,
      totalRows: rows.length,
      rowsProcessed: rowsProcessedInFirstBatch,
      message: 'Import started - batch processor will process all rows',
      needsMore, // Always true if there are rows to process (batch processor handles everything)
    })
              } catch (error: any) {
    console.error('CSV import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start import' },
      { status: 500 }
    )
  }
}
