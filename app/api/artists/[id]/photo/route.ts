import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { uploadFile, deleteFile, getPublicUrl } from '@/lib/storage'
import { createAuditLog } from '@/lib/utils'
// Import sharp dynamically to avoid issues

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
    // Allow admins, managers, A&R, and data team to upload artist photos
    const canUpload = role === UserRole.ADMIN || role === UserRole.MANAGER || 
                      role === UserRole.A_R || role === UserRole.DATA_TEAM

    if (!canUpload) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get artist
    const artist = await prisma.artist.findUnique({
      where: { id: params.id },
    })

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('photo') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Delete old photo if exists
    if (artist.photo) {
      try {
        await deleteFile(artist.photo)
      } catch (error) {
        console.error('Failed to delete old photo:', error)
      }
    }

    // Process and optimize image
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Resize and compress image to save space
    // Max dimensions: 800x800px, quality: 85%, format: WebP (smaller than JPEG)
    const sharp = (await import('sharp')).default
    const optimizedBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer()

    // Upload optimized photo
    const key = `artists/${params.id}/photo.webp`
    await uploadFile(key, optimizedBuffer, 'image/webp')

    // Update artist record
    const updatedArtist = await prisma.artist.update({
      where: { id: params.id },
      data: {
        photo: key,
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'artist',
      entityId: params.id,
      action: 'update',
      fieldName: 'photo',
      oldValue: artist.photo,
      newValue: key,
    })

    return NextResponse.json({
      success: true,
      photoUrl: getPublicUrl(key),
    })
  } catch (error: any) {
    console.error('Upload photo error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
