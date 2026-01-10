import { PrismaClient, Prisma, UserRole } from '@prisma/client'
import { ReleaseType, CopyrightStatus, VideoType } from '@prisma/client'

// Types
export interface ParsedRow {
  [key: string]: string
}

export interface ColumnMapping {
  csvColumn: string
  targetField: string | null
  fieldType: 'submission' | 'song'
  songIndex?: number // For numbered song columns (e.g., "Song 1 Producer (archived)")
}

export interface MappingConfig {
  columns: ColumnMapping[]
  songPatterns?: Record<string, string>
  _validationInfo?: {
    totalCSVColumns: number
  }
  _failedRows?: Array<{
    row: number
    data: any
    message: string
  }>
}

export interface SubmissionRecord {
  submissionId?: string
  respondentId?: string
  submittedAt?: Date
  createdTime?: Date
  createdBy?: string
  artistName?: string
  legalName?: string
  signature?: string
  royaltyReceiveMethod?: string
  paymentRemarks?: string
  notes?: string
  releaseType?: ReleaseType
  releaseTitle?: string
  albumId?: string
  releasedDate?: Date
  legacyReleaseDate?: Date
  larsReleasedDate?: Date
  artistsChosenDate?: Date
  assignedAR?: string
  copyrightStatus?: CopyrightStatus
  videoType?: VideoType
  // Platform request fields (stored in rawRow, processed during import)
  fbRequest?: string
  flowRequest?: string
  tiktokRequest?: string
  youtubeRequest?: string
  intlStreamingRequest?: string
  ringtunesRequest?: string
  // Platform status fields (stored in rawRow, processed during import)
  fb?: string
  flow?: string
  tiktok?: string
  youtube?: string
  intlStreaming?: string
  ringtunes?: string
  // Platform channel fields (for platforms that support multiple channels)
  youtubeChannel?: string
  facebookChannel?: string
  tiktokChannel?: string
  flowChannel?: string
  ringtunesChannel?: string
  intlStreamingChannel?: string
  // Other metadata fields (stored in rawRow, processed during import)
  youtubeRemarks?: string
  vuclip?: string
  filezilla?: string
  uploadStatus?: string
  fullyUploaded?: string
  permitStatus?: string
  done?: string
  moreTracks?: string
  rawRow?: any
}

export interface SongRecord {
  name?: string
  artistName?: string
  bandName?: string
  composerName?: string
  recordLabelName?: string
  studioName?: string
  genre?: string
  producerArchived?: string
  performerName?: string
}

// Helper function to check if value is empty
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim().length === 0) return true
  return false
}

// Clean header names
function cleanHeader(header: string): string {
  return header.trim().replace(/^["']|["']$/g, '')
}

// Normalize column names for matching
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

// Parse CSV with proper handling of multi-line cells and escaped quotes
export function parseCSV(content: string): { headers: string[], rows: ParsedRow[] } {
  if (!content || content.trim().length === 0) {
    return { headers: [], rows: [] }
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < content.length) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"'
        i += 2
        continue
      } else {
        inQuotes = !inQuotes
        i++
        continue
      }
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField)
      currentField = ''
      i++
      continue
    }

    if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 2
      } else {
        i++
      }
      
      currentRow.push(currentField)
      currentField = ''
      
      if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      continue
    }

    currentField += char
    i++
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const rawHeaders = rows[0].map(h => h.trim())
  const headers = rawHeaders.map(cleanHeader)

  const parsedRows: ParsedRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const row: ParsedRow = {}
    headers.forEach((header, index) => {
      const normalizedKey = normalizeColumnName(header)
      row[normalizedKey] = (values[index] || '').trim()
      row[header] = (values[index] || '').trim()
    })
    parsedRows.push(row)
  }

  return { headers, rows: parsedRows }
}

// Parse comma-separated list (handles commas, "ft.", "feat.", "featuring", "&", "/" and other dividers)
export function parseCommaSeparatedList(value: string | null | undefined): string[] {
  if (!value || isEmpty(value)) return []
  
  // Normalize common variations
  let normalized = value.trim()
  
  // Handle "Primary Artist (Ft - Secondary Artists)" format
  // Example: "42 (Ft - Phyo Lay, Bo Ae)" means:
  // - Primary: "42"
  // - Secondary: "Phyo Lay", "Bo Ae"
  const ftInBracketsPattern = /\([Ff][Tt]\.?\s*-\s*([^)]+)\)/g
  const ftArtists: string[] = []
  let match
  while ((match = ftInBracketsPattern.exec(normalized)) !== null) {
    // Parse the secondary artists inside the brackets (they may be comma-separated)
    const secondaryArtists = match[1].trim()
    if (secondaryArtists) {
      // Split by comma and add each secondary artist
      const secondaryList = secondaryArtists
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0)
      ftArtists.push(...secondaryList)
    }
  }
  // Remove the (Ft - Name) patterns from the string to get the primary artist(s)
  normalized = normalized.replace(/\([Ff][Tt]\.?\s*-\s*[^)]+\)/g, '').trim()
  
  // Replace common divider patterns with a consistent separator
  // Handle "ft.", "feat.", "featuring", "ft", "feat" (case insensitive, with or without periods)
  normalized = normalized.replace(/\s*(ft\.?|feat\.?|featuring)\s+/gi, '|')
  
  // Handle "&" and "/" as dividers (but preserve them if they're part of a name like "A & B Records")
  // Only split on standalone & or / with spaces around them
  normalized = normalized.replace(/\s+&\s+/g, '|')
  normalized = normalized.replace(/\s+\/\s+/g, '|')
  
  // Split by comma or our custom separator to get primary artist(s)
  const primaryItems = normalized
    .split(/[,\|]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
  
  // Return primary artists first, then secondary artists
  // This ensures the first artist is the primary, and subsequent ones are secondary
  return [...primaryItems, ...ftArtists]
}

