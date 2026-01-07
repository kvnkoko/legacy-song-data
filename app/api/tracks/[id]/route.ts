import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
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

    const track = await prisma.track.findUnique({
      where: { id: params.id },
      include: {
        release: {
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
          },
        },
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
    })

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    return NextResponse.json({ track })
  } catch (error: any) {
    console.error('Get track error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch track' },
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
    // Allow A&R, Admin, Manager, and Data Team to edit tracks
    if (role !== UserRole.A_R && role !== UserRole.ADMIN && role !== UserRole.MANAGER && role !== UserRole.DATA_TEAM) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      trackNumber,
      performer,
      composer,
      band,
      musicProducer,
      studio,
      recordLabel,
      genre,
    } = body

    // Check if track exists
    const existingTrack = await prisma.track.findUnique({
      where: { id: params.id },
      include: {
        release: true,
        trackArtists: {
          include: {
            artist: true,
          },
        },
      },
    })

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Update track
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (trackNumber !== undefined) updateData.trackNumber = trackNumber || null
    if (performer !== undefined) updateData.performer = performer || null
    if (composer !== undefined) updateData.composer = composer || null
    if (band !== undefined) updateData.band = band || null
    if (musicProducer !== undefined) updateData.musicProducer = musicProducer || null
    if (studio !== undefined) updateData.studio = studio || null
    if (recordLabel !== undefined) updateData.recordLabel = recordLabel || null
    if (genre !== undefined) updateData.genre = genre || null

    // Use a transaction to update track and TrackArtist relationships
    const track = await prisma.$transaction(async (tx) => {
      // Update the track
      const updatedTrack = await tx.track.update({
        where: { id: params.id },
        data: updateData,
      })

      // If performer field was updated, update TrackArtist relationships
      if (performer !== undefined) {
        // Delete existing TrackArtist relationships for this track
        await tx.trackArtist.deleteMany({
          where: { trackId: params.id },
        })

        // Parse artist names from performer field (comma-separated)
        if (performer && performer.trim()) {
          const artistNames = parseArtists(performer)
          
          if (artistNames.length > 0) {
            // Find or create artists
            const artists = await findOrCreateArtists(artistNames, tx as any)
            
            // Create TrackArtist relationships
            // First artist is primary, rest are secondary
            for (let i = 0; i < artists.length; i++) {
              await tx.trackArtist.create({
                data: {
                  trackId: params.id,
                  artistId: artists[i].id,
                  isPrimary: i === 0, // First artist is primary
                },
              })
            }
          }
        }
      }

      return updatedTrack
    })

    // Get updated track with artists for audit log
    const updatedTrackWithArtists = await prisma.track.findUnique({
      where: { id: params.id },
      include: {
        trackArtists: {
          include: {
            artist: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      releaseId: existingTrack.releaseId,
      entityType: 'track',
      entityId: params.id,
      action: 'update',
      oldValue: JSON.stringify({
        name: existingTrack.name,
        trackNumber: existingTrack.trackNumber,
        performer: existingTrack.performer,
        composer: existingTrack.composer,
        band: existingTrack.band,
        musicProducer: existingTrack.musicProducer,
        studio: existingTrack.studio,
        recordLabel: existingTrack.recordLabel,
        genre: existingTrack.genre,
        artists: existingTrack.trackArtists?.map((ta: any) => ({
          id: ta.artist.id,
          name: ta.artist.name,
          isPrimary: ta.isPrimary,
        })) || [],
      }),
      newValue: JSON.stringify({
        ...updateData,
        artists: updatedTrackWithArtists?.trackArtists?.map((ta: any) => ({
          id: ta.artist.id,
          name: ta.artist.name,
          isPrimary: ta.isPrimary,
        })) || [],
      }),
    })

    return NextResponse.json({ track: updatedTrackWithArtists })
  } catch (error: any) {
    console.error('Update track error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update track' },
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
    // Allow A&R, Admin, and Manager to delete tracks
    if (role !== UserRole.A_R && role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if track exists
    const track = await prisma.track.findUnique({
      where: { id: params.id },
      include: {
        release: true,
      },
    })

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Create audit log before deletion
    await createAuditLog(prisma, {
      userId: session.user.id,
      releaseId: track.releaseId,
      entityType: 'track',
      entityId: params.id,
      action: 'delete',
      oldValue: JSON.stringify({ name: track.name, trackNumber: track.trackNumber }),
    })

    // Delete the track
    await prisma.track.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete track error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete track' },
      { status: 500 }
    )
  }
}



