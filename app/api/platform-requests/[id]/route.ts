import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole, PlatformRequestStatus } from '@prisma/client'
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

    const body = await req.json()
    const { status, channelId, uploadLink, notes, uploadedAt } = body

    // Get the request to check platform and permissions
    const existingRequest = await prisma.platformRequest.findUnique({
      where: { id: params.id },
      include: {
        release: true,
      },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const userRole = session.user.role as UserRole
    const platform = existingRequest.platform

    // Check permissions
    const canUpdate = 
      userRole === UserRole.ADMIN ||
      userRole === UserRole.MANAGER ||
      userRole === UserRole.A_R ||
      (userRole === UserRole.PLATFORM_YOUTUBE && platform === 'youtube') ||
      (userRole === UserRole.PLATFORM_FLOW && platform === 'flow') ||
      (userRole === UserRole.PLATFORM_RINGTUNES && platform === 'ringtunes') ||
      (userRole === UserRole.PLATFORM_INTERNATIONAL_STREAMING && platform === 'international_streaming') ||
      (userRole === UserRole.PLATFORM_FACEBOOK && platform === 'facebook') ||
      (userRole === UserRole.PLATFORM_TIKTOK && platform === 'tiktok')

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For platform employees on platforms with channels (YouTube, Facebook),
    // ensure they can only approve/reject requests that have a channel assigned
    const isPlatformEmployee = userRole !== UserRole.ADMIN && 
                               userRole !== UserRole.MANAGER && 
                               userRole !== UserRole.A_R
    const hasChannels = platform === 'youtube' || platform === 'facebook'
    
    if (isPlatformEmployee && hasChannels && !existingRequest.channelName && !channelId) {
      return NextResponse.json({ 
        error: 'Platform employees can only approve/reject requests for specific channels. Please assign a channel first.' 
      }, { status: 403 })
    }

    // Update the request
    const updateData: any = {
      status: status as PlatformRequestStatus,
    }

    if (channelId !== undefined) {
      // If channelId is provided, get the channel name
      if (channelId) {
        const channel = await prisma.platformChannel.findFirst({
          where: {
            platform,
            OR: [
              { id: channelId },
              { channelId: channelId },
            ],
          },
        })
        if (channel) {
          updateData.channelId = channel.channelId || channel.id
          updateData.channelName = channel.name
        }
      } else {
        updateData.channelId = null
        updateData.channelName = null
      }
    }

    if (uploadLink !== undefined) {
      updateData.uploadLink = uploadLink || null
    }

    if (uploadedAt !== undefined && status === PlatformRequestStatus.UPLOADED) {
      updateData.uploadedAt = uploadedAt ? new Date(uploadedAt) : new Date()
    } else if (status !== PlatformRequestStatus.UPLOADED) {
      updateData.uploadedAt = null
    }

    const updatedRequest = await prisma.platformRequest.update({
      where: { id: params.id },
      data: updateData,
    })

    // If a specific channel is being updated, only update that channel's request
    // If no channel is specified and status is UPLOADED, cascade to base requests only
    // (not channel-specific ones, to allow channel-specific approvals)
    if (status && status === PlatformRequestStatus.UPLOADED) {
      const releaseId = existingRequest.releaseId
      const platform = existingRequest.platform
      
      if (releaseId && platform) {
        // If this is a channel-specific request, only update requests for the same channel
        if (updateData.channelId) {
          await prisma.platformRequest.updateMany({
            where: {
              releaseId,
              platform,
              channelId: updateData.channelId,
              id: { not: params.id },
            },
            data: {
              status: status as PlatformRequestStatus,
              ...(status === PlatformRequestStatus.UPLOADED ? { 
                uploadedAt: updateData.uploadedAt || new Date() 
              } : {}),
            },
          })
        } else {
          // If this is a base request (no channel), update other base requests (no channel)
          // but NOT channel-specific ones to allow channel-specific approvals
          await prisma.platformRequest.updateMany({
            where: {
              releaseId,
              platform,
              channelId: null,
              id: { not: params.id },
            },
            data: {
              status: status as PlatformRequestStatus,
              ...(status === PlatformRequestStatus.UPLOADED ? { 
                uploadedAt: updateData.uploadedAt || new Date() 
              } : {}),
            },
          })
        }
      }
    }

    // Create a decision record
    await prisma.platformDecision.create({
      data: {
        platformRequestId: params.id,
        userId: session.user.id,
        status: status as PlatformRequestStatus,
        notes: notes || null,
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      releaseId: existingRequest.releaseId || null,
      entityType: 'platform_request',
      entityId: params.id,
      action: 'update',
      fieldName: 'status',
      oldValue: existingRequest.status,
      newValue: status,
    })

    return NextResponse.json(updatedRequest)
  } catch (error: any) {
    console.error('Update platform request error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update platform request' },
      { status: 500 }
    )
  }
}




