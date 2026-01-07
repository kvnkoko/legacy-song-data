import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get existing artist for audit log
    const existingArtist = await prisma.artist.findUnique({
      where: { id: params.id },
    })

    if (!existingArtist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    // Check if another artist exists with the same name (excluding current)
    const duplicateArtist = await prisma.artist.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        NOT: { id: params.id },
      },
    })

    if (duplicateArtist) {
      return NextResponse.json({ error: 'Another artist with this name already exists' }, { status: 400 })
    }

    if (!existingArtist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    // Update artist
    const artist = await prisma.artist.update({
      where: { id: params.id },
      data: {
        name,
        legalName: legalName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        internalNotes: internalNotes || null,
      },
    })

    // Create audit logs for changed fields
    const fieldsToCheck = [
      { key: 'name', old: existingArtist.name, new: name },
      { key: 'legalName', old: existingArtist.legalName, new: legalName },
      { key: 'contactEmail', old: existingArtist.contactEmail, new: contactEmail },
      { key: 'contactPhone', old: existingArtist.contactPhone, new: contactPhone },
      { key: 'internalNotes', old: existingArtist.internalNotes, new: internalNotes },
    ]

    for (const field of fieldsToCheck) {
      if (field.old !== field.new) {
        await createAuditLog(prisma, {
          userId: session.user.id,
          entityType: 'artist',
          entityId: params.id,
          action: 'update',
          fieldName: field.key,
          oldValue: field.old || null,
          newValue: field.new || null,
        })
      }
    }

    return NextResponse.json({ 
      id: artist.id, 
      name: artist.name 
    })
  } catch (error: any) {
    console.error('Update artist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update artist' },
      { status: 500 }
    )
  }
}

