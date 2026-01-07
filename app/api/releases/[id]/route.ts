import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole, ReleaseType, CopyrightStatus, VideoType } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'
import { parseArtists, findOrCreateArtists } from '@/lib/csv-importer'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const release = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            legalName: true,
          },
        },
        releaseArtists: {
          include: {
            artist: {
              select: {
                id: true,
                name: true,
                legalName: true,
              },
            },
          },
        },
        tracks: {
          orderBy: { trackNumber: 'asc' },
          include: {
            trackArtists: {
              include: {
                artist: {
                  select: {
                    id: true,
                    name: true,
                    legalName: true,
                  },
                },
              },
            },
          },
        },
        assignedA_R: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 })
    }

    return NextResponse.json({ release })
  } catch (error: any) {
    console.error('Get release error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch release' },
      { status: 500 }
    )
  }
}

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
    // Allow A&R, Admin, Manager, and Data Team to edit releases
    if (role !== UserRole.A_R && role !== UserRole.ADMIN && role !== UserRole.MANAGER && role !== UserRole.DATA_TEAM) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      type,
      artists,
      artistsChosenDate,
      legacyReleaseDate,
      copyrightStatus,
      videoType,
      assignedA_RId,
      notes,
    } = body

    // Check if release exists
    const existingRelease = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
        releaseArtists: {
          include: {
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!existingRelease) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 })
    }

    // Validate type if provided
    if (type && !Object.values(ReleaseType).includes(type)) {
      return NextResponse.json({ error: 'Invalid release type' }, { status: 400 })
    }

    // Validate copyrightStatus if provided
    if (copyrightStatus !== null && copyrightStatus !== undefined && copyrightStatus !== 'none') {
      if (!Object.values(CopyrightStatus).includes(copyrightStatus)) {
        return NextResponse.json({ error: 'Invalid copyright status' }, { status: 400 })
      }
    }

    // Validate videoType if provided
    if (videoType && !Object.values(VideoType).includes(videoType)) {
      return NextResponse.json({ error: 'Invalid video type' }, { status: 400 })
    }

    // Build update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (type !== undefined) updateData.type = type as ReleaseType
    if (artistsChosenDate !== undefined) {
      updateData.artistsChosenDate = artistsChosenDate ? new Date(artistsChosenDate) : null
    }
    if (legacyReleaseDate !== undefined) {
      updateData.legacyReleaseDate = legacyReleaseDate ? new Date(legacyReleaseDate) : null
    }
    if (copyrightStatus !== undefined) {
      updateData.copyrightStatus = copyrightStatus === 'none' || copyrightStatus === null ? null : (copyrightStatus as CopyrightStatus)
    }
    if (videoType !== undefined) updateData.videoType = videoType as VideoType
    if (assignedA_RId !== undefined) {
      updateData.assignedA_RId = assignedA_RId === 'none' || assignedA_RId === null ? null : assignedA_RId
    }
    if (notes !== undefined) updateData.notes = notes || null

    // Use a transaction to update release and artist relationships
    const release = await prisma.$transaction(async (tx) => {
      // Update the release
      const updatedRelease = await tx.release.update({
        where: { id: params.id },
        data: updateData,
      })

      // If artists field was updated, update Release.artistId and ReleaseArtist relationships
      if (artists !== undefined) {
        // Delete existing ReleaseArtist relationships for this release (secondary artists)
        await tx.releaseArtist.deleteMany({
          where: { releaseId: params.id },
        })

        // Parse artist names from artists field (comma-separated)
        if (artists && artists.trim()) {
          const artistNames = parseArtists(artists)
          
          if (artistNames.length > 0) {
            // Find or create artists
            const foundArtists = await findOrCreateArtists(artistNames, tx as any)
            
            // First artist becomes primary (update Release.artistId)
            const primaryArtist = foundArtists[0]
            await tx.release.update({
              where: { id: params.id },
              data: { artistId: primaryArtist.id },
            })
            
            // Create ReleaseArtist relationships for secondary artists (if any)
            for (let i = 1; i < foundArtists.length; i++) {
              await tx.releaseArtist.create({
                data: {
                  releaseId: params.id,
                  artistId: foundArtists[i].id,
                  isPrimary: false,
                },
              })
            }
          }
          // If artists field is empty after parsing, keep existing primary artist
          // (Release.artistId is required, so we don't change it)
        }
        // If artists is empty string, clear secondary artists but keep existing primary
        // (already handled by deleteMany above)
      }

      return updatedRelease
    })

    // Get updated release with artists for audit log
    const updatedReleaseWithArtists = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
        releaseArtists: {
          include: {
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      releaseId: params.id,
      entityType: 'release',
      entityId: params.id,
      action: 'update',
      oldValue: JSON.stringify({
        title: existingRelease.title,
        type: existingRelease.type,
        artistsChosenDate: existingRelease.artistsChosenDate,
        legacyReleaseDate: existingRelease.legacyReleaseDate,
        copyrightStatus: existingRelease.copyrightStatus,
        videoType: existingRelease.videoType,
        assignedA_RId: existingRelease.assignedA_RId,
        notes: existingRelease.notes,
        artists: [
          ...(existingRelease.artist ? [{
            id: existingRelease.artist.id,
            name: existingRelease.artist.name,
            isPrimary: true,
          }] : []),
          ...(existingRelease.releaseArtists?.map((ra: any) => ({
            id: ra.artist.id,
            name: ra.artist.name,
            isPrimary: ra.isPrimary,
          })) || []),
        ],
      }),
      newValue: JSON.stringify({
        ...updateData,
        artists: [
          ...(updatedReleaseWithArtists?.artist ? [{
            id: updatedReleaseWithArtists.artist.id,
            name: updatedReleaseWithArtists.artist.name,
            isPrimary: true,
          }] : []),
          ...(updatedReleaseWithArtists?.releaseArtists?.map((ra: any) => ({
            id: ra.artist.id,
            name: ra.artist.name,
            isPrimary: ra.isPrimary,
          })) || []),
        ],
      }),
    })

    return NextResponse.json({ release: updatedReleaseWithArtists })
  } catch (error: any) {
    console.error('Update release error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update release' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    // Allow Admin and Manager to delete releases
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if release exists
    const release = await prisma.release.findUnique({
      where: { id: params.id },
    })

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 })
    }

    // Create audit log before deletion
    await createAuditLog(prisma, {
      userId: session.user.id,
      releaseId: params.id,
      entityType: 'release',
      entityId: params.id,
      action: 'delete',
      oldValue: JSON.stringify({ title: release.title, type: release.type }),
    })

    // Delete the release (cascade will handle tracks)
    await prisma.release.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete release error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete release' },
      { status: 500 }
    )
  }
}
