import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    })

    return NextResponse.json({
      preferences: user?.preferences || null,
    })
  } catch (error: any) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { preferences } = body

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      )
    }

    // Validate structure - ensure it's a valid JSON object
    try {
      JSON.stringify(preferences)
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON structure' },
        { status: 400 }
      )
    }

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences },
      select: { preferences: true },
    })

    return NextResponse.json({
      success: true,
      preferences: updatedUser.preferences,
    })
  } catch (error: any) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    )
  }
}



