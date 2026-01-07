import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseCSV, autoDetectMappings, buildSongPatterns } from '@/lib/csv-importer'
import type { ColumnMapping, MappingConfig } from '@/lib/csv-importer'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await req.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid CSV content' }, { status: 400 })
    }

    // Parse CSV
    const { headers, rows } = parseCSV(content)
    
    if (headers.length === 0) {
      return NextResponse.json({ error: 'No headers found in CSV' }, { status: 400 })
    }

    // Preview first 50 rows (limit to prevent huge responses)
    const previewRows = rows.slice(0, 50).map(row => {
      // Limit cell values to prevent huge JSON responses
      const limitedRow: any = {}
      for (const [key, value] of Object.entries(row)) {
        // Truncate very long values
        limitedRow[key] = typeof value === 'string' && value.length > 500 
          ? value.substring(0, 500) + '...' 
          : value
      }
      return limitedRow
    })

    // Auto-detect mappings
    const autoMappings = autoDetectMappings(headers)
    const songPatterns = buildSongPatterns(autoMappings)

    // Build mapping config
    const mappingConfig: MappingConfig = {
      columns: autoMappings,
      songPatterns,
    }

    // Detect if CSV has multiple songs per row
    const hasMultipleSongs = Object.keys(songPatterns).length > 0

    return NextResponse.json({
      headers,
      previewRows,
      totalRows: rows.length,
      mappingConfig,
      hasMultipleSongs,
    })
  } catch (error: any) {
    console.error('CSV preview error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to preview CSV' },
      { status: 500 }
    )
  }
}