// Parse artists from string (handles all divider types)
export function parseArtists(artistString: string | null | undefined): string[] {
  if (!artistString || isEmpty(artistString)) return []
  return parseCommaSeparatedList(artistString)
}

// Parse platform channels from string (handles comma-separated channel names)
// Channels can be specified in format: "Channel 1, Channel 2" or "Channel 1|Channel 2"
export function parsePlatformChannels(channelString: string | null | undefined): string[] {
  if (!channelString || isEmpty(channelString)) return []
  return parseCommaSeparatedList(channelString)
}

// Clean A&R name (remove URLs in brackets, etc.)
export function cleanARName(name: string): string {
  if (!name) return ''
  // Remove URLs in brackets like [https://...]
  let cleaned = name.replace(/\[https?:\/\/[^\]]+\]/gi, '').trim()
  // Remove other common patterns
  cleaned = cleaned.replace(/\([^)]*\)/g, '').trim()
  return cleaned
}

// Find or create artists
export async function findOrCreateArtists(
  artistNames: string[],
  prisma: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  cache?: Map<string, { id: string; name: string }>
): Promise<Array<{ id: string; name: string }>> {
  const artists = []
  
  for (const name of artistNames) {
    if (!name || name.trim().length === 0) continue
    
    const trimmedName = name.trim()
    const cacheKey = trimmedName.toLowerCase()
    
    // Check cache first
    if (cache && cache.has(cacheKey)) {
      const cachedArtist = cache.get(cacheKey)!
      artists.push(cachedArtist)
      continue
    }
    
    // Try to find existing artist
    let artist = await prisma.artist.findFirst({
    where: {
      name: {
          equals: trimmedName,
        mode: 'insensitive',
      },
    },
    })
    
    // If not found, create it
    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: trimmedName,
        },
      })
    }
    
    // Update cache
    if (cache) {
      cache.set(cacheKey, artist)
    }
    
    artists.push(artist)
  }
  
  return artists
}

// Find or create employee by name
export async function findOrCreateEmployeeByName(
  name: string,
  prisma: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  cache?: Map<string, string>
): Promise<string | null> {
  if (!name || name.trim().length === 0) return null
  
  const trimmedName = name.trim()
  const cacheKey = trimmedName.toLowerCase()
  
  // Check cache first
  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }
  
  // Try to find existing employee by user name
  const employee = await prisma.employee.findFirst({
    where: {
      user: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
      },
    },
    include: {
      user: true,
    },
  })
  
  if (employee) {
    // Update cache
    if (cache) {
      cache.set(cacheKey, employee.id)
    }
    return employee.id
  }
  
  // Employee not found - create a new user and employee
  // Generate a unique email based on the name
  const emailBase = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')
  let email = `${emailBase}@imported.local`
  let emailCounter = 1
  
  // Ensure email is unique
  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    if (!existingUser) break
    email = `${emailBase}${emailCounter}@imported.local`
    emailCounter++
  }
  
  // Create user with A&R role
  const user = await prisma.user.create({
    data: {
      email,
      name: trimmedName,
      role: UserRole.A_R,
      // No password - they'll need to reset it to log in
    },
  })
  
  // Generate unique employee ID
  const employeeId = `EMP-${user.id.slice(0, 8).toUpperCase()}`
  
  // Create employee record
  const newEmployee = await prisma.employee.create({
    data: {
      userId: user.id,
      employeeId,
      status: 'ACTIVE',
    },
  })
  
  // Update cache
  if (cache) {
    cache.set(cacheKey, newEmployee.id)
  }
  
  return newEmployee.id
}

// Find or create platform channel
export async function findOrCreatePlatformChannel(
  platform: string,
  channelName: string,
  prisma: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  cache?: Map<string, { id: string; name: string; platform: string }>
): Promise<{ id: string; name: string; platform: string } | null> {
  if (!channelName || channelName.trim().length === 0) return null
  if (!platform || platform.trim().length === 0) return null
  
  const trimmedName = channelName.trim()
  const trimmedPlatform = platform.trim().toLowerCase()
  const cacheKey = `${trimmedPlatform}:${trimmedName.toLowerCase()}`
  
  // Check cache first
  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }
  
  // Try to find existing channel
  let channel = await prisma.platformChannel.findFirst({
    where: {
      platform: trimmedPlatform,
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
    },
  })
  
  // If not found, create it
  if (!channel) {
    channel = await prisma.platformChannel.create({
      data: {
        platform: trimmedPlatform,
        name: trimmedName,
        active: true,
      },
    })
  }
  
  const result = {
    id: channel.id,
    name: channel.name,
    platform: channel.platform,
  }
  
  // Update cache
  if (cache) {
    cache.set(cacheKey, result)
  }
  
  return result
}

// Normalize name for cache key (lowercase, trimmed)
function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

