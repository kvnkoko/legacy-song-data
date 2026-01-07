import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { uploadFile, deleteFile, getPublicUrl } from '@/lib/storage'
import { createAuditLog } from '@/lib/utils'

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
    // Allow employees to upload their own photo, or admins/managers to upload for anyone
    const isSelf = session.user.id === params.id
    const canUpload = isSelf || role === UserRole.ADMIN || role === UserRole.MANAGER

    if (!canUpload) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Delete old photo if exists
    if (employee.photo) {
      try {
        await deleteFile(employee.photo)
      } catch (error) {
        console.error('Failed to delete old photo:', error)
      }
    }

    // Process and optimize image
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Resize and compress image to save space
    // Max dimensions: 800x800px, quality: 85%, format: WebP (smaller than JPEG)
    let sharp
    try {
      sharp = (await import('sharp')).default
    } catch (error) {
      console.error('Sharp not available, using original image:', error)
      // Fallback: use original buffer if sharp is not available
      const key = `employees/${params.id}/photo.${file.name.split('.').pop()}`
      await uploadFile(key, buffer, file.type)
      
      const updatedEmployee = await prisma.employee.update({
        where: { id: params.id },
        data: { photo: key },
      })
      
      await createAuditLog(prisma, {
        userId: session.user.id,
        entityType: 'employee',
        entityId: params.id,
        action: 'update',
        fieldName: 'photo',
        oldValue: employee.photo,
        newValue: key,
      })
      
      return NextResponse.json({
        success: true,
        photoUrl: getPublicUrl(key),
      })
    }
    
    const optimizedBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer()

    // Upload optimized photo
    const key = `employees/${params.id}/photo.webp`
    await uploadFile(key, optimizedBuffer, 'image/webp')

    // Update employee record
    const updatedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        photo: key,
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'employee',
      entityId: params.id,
      action: 'update',
      fieldName: 'photo',
      oldValue: employee.photo,
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



