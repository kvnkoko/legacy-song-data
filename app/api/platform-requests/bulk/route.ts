import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole, PlatformRequestStatus } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { requestIds, status, channelIds, notes } = body

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'Request IDs array is required' },
        { status: 400 }
      )
    }

    if (!status || !Object.values(PlatformRequestStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      )
    }

    const userRole = session.user.role as UserRole

    // Get the first request to check platform and permissions
    const firstRequest = await prisma.platformRequest.findUnique({
      where: { id: requestIds[0] },
    })

    if (!firstRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const platform = firstRequest.platform

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

    // Verify all requests are for the same platform
    const allRequests = await prisma.platformRequest.findMany({
      where: { id: { in: requestIds } },
      select: { id: true, platform: true, releaseId: true, channelName: true, channelId: true },
    })

    if (allRequests.length !== requestIds.length) {
      return NextResponse.json(
        { error: 'Some requests not found' },
        { status: 404 }
      )
    }

    const invalidPlatform = allRequests.find(r => r.platform !== platform)
    if (invalidPlatform) {
      return NextResponse.json(
        { error: 'All requests must be for the same platform' },
        { status: 400 }
      )
    }

    // For platform employees on platforms with channels (YouTube, Facebook),
    // ensure they can only approve/reject requests that have a channel assigned
    const isPlatformEmployee = userRole !== UserRole.ADMIN && 
                               userRole !== UserRole.MANAGER && 
                               userRole !== UserRole.A_R
    const hasChannels = platform === 'youtube' || platform === 'facebook'
    
    if (isPlatformEmployee && hasChannels) {
      // Check if all selected requests have channels assigned
      const requestsWithoutChannels = allRequests.filter(r => !r.channelName && !r.channelId)
      if (requestsWithoutChannels.length > 0) {
        return NextResponse.json({ 
          error: 'Platform employees can only approve/reject requests for specific channels. All selected requests must have a channel assigned.' 
        }, { status: 403 })
      }
      
      // If channelIds are provided, ensure all requests match those channels
      if (channelIds && channelIds.length > 0) {
        const channelNames = await prisma.platformChannel.findMany({
          where: { id: { in: channelIds }, platform, active: true },
          select: { name: true },
        })
        const validChannelNames = channelNames.map(c => c.name)
        const invalidRequests = allRequests.filter(r => 
          r.channelName && !validChannelNames.includes(r.channelName)
        )
        if (invalidRequests.length > 0) {
          return NextResponse.json({ 
            error: 'Some selected requests are for channels you do not have access to.' 
          }, { status: 403 })
        }
      }
    }

    // Get channels if channelIds provided
    let channelMap: Map<string, { id: string; name: string }> = new Map()
    if (channelIds && channelIds.length > 0) {
      const channels = await prisma.platformChannel.findMany({
        where: {
          id: { in: channelIds },
          platform,
          active: true,
        },
      })
      channels.forEach(ch => {
        channelMap.set(ch.id, { id: ch.channelId || ch.id, name: ch.name })
      })
    }

    // Update requests in transaction
    const results = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: status as PlatformRequestStatus,
      }

      if (status === PlatformRequestStatus.UPLOADED) {
        updateData.uploadedAt = new Date()
      } else if (status !== PlatformRequestStatus.UPLOADED) {
        updateData.uploadedAt = null
      }

      // If channelIds provided, we need to handle channel-specific updates
      if (channelIds && channelIds.length > 0) {
        // For each request, update or create channel-specific requests
        const updates: Promise<any>[] = []
        
        for (const request of allRequests) {
          // Update the base request
          updates.push(
            tx.platformRequest.update({
              where: { id: request.id },
              data: updateData,
            })
          )

          // For each selected channel, ensure there's a request entry
          for (const channelId of channelIds) {
            const channel = channelMap.get(channelId)
            if (channel) {
              // Find or create channel-specific request
              const existingChannelRequest = await tx.platformRequest.findFirst({
                where: {
                  releaseId: request.releaseId,
                  platform,
                  channelId: channel.id,
                },
              })

              if (existingChannelRequest) {
                updates.push(
                  tx.platformRequest.update({
                    where: { id: existingChannelRequest.id },
                    data: {
                      ...updateData,
                      channelName: channel.name,
                    },
                  })
                )
              } else if (request.releaseId) {
                // Create new channel-specific request
                updates.push(
                  tx.platformRequest.create({
                    data: {
                      releaseId: request.releaseId,
                      platform,
                      status: status as PlatformRequestStatus,
                      channelId: channel.id,
                      channelName: channel.name,
                      requested: true,
                      ...(status === PlatformRequestStatus.UPLOADED ? { uploadedAt: new Date() } : {}),
                    },
                  })
                )
              }
            }
          }

          // Create decision record
          updates.push(
            tx.platformDecision.create({
              data: {
                platformRequestId: request.id,
                userId: session.user.id,
                status: status as PlatformRequestStatus,
                notes: notes || null,
              },
            })
          )

          // Create audit log
          updates.push(
            createAuditLog(tx, {
              userId: session.user.id,
              releaseId: request.releaseId || null,
              entityType: 'platform_request',
              entityId: request.id,
              action: 'update',
              fieldName: 'status',
              oldValue: firstRequest.status,
              newValue: status,
            })
          )
        }

        await Promise.all(updates)
      } else {
        // Bulk update all requests without channel specificity
        await tx.platformRequest.updateMany({
          where: { id: { in: requestIds } },
          data: updateData,
        })

        // Create decision and audit log for each
        for (const request of allRequests) {
          await tx.platformDecision.create({
            data: {
              platformRequestId: request.id,
              userId: session.user.id,
              status: status as PlatformRequestStatus,
              notes: notes || null,
            },
          })

          await createAuditLog(tx, {
            userId: session.user.id,
            releaseId: request.releaseId || null,
            entityType: 'platform_request',
            entityId: request.id,
            action: 'update',
            fieldName: 'status',
            oldValue: firstRequest.status,
            newValue: status,
          })
        }
      }

      return { updated: requestIds.length }
    })

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated} request(s) successfully`,
      updated: results.updated,
    })
  } catch (error: any) {
    console.error('Bulk update platform requests error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update requests' },
      { status: 500 }
    )
  }
}