// Batch find or create artists with caching
export async function batchFindOrCreateArtists(
  artistNames: string[],
  prisma: PrismaClient,
  cache: Map<string, { id: string; name: string }>
): Promise<Map<string, { id: string; name: string }>> {
  const result = new Map<string, { id: string; name: string }>()
  const toCreate: string[] = []
  
  // Check cache first
  for (const name of artistNames) {
    if (!name || name.trim().length === 0) continue
    
    const normalized = normalizeName(name)
    const cached = cache.get(normalized)
    
    if (cached) {
      result.set(normalized, cached)
    } else {
      toCreate.push(name.trim())
    }
  }
  
  if (toCreate.length === 0) {
    return result
  }
  
  // Batch fetch existing artists
  const existingArtists = await prisma.artist.findMany({
    where: {
      name: {
        in: toCreate,
        mode: 'insensitive',
      },
    },
  })
  
  // Build map of existing artists
  const existingMap = new Map<string, { id: string; name: string }>()
  for (const artist of existingArtists) {
    const normalized = normalizeName(artist.name)
    existingMap.set(normalized, { id: artist.id, name: artist.name })
    cache.set(normalized, { id: artist.id, name: artist.name })
    result.set(normalized, { id: artist.id, name: artist.name })
  }
  
  // Find which artists need to be created
  const toCreateSet = new Set(toCreate.map(n => normalizeName(n)))
  for (const artist of existingArtists) {
    toCreateSet.delete(normalizeName(artist.name))
  }
  
  // Batch create missing artists
  if (toCreateSet.size > 0) {
    const artistsToCreate = Array.from(toCreateSet).map(normalized => {
      // Find original name (preserve case)
      const original = toCreate.find(name => normalizeName(name) === normalized) || normalized
      return { name: original }
    })
    
    // Create in batches of 100 to avoid query size limits
    const BATCH_SIZE = 100
    for (let i = 0; i < artistsToCreate.length; i += BATCH_SIZE) {
      const batch = artistsToCreate.slice(i, i + BATCH_SIZE)
      const created = await prisma.artist.createMany({
        data: batch,
        skipDuplicates: true,
      })
      
      // Fetch the created artists to get their IDs
      if (created.count > 0) {
        const createdArtists = await prisma.artist.findMany({
          where: {
            name: {
              in: batch.map(a => a.name),
              mode: 'insensitive',
            },
          },
        })
        
        for (const artist of createdArtists) {
          const normalized = normalizeName(artist.name)
          const artistData = { id: artist.id, name: artist.name }
          cache.set(normalized, artistData)
          result.set(normalized, artistData)
        }
      }
    }
  }

  return result
}

// Batch find employees with caching
export async function batchFindEmployees(
  arNames: string[],
  prisma: PrismaClient,
  cache: Map<string, { id: string; name: string }>
): Promise<Map<string, { id: string; name: string }>> {
  const result = new Map<string, { id: string; name: string }>()
  const toLookup: string[] = []
  
  // Check cache first
  for (const name of arNames) {
    if (!name || name.trim().length === 0) continue
    
    const normalized = normalizeName(name)
    const cached = cache.get(normalized)
    
    if (cached) {
      result.set(normalized, cached)
    } else {
      toLookup.push(name.trim())
    }
  }
  
  if (toLookup.length === 0) {
    return result
  }
  
  // Batch fetch existing employees
  const existingEmployees = await prisma.employee.findMany({
    where: {
      user: {
        name: {
          in: toLookup,
          mode: 'insensitive',
        },
      },
    },
    include: {
      user: true,
    },
  })
  
  // Build map of existing employees
  for (const employee of existingEmployees) {
    if (employee.user?.name) {
      const normalized = normalizeName(employee.user.name)
      const employeeData = { id: employee.id, name: employee.user.name }
      cache.set(normalized, employeeData)
      result.set(normalized, employeeData)
    }
  }
  
  return result
}

// Batch find releases by submissionId
export async function batchFindReleases(
  submissionIds: string[],
  prisma: PrismaClient
): Promise<Map<string, any>> {
  if (submissionIds.length === 0) {
    return new Map()
  }
  
  // Filter out null/undefined/empty submissionIds
  const validIds = submissionIds.filter(id => id && id.trim().length > 0)
  
  if (validIds.length === 0) {
    return new Map()
  }
  
  // Batch fetch in chunks to avoid query size limits
  const BATCH_SIZE = 1000
  const result = new Map<string, any>()
  
  for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
    const batch = validIds.slice(i, i + BATCH_SIZE)
    const releases = await prisma.release.findMany({
      where: {
        submissionId: {
          in: batch,
        },
      },
    })
    
    for (const release of releases) {
      if (release.submissionId) {
        result.set(release.submissionId, release)
      }
    }
  }
  
  return result
}

// Parse boolean values
export function parseBoolean(value: string | null | undefined): boolean {
  if (!value) return false
  const lower = value.toLowerCase().trim()
  return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'y'
}

