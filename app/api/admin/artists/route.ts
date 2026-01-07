import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'

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

    const body = await req.json()
    const { name, legalName, contactEmail, contactPhone, internalNotes } = body

    // Validate
    if (!name) {
      return NextResponse.json({ error: 'Artist name is required' }, { status: 400 })
    }

    // Check if artist exists
    const existingArtist = await prisma.artist.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })

    if (existingArtist) {
      return NextResponse.json({ error: 'Artist with this name already exists' }, { status: 400 })
    }

    // Create artist
    const artist = await prisma.artist.create({
      data: {
        name,
        legalName: legalName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        internalNotes: internalNotes || null,
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'artist',
      entityId: artist.id,
      action: 'create',
      newValue: JSON.stringify({ name: artist.name, legalName: artist.legalName }),
    })

    return NextResponse.json({ 
      id: artist.id, 
      name: artist.name 
    })
  } catch (error: any) {
    console.error('Create artist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create artist' },
      { status: 500 }
    )
  }
}




