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
    const { name, channelId, description, active } = body

    // Get current channel data for audit log
    const currentChannel = await prisma.platformChannel.findUnique({
      where: { id: params.id },
    })

    if (!currentChannel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const channel = await prisma.platformChannel.update({
      where: { id: params.id },
      data: {
        name,
        channelId: channelId || null,
        description: description || null,
        active: active !== undefined ? active : true,
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'platform_channel',
      entityId: params.id,
      action: 'update',
      oldValue: JSON.stringify({ name: currentChannel.name, channelId: currentChannel.channelId, active: currentChannel.active }),
      newValue: JSON.stringify({ name: channel.name, channelId: channel.channelId, active: channel.active }),
    })

    return NextResponse.json(channel)
  } catch (error: any) {
    console.error('Update channel error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update channel' },
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
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get channel data for audit log
    const channel = await prisma.platformChannel.findUnique({
      where: { id: params.id },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Create audit log before deletion
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'platform_channel',
      entityId: params.id,
      action: 'delete',
      oldValue: JSON.stringify({ platform: channel.platform, name: channel.name }),
    })

    await prisma.platformChannel.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete channel error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete channel' },
      { status: 500 }
    )
  }
}