// Extract submission data from a parsed row
// Uses strict column mapping - only processes explicitly mapped columns
export function extractSubmissionData(
  row: ParsedRow,
  mappings: ColumnMapping[]
): SubmissionRecord {
  const submission: SubmissionRecord = {}
  
  // Store all unmapped fields for preservation
  const unmappedFields: Record<string, string> = {}
  
  // Process all submission mappings to ensure no data is left behind
  for (const mapping of mappings) {
    if (mapping.fieldType !== 'submission') continue
    
    // Use the exact column name from the mapping first (strict column mapping)
    // Fall back to normalized version only for case/whitespace variations
    const columnName = mapping.csvColumn
    // Try exact match first, then normalized, then check if column exists in row at all
    let value = row[columnName]
    if (value === undefined || value === null || value === '') {
      value = row[normalizeColumnName(columnName)]
    }
    if (value === undefined || value === null || value === '') {
      // Last resort: check if any key in row matches (case-insensitive)
      const normalizedTarget = normalizeColumnName(columnName)
      for (const key in row) {
        if (normalizeColumnName(key) === normalizedTarget) {
          value = row[key]
          if (value && value !== '') break
        }
      }
    }
    // Also try trimming the column name in case there are extra spaces
    if ((value === undefined || value === null || value === '') && columnName.trim() !== columnName) {
      value = row[columnName.trim()]
    }
    // Default to empty string if still not found
    value = value ?? ''
    
    // If this field doesn't have a specific case handler, store it in unmappedFields
    // We'll check this after the switch statement
    
    switch (mapping.targetField) {
      // Submission metadata
      case 'submissionId':
        submission.submissionId = value || undefined
        break
      case 'respondentId':
        submission.respondentId = value || undefined
        break
      case 'submittedAt':
        if (value) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            submission.submittedAt = date
          }
        }
        break
      case 'createdTime':
        if (value) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            submission.createdTime = date
          }
        }
        break
      case 'createdBy':
        submission.createdBy = value || undefined
        break
      
      // Artist fields
      case 'artistName':
        submission.artistName = value && value.trim() ? value.trim() : undefined
        break
      case 'legalName':
        submission.legalName = value && value.trim() ? value.trim() : undefined
        break
      case 'signature':
        submission.signature = value && value.trim() ? value.trim() : undefined
        break
      case 'royaltyReceiveMethod':
        submission.royaltyReceiveMethod = value && value.trim() ? value.trim() : undefined
        break
      
      // Release fields
      case 'releaseTitle':
        submission.releaseTitle = value && value.trim() ? value.trim() : undefined
        // If not found via mapping, try common column name variations
        if (!submission.releaseTitle) {
          // Try common variations
          const variations = [
            'Album/Single Name',
            'Album/Single',
            'Release Title',
            'Title',
            'Album Name',
            'Single Name',
            'Release Name',
          ]
          for (const variant of variations) {
            const variantValue = row[variant] || row[normalizeColumnName(variant)]
            if (variantValue && variantValue.trim()) {
              submission.releaseTitle = variantValue.trim()
              break
            }
          }
        }
        break
      case 'releaseType':
        const typeLower = value.toLowerCase()
        if (typeLower.includes('album')) {
          submission.releaseType = ReleaseType.ALBUM
        } else {
          submission.releaseType = ReleaseType.SINGLE
        }
        break
      case 'albumId':
        submission.albumId = value || undefined
        break
      
      // Date fields
      case 'artistsChosenDate':
        if (value) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            submission.artistsChosenDate = date
          }
        }
        break
      case 'releasedDate':
        if (value) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            submission.releasedDate = date
          }
        }
        break
      case 'legacyReleaseDate':
        if (value) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            submission.legacyReleaseDate = date
          }
        }
        break
      case 'larsReleasedDate':
        if (value) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            submission.larsReleasedDate = date
          }
        }
        break
      
      // A&R field
      case 'assignedAR':
        submission.assignedAR = value || undefined
        break
      
      // Platform request fields
      case 'fbRequest':
        submission.fbRequest = value && value.trim() ? value.trim() : undefined
        break
      case 'flowRequest':
        submission.flowRequest = value && value.trim() ? value.trim() : undefined
        break
      case 'tiktokRequest':
        submission.tiktokRequest = value && value.trim() ? value.trim() : undefined
        break
      case 'youtubeRequest':
        submission.youtubeRequest = value && value.trim() ? value.trim() : undefined
        break
      case 'intlStreamingRequest':
        submission.intlStreamingRequest = value && value.trim() ? value.trim() : undefined
        break
      case 'ringtunesRequest':
        submission.ringtunesRequest = value && value.trim() ? value.trim() : undefined
        break
      
      // Platform status fields
      case 'fb':
        submission.fb = value && value.trim() ? value.trim() : undefined
        break
      case 'flow':
        submission.flow = value && value.trim() ? value.trim() : undefined
        break
      case 'tiktok':
        submission.tiktok = value && value.trim() ? value.trim() : undefined
        break
      case 'youtube':
        submission.youtube = value && value.trim() ? value.trim() : undefined
        break
      case 'intlStreaming':
        submission.intlStreaming = value && value.trim() ? value.trim() : undefined
        break
      case 'ringtunes':
        submission.ringtunes = value && value.trim() ? value.trim() : undefined
        break
      
      // Platform channel fields
      case 'youtubeChannel':
        submission.youtubeChannel = value && value.trim() ? value.trim() : undefined
        break
      case 'facebookChannel':
        submission.facebookChannel = value && value.trim() ? value.trim() : undefined
        break
      case 'tiktokChannel':
        submission.tiktokChannel = value && value.trim() ? value.trim() : undefined
        break
      case 'flowChannel':
        submission.flowChannel = value && value.trim() ? value.trim() : undefined
        break
      case 'ringtunesChannel':
        submission.ringtunesChannel = value && value.trim() ? value.trim() : undefined
        break
      case 'intlStreamingChannel':
        submission.intlStreamingChannel = value && value.trim() ? value.trim() : undefined
        break
      
      // Other metadata fields
      case 'paymentRemarks':
        submission.paymentRemarks = value || undefined
        break
      case 'notes':
        submission.notes = value || undefined
        break
      case 'youtubeRemarks':
        submission.youtubeRemarks = value && value.trim() ? value.trim() : undefined
        break
      case 'vuclip':
        submission.vuclip = value && value.trim() ? value.trim() : undefined
        break
      case 'filezilla':
        submission.filezilla = value && value.trim() ? value.trim() : undefined
        break
      case 'uploadStatus':
        submission.uploadStatus = value && value.trim() ? value.trim() : undefined
        break
      case 'fullyUploaded':
        submission.fullyUploaded = value && value.trim() ? value.trim() : undefined
        break
      case 'permitStatus':
        submission.permitStatus = value && value.trim() ? value.trim() : undefined
        break
      case 'done':
        submission.done = value && value.trim() ? value.trim() : undefined
        break
      case 'moreTracks':
        submission.moreTracks = value && value.trim() ? value.trim() : undefined
        break
      
      case 'copyrightStatus':
        const cs = value.toLowerCase()
        if (cs.includes('original')) {
          submission.copyrightStatus = CopyrightStatus.ORIGINAL
        } else if (cs.includes('cover')) {
          submission.copyrightStatus = CopyrightStatus.COVER
        } else if (cs.includes('international')) {
          submission.copyrightStatus = CopyrightStatus.INTERNATIONAL
        }
        break
      case 'videoType':
        const vt = value.toLowerCase()
        if (vt.includes('music') || vt.includes('mv')) {
          submission.videoType = VideoType.MUSIC_VIDEO
        } else if (vt.includes('lyrics')) {
          submission.videoType = VideoType.LYRICS_VIDEO
        } else {
          submission.videoType = VideoType.NONE
        }
        break
      default:
        // For any unmapped fields, store them in unmappedFields
        // This ensures no data is lost even if we don't have a specific handler
        if (value && value.trim().length > 0) {
          unmappedFields[mapping.targetField] = value.trim()
        }
        break
    }
  }
  
  // Store all unmapped fields in the submission for preservation
  if (Object.keys(unmappedFields).length > 0) {
    submission.rawRow = { ...row, unmappedFields }
  } else {
    submission.rawRow = row
  }
  
  return submission
}

