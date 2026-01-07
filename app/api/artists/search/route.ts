import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (!query || query.length < 2) {
      return NextResponse.json({ artists: [] })
    }

    const artists = await prisma.artist.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { legalName: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        legalName: true,
      },
    })

    return NextResponse.json({ artists })
  } catch (error: any) {
    console.error('Search artists error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search artists' },
      { status: 500 }
    )
  }
}






