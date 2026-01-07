import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const channels = await prisma.platformChannel.findMany({
      orderBy: [
        { platform: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(channels)
  } catch (error: any) {
    console.error('Get channels error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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
    const { platform, name, channelId, description, active } = body

    if (!platform || !name) {
      return NextResponse.json(
        { error: 'Platform and name are required' },
        { status: 400 }
      )
    }

    const channel = await prisma.platformChannel.create({
      data: {
        platform,
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
      entityId: channel.id,
      action: 'create',
      newValue: JSON.stringify({ platform: channel.platform, name: channel.name }),
    })

    return NextResponse.json(channel)
  } catch (error: any) {
    console.error('Create channel error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create channel' },
      { status: 500 }
    )
  }
}