// Extract songs from a parsed row
// Uses strict column mapping - only processes explicitly mapped columns
export function extractSongs(
  row: ParsedRow,
  mappings: ColumnMapping[],
  songPatterns?: Record<string, string>
): SongRecord[] {
  const songs: SongRecord[] = []
  
  // Filter to only song mappings
  const songMappings = mappings.filter(m => m.fieldType === 'song')
  
  // Check if we have numbered song columns (Song 1 Name, Song 2 Name, etc.)
  const hasNumberedSongs = songMappings.some(m => /song[_\s]*\d+/i.test(m.csvColumn))
  
  if (hasNumberedSongs) {
    // Multiple songs per row - extract each song using exact mapped column names
    const songNumbers = new Set<number>()
    
    // Find all unique song numbers from the mappings themselves (strict mapping)
    for (const mapping of songMappings) {
      const match = mapping.csvColumn.match(/song[_\s]*(\d+)/i)
      if (match) {
        songNumbers.add(parseInt(match[1]))
      }
    }
    
    // Extract each song using the exact mapped columns
    for (const songNum of Array.from(songNumbers).sort((a, b) => a - b)) {
      const song: SongRecord = {}
      
      // For each song field, find the mapping for this specific song number
      for (const mapping of songMappings) {
        // Check if this mapping is for this song number
        const match = mapping.csvColumn.match(/song[_\s]*(\d+)/i)
        if (!match || parseInt(match[1]) !== songNum) continue
        
        // Use the exact column name from the mapping (strict column mapping)
        const columnName = mapping.csvColumn
        // Try exact match first, then normalized
        const value = row[columnName] || row[normalizeColumnName(columnName)] || ''
        
        switch (mapping.targetField) {
          case 'name':
            song.name = value || undefined
            break
          case 'artistName':
            song.artistName = value || undefined
            break
          case 'composerName':
            song.composerName = value || undefined
            break
          case 'performerName':
            song.performerName = value || undefined
            break
          case 'bandName':
            song.bandName = value || undefined
            break
          case 'studioName':
            song.studioName = value || undefined
            break
          case 'recordLabelName':
            song.recordLabelName = value || undefined
            break
          case 'genre':
            song.genre = value || undefined
            break
          case 'producerArchived':
            song.producerArchived = value || undefined
            break
        }
      }
      
      // Only add song if it has a name (required field)
      if (song.name) {
        songs.push(song)
      }
    }
  } else {
    // Single song per row - extract from direct mappings (strict column mapping)
    const song: SongRecord = {}
    
    // Process all song mappings to ensure no data is left behind
    for (const mapping of songMappings) {
      // Use the exact column name from the mapping (strict column mapping)
      const columnName = mapping.csvColumn
      // Try exact match first, then normalized version for case/whitespace variations
      const value = row[columnName] || row[normalizeColumnName(columnName)] || ''
      
      switch (mapping.targetField) {
        case 'name':
          song.name = value || undefined
          break
        case 'artistName':
          song.artistName = value || undefined
          break
        case 'composerName':
          song.composerName = value || undefined
          break
        case 'performerName':
          song.performerName = value || undefined
          break
        case 'bandName':
          song.bandName = value || undefined
          break
        case 'studioName':
          song.studioName = value || undefined
          break
        case 'recordLabelName':
          song.recordLabelName = value || undefined
          break
        case 'genre':
          song.genre = value || undefined
          break
        case 'producerArchived':
          song.producerArchived = value || undefined
          break
      }
    }
    
    // Only add song if it has a name (required field)
    if (song.name) {
      songs.push(song)
    }
  }
  
  return songs
}

