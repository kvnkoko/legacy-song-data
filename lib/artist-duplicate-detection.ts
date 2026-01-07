/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate similarity ratio between two strings (0-1, where 1 is identical)
 */
function similarityRatio(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return 1 - distance / maxLen
}

/**
 * Normalize string for comparison (remove extra spaces, special chars)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

export interface ArtistDuplicate {
  artist1: {
    id: string
    name: string
    legalName: string | null
  }
  artist2: {
    id: string
    name: string
    legalName: string | null
  }
  similarity: number
  reason: 'name_match' | 'legal_name_match' | 'similar_name' | 'similar_legal_name'
}

export interface ArtistWithCounts {
  id: string
  name: string
  legalName: string | null
  _count?: {
    releases?: number
    trackArtists?: number
  }
}

/**
 * Find potential duplicate artists
 */
export function findDuplicateArtists(
  artists: ArtistWithCounts[],
  threshold: number = 0.85
): ArtistDuplicate[] {
  const duplicates: ArtistDuplicate[] = []
  const processed = new Set<string>()

  for (let i = 0; i < artists.length; i++) {
    const artist1 = artists[i]
    if (processed.has(artist1.id)) continue

    for (let j = i + 1; j < artists.length; j++) {
      const artist2 = artists[j]
      if (processed.has(artist2.id)) continue

      const name1 = normalizeString(artist1.name)
      const name2 = normalizeString(artist2.name)
      const legalName1 = artist1.legalName ? normalizeString(artist1.legalName) : null
      const legalName2 = artist2.legalName ? normalizeString(artist2.legalName) : null

      // Check exact name match (case-insensitive)
      if (name1 === name2 && name1.length > 0) {
        duplicates.push({
          artist1: { id: artist1.id, name: artist1.name, legalName: artist1.legalName },
          artist2: { id: artist2.id, name: artist2.name, legalName: artist2.legalName },
          similarity: 1.0,
          reason: 'name_match',
        })
        continue
      }

      // Check legal name match
      if (legalName1 && legalName2 && legalName1 === legalName2 && legalName1.length > 0) {
        duplicates.push({
          artist1: { id: artist1.id, name: artist1.name, legalName: artist1.legalName },
          artist2: { id: artist2.id, name: artist2.name, legalName: artist2.legalName },
          similarity: 1.0,
          reason: 'legal_name_match',
        })
        continue
      }

      // Check similar names
      const nameSimilarity = similarityRatio(name1, name2)
      if (nameSimilarity >= threshold && name1.length > 2 && name2.length > 2) {
        duplicates.push({
          artist1: { id: artist1.id, name: artist1.name, legalName: artist1.legalName },
          artist2: { id: artist2.id, name: artist2.name, legalName: artist2.legalName },
          similarity: nameSimilarity,
          reason: 'similar_name',
        })
        continue
      }

      // Check similar legal names
      if (legalName1 && legalName2) {
        const legalNameSimilarity = similarityRatio(legalName1, legalName2)
        if (legalNameSimilarity >= threshold && legalName1.length > 2 && legalName2.length > 2) {
          duplicates.push({
            artist1: { id: artist1.id, name: artist1.name, legalName: artist1.legalName },
            artist2: { id: artist2.id, name: artist2.name, legalName: artist2.legalName },
            similarity: legalNameSimilarity,
            reason: 'similar_legal_name',
          })
          continue
        }
      }

      // Check if one name matches the other's legal name
      if (legalName1 && name2 === legalName1) {
        duplicates.push({
          artist1: { id: artist1.id, name: artist1.name, legalName: artist1.legalName },
          artist2: { id: artist2.id, name: artist2.name, legalName: artist2.legalName },
          similarity: 1.0,
          reason: 'name_match',
        })
        continue
      }

      if (legalName2 && name1 === legalName2) {
        duplicates.push({
          artist1: { id: artist1.id, name: artist1.name, legalName: artist1.legalName },
          artist2: { id: artist2.id, name: artist2.name, legalName: artist2.legalName },
          similarity: 1.0,
          reason: 'name_match',
        })
        continue
      }
    }
  }

  // Sort by similarity (highest first)
  return duplicates.sort((a, b) => b.similarity - a.similarity)
}

/**
 * Find potential duplicates for a specific artist
 */
export function findDuplicatesForArtist(
  artist: ArtistWithCounts,
  allArtists: ArtistWithCounts[],
  threshold: number = 0.85
): ArtistDuplicate[] {
  const duplicates: ArtistDuplicate[] = []

  for (const otherArtist of allArtists) {
    if (otherArtist.id === artist.id) continue

    const name1 = normalizeString(artist.name)
    const name2 = normalizeString(otherArtist.name)
    const legalName1 = artist.legalName ? normalizeString(artist.legalName) : null
    const legalName2 = otherArtist.legalName ? normalizeString(otherArtist.legalName) : null

    // Check exact name match
    if (name1 === name2 && name1.length > 0) {
      duplicates.push({
        artist1: { id: artist.id, name: artist.name, legalName: artist.legalName },
        artist2: { id: otherArtist.id, name: otherArtist.name, legalName: otherArtist.legalName },
        similarity: 1.0,
        reason: 'name_match',
      })
      continue
    }

    // Check legal name match
    if (legalName1 && legalName2 && legalName1 === legalName2 && legalName1.length > 0) {
      duplicates.push({
        artist1: { id: artist.id, name: artist.name, legalName: artist.legalName },
        artist2: { id: otherArtist.id, name: otherArtist.name, legalName: otherArtist.legalName },
        similarity: 1.0,
        reason: 'legal_name_match',
      })
      continue
    }

    // Check similar names
    const nameSimilarity = similarityRatio(name1, name2)
    if (nameSimilarity >= threshold && name1.length > 2 && name2.length > 2) {
      duplicates.push({
        artist1: { id: artist.id, name: artist.name, legalName: artist.legalName },
        artist2: { id: otherArtist.id, name: otherArtist.name, legalName: otherArtist.legalName },
        similarity: nameSimilarity,
        reason: 'similar_name',
      })
      continue
    }

    // Check similar legal names
    if (legalName1 && legalName2) {
      const legalNameSimilarity = similarityRatio(legalName1, legalName2)
      if (legalNameSimilarity >= threshold && legalName1.length > 2 && legalName2.length > 2) {
        duplicates.push({
          artist1: { id: artist.id, name: artist.name, legalName: artist.legalName },
          artist2: { id: otherArtist.id, name: otherArtist.name, legalName: otherArtist.legalName },
          similarity: legalNameSimilarity,
          reason: 'similar_legal_name',
        })
        continue
      }
    }

    // Check cross-matches
    if (legalName1 && name2 === legalName1) {
      duplicates.push({
        artist1: { id: artist.id, name: artist.name, legalName: artist.legalName },
        artist2: { id: otherArtist.id, name: otherArtist.name, legalName: otherArtist.legalName },
        similarity: 1.0,
        reason: 'name_match',
      })
      continue
    }

    if (legalName2 && name1 === legalName2) {
      duplicates.push({
        artist1: { id: artist.id, name: artist.name, legalName: artist.legalName },
        artist2: { id: otherArtist.id, name: otherArtist.name, legalName: otherArtist.legalName },
        similarity: 1.0,
        reason: 'name_match',
      })
      continue
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity)
}



