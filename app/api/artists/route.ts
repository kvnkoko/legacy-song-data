import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/artists?ids=id1,id2,id3
 * Fetch artists by their IDs
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json({ error: 'ids parameter is required' }, { status: 400 })
    }

    const ids = idsParam.split(',').filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ artists: [] })
    }

    const artists = await prisma.artist.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        legalName: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ artists })
  } catch (error: any) {
    console.error('Get artists by IDs error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch artists' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/artists
 * Create a new artist
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, legalName } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Artist name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Check if artist already exists (case-insensitive)
    const existingArtist = await prisma.artist.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        legalName: true,
      },
    })

    if (existingArtist) {
      // Return existing artist instead of creating duplicate
      return NextResponse.json({ artist: existingArtist })
    }

    // Create new artist
    const artist = await prisma.artist.create({
      data: {
        name: trimmedName,
        legalName: legalName?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        legalName: true,
      },
    })

    return NextResponse.json({ artist })
  } catch (error: any) {
    console.error('Create artist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create artist' },
      { status: 500 }
    )
  }
}

