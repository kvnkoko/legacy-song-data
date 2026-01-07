import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const mode = searchParams.get('mode') || 'track' // 'track' or 'release'
    const filters = JSON.parse(searchParams.get('filters') || '{}')

    let releases = await prisma.release.findMany({
      where: filters,
      include: {
        artist: true,
        tracks: {
          orderBy: { trackNumber: 'asc' },
        },
        platformRequests: {
          include: {
            decisions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (mode === 'track') {
      // Track-level CSV: one row per song
      const rows: string[][] = []
      
      // Header
      rows.push([
        'Release ID',
        'Release Type',
        'Release Title',
        'Artist Name',
        'Legal Name',
        "Artist's Chosen Date",
        'Legacy Release Date',
        'Track Number',
        'Song Name',
        'Performer',
        'Composer',
        'Band/Music Producer',
        'Studio',
        'Record Label',
        'Genre',
        'YouTube Request',
        'YouTube Status',
        'Flow Request',
        'Flow Status',
        'Ringtunes Request',
        'Ringtunes Status',
        'International Streaming Request',
        'International Streaming Status',
        'Facebook Request',
        'Facebook Status',
        'TikTok Request',
        'TikTok Status',
      ])

      for (const release of releases) {
        const youtubeRequest = release.platformRequests.find(p => p.platform === 'youtube')
        const flowRequest = release.platformRequests.find(p => p.platform === 'flow')
        const ringtunesRequest = release.platformRequests.find(p => p.platform === 'ringtunes')
        const intlRequest = release.platformRequests.find(p => p.platform === 'international_streaming')
        const facebookRequest = release.platformRequests.find(p => p.platform === 'facebook')
        const tiktokRequest = release.platformRequests.find(p => p.platform === 'tiktok')

        if (release.tracks.length === 0) {
          // Release with no tracks
          rows.push([
            release.id,
            release.type,
            release.title,
            release.artist.name,
            release.artist.legalName || '',
            release.artistsChosenDate?.toISOString().split('T')[0] || '',
            release.legacyReleaseDate?.toISOString().split('T')[0] || '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            youtubeRequest?.requested ? 'Yes' : 'No',
            youtubeRequest?.status || '',
            flowRequest?.requested ? 'Yes' : 'No',
            flowRequest?.status || '',
            ringtunesRequest?.requested ? 'Yes' : 'No',
            ringtunesRequest?.status || '',
            intlRequest?.requested ? 'Yes' : 'No',
            intlRequest?.status || '',
            facebookRequest?.requested ? 'Yes' : 'No',
            facebookRequest?.status || '',
            tiktokRequest?.requested ? 'Yes' : 'No',
            tiktokRequest?.status || '',
          ])
        } else {
          for (const track of release.tracks) {
            rows.push([
              release.id,
              release.type,
              release.title,
              release.artist.name,
              release.artist.legalName || '',
              release.artistsChosenDate?.toISOString().split('T')[0] || '',
              release.legacyReleaseDate?.toISOString().split('T')[0] || '',
              track.trackNumber?.toString() || '',
              track.name,
              track.performer || '',
              track.composer || '',
              track.band || '',
              track.studio || '',
              track.recordLabel || '',
              track.genre || '',
              youtubeRequest?.requested ? 'Yes' : 'No',
              youtubeRequest?.status || '',
              flowRequest?.requested ? 'Yes' : 'No',
              flowRequest?.status || '',
              ringtunesRequest?.requested ? 'Yes' : 'No',
              ringtunesRequest?.status || '',
              intlRequest?.requested ? 'Yes' : 'No',
              intlRequest?.status || '',
              facebookRequest?.requested ? 'Yes' : 'No',
              facebookRequest?.status || '',
              tiktokRequest?.requested ? 'Yes' : 'No',
              tiktokRequest?.status || '',
            ])
          }
        }
      }

      const csv = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tracks-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else {
      // Release-level CSV: one row per release, songs as JSON
      const rows: string[][] = []
      
      rows.push([
        'Release ID',
        'Release Type',
        'Release Title',
        'Artist Name',
        'Legal Name',
        "Artist's Chosen Date",
        'Legacy Release Date',
        'Songs (JSON)',
        'YouTube Request',
        'YouTube Status',
        'Flow Request',
        'Flow Status',
        'Ringtunes Request',
        'Ringtunes Status',
        'International Streaming Request',
        'International Streaming Status',
        'Facebook Request',
        'Facebook Status',
        'TikTok Request',
        'TikTok Status',
      ])

      for (const release of releases) {
        const songsJson = JSON.stringify(release.tracks.map(t => ({
          name: t.name,
          performer: t.performer,
          composer: t.composer,
          band: t.band,
          musicProducer: t.musicProducer,
          studio: t.studio,
          recordLabel: t.recordLabel,
          genre: t.genre,
        })))

        const youtubeRequest = release.platformRequests.find(p => p.platform === 'youtube')
        const flowRequest = release.platformRequests.find(p => p.platform === 'flow')
        const ringtunesRequest = release.platformRequests.find(p => p.platform === 'ringtunes')
        const intlRequest = release.platformRequests.find(p => p.platform === 'international_streaming')
        const facebookRequest = release.platformRequests.find(p => p.platform === 'facebook')
        const tiktokRequest = release.platformRequests.find(p => p.platform === 'tiktok')

        rows.push([
          release.id,
          release.type,
          release.title,
          release.artist.name,
          release.artist.legalName || '',
          release.artistsChosenDate?.toISOString().split('T')[0] || '',
          release.legacyReleaseDate?.toISOString().split('T')[0] || '',
          songsJson,
          youtubeRequest?.requested ? 'Yes' : 'No',
          youtubeRequest?.status || '',
          flowRequest?.requested ? 'Yes' : 'No',
          flowRequest?.status || '',
          ringtunesRequest?.requested ? 'Yes' : 'No',
          ringtunesRequest?.status || '',
          intlRequest?.requested ? 'Yes' : 'No',
          intlRequest?.status || '',
          facebookRequest?.requested ? 'Yes' : 'No',
          facebookRequest?.status || '',
          tiktokRequest?.requested ? 'Yes' : 'No',
          tiktokRequest?.status || '',
        ])
      }

      const csv = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="releases-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}






