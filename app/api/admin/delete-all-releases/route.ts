import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager role required' }, { status: 403 })
    }

    console.log('Starting to delete all releases...')
    
    // Delete in order to respect foreign key constraints
    // First delete related data
    console.log('Deleting TrackArtists...')
    const trackArtistsDeleted = await prisma.trackArtist.deleteMany({})
    
    console.log('Deleting ReleaseArtists...')
    const releaseArtistsDeleted = await prisma.releaseArtist.deleteMany({})
    
    console.log('Deleting PlatformRequests...')
    const platformRequestsDeleted = await prisma.platformRequest.deleteMany({})
    
    console.log('Deleting Comments...')
    const commentsDeleted = await prisma.comment.deleteMany({})
    
    console.log('Deleting AuditLogs...')
    const auditLogsDeleted = await prisma.auditLog.deleteMany({})
    
    console.log('Deleting ImportAttachments...')
    const importAttachmentsDeleted = await prisma.importAttachment.deleteMany({})
    
    console.log('Deleting Tracks...')
    const tracksDeleted = await prisma.track.deleteMany({})
    
    console.log('Deleting Releases...')
    const releasesDeleted = await prisma.release.deleteMany({})
    
    console.log('Successfully deleted all releases and related data.')
    
    return NextResponse.json({
      success: true,
      deleted: {
        releases: releasesDeleted.count,
        tracks: tracksDeleted.count,
        trackArtists: trackArtistsDeleted.count,
        releaseArtists: releaseArtistsDeleted.count,
        platformRequests: platformRequestsDeleted.count,
        comments: commentsDeleted.count,
        auditLogs: auditLogsDeleted.count,
        importAttachments: importAttachmentsDeleted.count,
      },
    })
  } catch (error: any) {
    console.error('Error deleting releases:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete releases' },
      { status: 500 }
    )
  }
}



