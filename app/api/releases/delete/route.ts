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
    // Only Admin and Manager can delete releases
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { releaseIds } = body

    if (!releaseIds || !Array.isArray(releaseIds) || releaseIds.length === 0) {
      return NextResponse.json({ error: 'Release IDs are required' }, { status: 400 })
    }

    // Verify releases exist before deletion
    const existingReleases = await prisma.release.findMany({
      where: {
        id: { in: releaseIds },
      },
      select: { id: true },
    })

    const validReleaseIds = existingReleases.map(r => r.id)
    
    if (validReleaseIds.length === 0) {
      return NextResponse.json({ error: 'No valid releases found to delete' }, { status: 404 })
    }

    // Create audit logs BEFORE deletion (so foreign key constraint is satisfied)
    // The releaseId will be set to null by onDelete: SetNull when the release is deleted
    await Promise.all(
      validReleaseIds.map(releaseId =>
        createAuditLog(prisma, {
          userId: session.user.id,
          releaseId, // Must exist at creation time
          entityType: 'release',
          entityId: releaseId,
          action: 'delete',
        })
      )
    )

    // Delete releases (cascade will handle tracks, platform requests, etc.)
    // The audit log's releaseId will be set to null by onDelete: SetNull
    const deleteResult = await prisma.release.deleteMany({
      where: {
        id: { in: validReleaseIds },
      },
    })

    return NextResponse.json({ 
      success: true, 
      deleted: deleteResult.count 
    })
  } catch (error: any) {
    console.error('Delete releases error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete releases' },
      { status: 500 }
    )
  }
}

