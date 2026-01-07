import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { deleteFile } from '@/lib/storage'
import { createAuditLog } from '@/lib/utils'

// Force dynamic rendering - don't execute during build
export const dynamic = 'force-dynamic'

export async function POST(
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

    // Get artist with releases count for confirmation
    const artist = await prisma.artist.findUnique({
      where: { id: params.id },
      include: {
        releases: {
          select: { id: true },
        },
      },
    })

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    const releaseCount = artist.releases.length

    // Delete artist photo if exists
    if (artist.photo) {
      try {
        await deleteFile(artist.photo)
      } catch (error) {
        console.error('Failed to delete artist photo:', error)
        // Continue with deletion even if photo deletion fails
      }
    }

    // Create audit log before deletion
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'artist',
      entityId: params.id,
      action: 'delete',
      fieldName: null,
      oldValue: JSON.stringify({
        name: artist.name,
        legalName: artist.legalName,
        releaseCount,
      }),
      newValue: null,
    })

    // Delete artist (cascade will handle releases and tracks)
    await prisma.artist.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ 
      success: true,
      deleted: {
        artist: artist.name,
        releases: releaseCount,
      },
    })
  } catch (error: any) {
    console.error('Delete artist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete artist' },
      { status: 500 }
    )
  }
}