// Auto-detect column mappings
export function autoDetectMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  
  // Comprehensive field patterns - order matters (most specific first)
  const fieldPatterns: Array<{ pattern: RegExp; field: string; type: 'submission' | 'song' }> = [
    // Submission metadata fields
    { pattern: /^submission[_\s]*id$/i, field: 'submissionId', type: 'submission' },
    { pattern: /^respondent[_\s]*id$/i, field: 'respondentId', type: 'submission' },
    { pattern: /^submitted[_\s]*at$/i, field: 'submittedAt', type: 'submission' },
    { pattern: /^created[_\s]*time$/i, field: 'createdTime', type: 'submission' },
    { pattern: /^created[_\s]*by$/i, field: 'createdBy', type: 'submission' },
    
    // Artist fields
    { pattern: /^artist[_\s]*name$/i, field: 'artistName', type: 'submission' },
    { pattern: /^legal[_\s]*name$/i, field: 'legalName', type: 'submission' },
    { pattern: /^signature$/i, field: 'signature', type: 'submission' },
    { pattern: /^royalty[_\s]*receive[_\s]*method$/i, field: 'royaltyReceiveMethod', type: 'submission' },
    
    // Release fields - comprehensive patterns for release title
    // Order matters: more specific patterns first
    { pattern: /^(album|single)[_\s]*(name|title)$/i, field: 'releaseTitle', type: 'submission' },
    { pattern: /^(album|single)[_\s]*name$/i, field: 'releaseTitle', type: 'submission' },
    { pattern: /^release[_\s]*title$/i, field: 'releaseTitle', type: 'submission' },
    { pattern: /^release[_\s]*name$/i, field: 'releaseTitle', type: 'submission' },
    { pattern: /^album[_\s]*\/[_\s]*single[_\s]*name$/i, field: 'releaseTitle', type: 'submission' },
    // Note: "title" and "name" alone are too generic - they might match artist name
    // Users should manually map these if needed
    { pattern: /^release[_\s]*type$/i, field: 'releaseType', type: 'submission' },
    { pattern: /^(single|album)[\?]?$/i, field: 'releaseType', type: 'submission' },
    { pattern: /^album[_\s]*id$/i, field: 'albumId', type: 'submission' },
    
    // Date fields (most specific first)
    { pattern: /^artist['s]?[_\s]*chosen[_\s]*date$/i, field: 'artistsChosenDate', type: 'submission' },
    { pattern: /^lars[_\s]*released?[_\s]*date$/i, field: 'larsReleasedDate', type: 'submission' },
    { pattern: /^legacy[_\s]*release[_\s]*date$/i, field: 'legacyReleaseDate', type: 'submission' },
    { pattern: /^released?[_\s]*date$/i, field: 'releasedDate', type: 'submission' },
    
    // A&R field - expanded patterns to catch more variations
    { pattern: /^assigned[_\s]*a[&_]?r$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^a[&_]?r[_\s]*assigned$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^a[&_]?r$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^assigned[_\s]*a[&_]?r[_\s]*name$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^a[&_]?r[_\s]*name$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^a[&_]?r[_\s]*person$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^a[&_]?r[_\s]*employee$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^a[&_]?r[_\s]*staff$/i, field: 'assignedAR', type: 'submission' },
    { pattern: /^a[&_]?r[_\s]*contact$/i, field: 'assignedAR', type: 'submission' },
    
    // Platform request fields
    { pattern: /^facebook[_\s]*request$/i, field: 'fbRequest', type: 'submission' },
    { pattern: /^fb[_\s]*request$/i, field: 'fbRequest', type: 'submission' },
    { pattern: /^flow[_\s]*request$/i, field: 'flowRequest', type: 'submission' },
    { pattern: /^tiktok[_\s]*request$/i, field: 'tiktokRequest', type: 'submission' },
    { pattern: /^youtube[_\s]*request$/i, field: 'youtubeRequest', type: 'submission' },
    { pattern: /^international[_\s]*streaming[_\s]*request$/i, field: 'intlStreamingRequest', type: 'submission' },
    { pattern: /^intl[_\s]*streaming[_\s]*request$/i, field: 'intlStreamingRequest', type: 'submission' },
    { pattern: /^ringtunes[_\s]*request$/i, field: 'ringtunesRequest', type: 'submission' },
    
    // Platform status fields
    { pattern: /^facebook[_\s]*(status)?$/i, field: 'fb', type: 'submission' },
    { pattern: /^fb[_\s]*(status)?$/i, field: 'fb', type: 'submission' },
    { pattern: /^flow[_\s]*(status)?$/i, field: 'flow', type: 'submission' },
    { pattern: /^tiktok[_\s]*(status)?$/i, field: 'tiktok', type: 'submission' },
    { pattern: /^youtube[_\s]*(status)?$/i, field: 'youtube', type: 'submission' },
    { pattern: /^international[_\s]*streaming[_\s]*(status)?$/i, field: 'intlStreaming', type: 'submission' },
    { pattern: /^intl[_\s]*streaming[_\s]*(status)?$/i, field: 'intlStreaming', type: 'submission' },
    { pattern: /^ringtunes[_\s]*(status)?$/i, field: 'ringtunes', type: 'submission' },
    
    // Platform channel fields (for platforms that support multiple channels)
    { pattern: /^youtube[_\s]*channel$/i, field: 'youtubeChannel', type: 'submission' },
    { pattern: /^youtube[_\s]*request[_\s]*channel$/i, field: 'youtubeChannel', type: 'submission' },
    { pattern: /^facebook[_\s]*channel$/i, field: 'facebookChannel', type: 'submission' },
    { pattern: /^fb[_\s]*channel$/i, field: 'facebookChannel', type: 'submission' },
    { pattern: /^facebook[_\s]*request[_\s]*channel$/i, field: 'facebookChannel', type: 'submission' },
    { pattern: /^tiktok[_\s]*channel$/i, field: 'tiktokChannel', type: 'submission' },
    { pattern: /^tiktok[_\s]*request[_\s]*channel$/i, field: 'tiktokChannel', type: 'submission' },
    { pattern: /^flow[_\s]*channel$/i, field: 'flowChannel', type: 'submission' },
    { pattern: /^flow[_\s]*request[_\s]*channel$/i, field: 'flowChannel', type: 'submission' },
    { pattern: /^ringtunes[_\s]*channel$/i, field: 'ringtunesChannel', type: 'submission' },
    { pattern: /^ringtunes[_\s]*request[_\s]*channel$/i, field: 'ringtunesChannel', type: 'submission' },
    { pattern: /^international[_\s]*streaming[_\s]*channel$/i, field: 'intlStreamingChannel', type: 'submission' },
    { pattern: /^intl[_\s]*streaming[_\s]*channel$/i, field: 'intlStreamingChannel', type: 'submission' },
    { pattern: /^intl[_\s]*streaming[_\s]*request[_\s]*channel$/i, field: 'intlStreamingChannel', type: 'submission' },
    
    // Other metadata fields
    { pattern: /^payment[_\s]*remarks$/i, field: 'paymentRemarks', type: 'submission' },
    { pattern: /^notes$/i, field: 'notes', type: 'submission' },
    { pattern: /^youtube[_\s]*remarks$/i, field: 'youtubeRemarks', type: 'submission' },
    { pattern: /^vuclip$/i, field: 'vuclip', type: 'submission' },
    { pattern: /^filezilla$/i, field: 'filezilla', type: 'submission' },
    { pattern: /^upload[_\s]*status$/i, field: 'uploadStatus', type: 'submission' },
    { pattern: /^fully[_\s]*uploaded$/i, field: 'fullyUploaded', type: 'submission' },
    { pattern: /^permit[_\s]*status$/i, field: 'permitStatus', type: 'submission' },
    { pattern: /^copyright[_\s]*status$/i, field: 'copyrightStatus', type: 'submission' },
    { pattern: /^video[_\s]*type$/i, field: 'videoType', type: 'submission' },
    { pattern: /^done$/i, field: 'done', type: 'submission' },
    { pattern: /^more[_\s]*tracks$/i, field: 'moreTracks', type: 'submission' },
    
    // Numbered song fields (check these FIRST - most specific patterns)
    // Patterns like "Song 1 Name", "Song 2 Name", "Song 1 Composer", etc.
    { pattern: /^song[_\s]*\d+[_\s]*name$/i, field: 'name', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*composer[_\s]*name?$/i, field: 'composerName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*composer$/i, field: 'composerName', type: 'song' },
    // Producer Archived patterns - most specific first (numbered songs)
    // Handle variations like "Song X Song Produce (Archived)" or "Song X Song Producer (Archived)"
    // Note: Some CSVs have typos like "Produce" instead of "Producer" or duplicate "Song" word
    { pattern: /^song[_\s]*\d+[_\s]*song[_\s]*(?:produce|producer)[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*song[_\s]*(?:produce|producer)[_\s]*\(archived\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*song[_\s]*(?:produce|producer)[_\s]*\([_\s]*Archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*song[_\s]*(?:produce|producer)[_\s]*archived[_\s]*name$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*song[_\s]*(?:produce|producer)[_\s]*archived$/i, field: 'producerArchived', type: 'song' },
    // Standard "Song X Producer (archived)" variations - most specific first
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*\(archived\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*\([_\s]*Archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*archived[_\s]*name$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*archived$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*music[_\s]*producer[_\s]*archived$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*music[_\s]*producer[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*\([_\s]*archived[_\s]*\)[_\s]*name$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*name[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer[_\s]*name$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*producer$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*music[_\s]*producer$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*band[_\s]*\/[_\s]*music[_\s]*producer$/i, field: 'producerArchived', type: 'song' },
    // Handle typos: "Produce" instead of "Producer"
    { pattern: /^song[_\s]*\d+[_\s]*produce[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*produce[_\s]*archived$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*performer[_\s]*name?$/i, field: 'performerName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*performer$/i, field: 'performerName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*band[_\s]*name?$/i, field: 'bandName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*band$/i, field: 'bandName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*artist[_\s]*name?$/i, field: 'artistName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*studio[_\s]*name?$/i, field: 'studioName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*studio$/i, field: 'studioName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*record[_\s]*label[_\s]*name?$/i, field: 'recordLabelName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*record[_\s]*label$/i, field: 'recordLabelName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*label$/i, field: 'recordLabelName', type: 'song' },
    { pattern: /^song[_\s]*\d+[_\s]*genre$/i, field: 'genre', type: 'song' },
    
    // Non-numbered song fields (check these after numbered patterns)
    { pattern: /^song[_\s]*name$/i, field: 'name', type: 'song' },
    { pattern: /^track[_\s]*name$/i, field: 'name', type: 'song' },
    { pattern: /^song[_\s]*artist[_\s]*name$/i, field: 'artistName', type: 'song' },
    { pattern: /^band[_\s]*name$/i, field: 'bandName', type: 'song' },
    { pattern: /^composer[_\s]*name$/i, field: 'composerName', type: 'song' },
    { pattern: /^composer$/i, field: 'composerName', type: 'song' },
    { pattern: /^record[_\s]*label[_\s]*name$/i, field: 'recordLabelName', type: 'song' },
    { pattern: /^studio[_\s]*name$/i, field: 'studioName', type: 'song' },
    { pattern: /^studio$/i, field: 'studioName', type: 'song' },
    { pattern: /^genre$/i, field: 'genre', type: 'song' },
    // Producer Archived patterns - most specific first (non-numbered)
    // Handle "Song X Song Produce/Producer" format (duplicate Song word) even without numbers in pattern
    { pattern: /^song[_\s]*song[_\s]*(?:produce|producer)[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    // Match exact "Producer (archived)" or "Producer (Archived)" variations first
    { pattern: /^producer[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^producer[_\s]*\(archived\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^producer[_\s]*archived[_\s]*name$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^producer[_\s]*archived$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^producer[_\s]*\([_\s]*archived[_\s]*\)[_\s]*name$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^producer[_\s]*name[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^music[_\s]*producer[_\s]*archived$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^music[_\s]*producer[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    // Handle typos: "Produce" instead of "Producer" (non-numbered)
    { pattern: /^produce[_\s]*\([_\s]*archived[_\s]*\)$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^produce[_\s]*archived$/i, field: 'producerArchived', type: 'song' },
    // More general patterns (less specific, but match common variations)
    { pattern: /^producer[_\s]*name$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^music[_\s]*producer$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^band[_\s]*\/[_\s]*music[_\s]*producer$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^producer$/i, field: 'producerArchived', type: 'song' },
    { pattern: /^performer[_\s]*name$/i, field: 'performerName', type: 'song' },
    { pattern: /^performer$/i, field: 'performerName', type: 'song' },
  ]
  
  const matchedHeaders = new Set<string>()
  
  for (const header of headers) {
    const normalized = normalizeColumnName(header)
    let matched = false
    
    // Check patterns in order (most specific first)
    for (const { pattern, field, type } of fieldPatterns) {
      if (pattern.test(header) || pattern.test(normalized)) {
        // Extract song index for numbered song columns (e.g., "Song 1 Producer (archived)" or "Song 10 Song Produce (Archived)")
        let songIndex: number | undefined = undefined
        if (type === 'song') {
          // Try multiple patterns to extract song number
          // Handle formats like:
          // - "Song 1 Producer (archived)"
          // - "Song 10 Song Produce (Archived)" (duplicate Song word)
          // - "song_1_producer" (normalized)
          const songMatch1 = header.match(/^song[_\s]*(\d+)/i)
          const songMatch2 = header.match(/\bsong[_\s]*(\d+)/i) // Find first number after "song"
          const songMatch3 = normalized.match(/song[_\s]*(\d+)/)
          // For "Song X Song..." format, the first number is the song index
          const match = songMatch1 || songMatch2 || songMatch3
          if (match) {
            songIndex = parseInt(match[1], 10)
          }
        }
        
        // Add the mapping - numbered song fields now have songIndex set
        mappings.push({
          csvColumn: header,
          targetField: field,
          fieldType: type,
          songIndex: songIndex, // Set to undefined if not a numbered song column
        })
        matchedHeaders.add(header)
        matched = true
        break
      }
    }
    
    // If no pattern matched, still include the column so user can manually map it
    if (!matched) {
      mappings.push({
        csvColumn: header,
        targetField: null,
        fieldType: 'submission', // Default to submission type
      })
    }
  }
  
  return mappings
}

// Build song patterns for multiple songs per row
// Returns a map of targetField -> template pattern that can generate column names for any song number
// The template uses {n} as a placeholder for the song number
export function buildSongPatterns(mappings: ColumnMapping[]): Record<string, string> {
  const patterns: Record<string, string> = {}
  
  // Group mappings by targetField to find the pattern structure
  const fieldGroups: Record<string, Array<{ csvColumn: string; songNum: number }>> = {}
  
  // Collect all numbered song columns
  for (const mapping of mappings) {
    if (mapping.fieldType !== 'song') continue
    
    const match = mapping.csvColumn.match(/song[_\s]*(\d+)[_\s]*(.+)/i)
    if (match) {
      const songNum = parseInt(match[1])
      const restOfName = match[2].trim()
      
      if (!fieldGroups[mapping.targetField]) {
        fieldGroups[mapping.targetField] = []
      }
      fieldGroups[mapping.targetField].push({
        csvColumn: mapping.csvColumn,
        songNum,
      })
    }
  }
  
  // For each targetField, create a template pattern
  for (const [targetField, columns] of Object.entries(fieldGroups)) {
    if (columns.length === 0) continue
    
    // Use the first column as a reference to build the template
    const firstColumn = columns[0].csvColumn
    const firstMatch = firstColumn.match(/^(.*?song[_\s]*)(\d+)([_\s]*.+)$/i)
    
    if (firstMatch) {
      const prefix = firstMatch[1] // "Song " or "song_"
      const suffix = firstMatch[3] // " Name" or "_name" or " Name"
      
      // Create template: prefix + "{n}" + suffix
      // Keep original formatting (spaces, underscores) from the CSV
      const template = `${prefix}{n}${suffix}`
      
      patterns[targetField] = template
    } else {
      // Fallback: replace the first number found with {n}
      const template = firstColumn.replace(/(\d+)/, '{n}')
      patterns[targetField] = template
    }
  }

  return patterns
}
