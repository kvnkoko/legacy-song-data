import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

/**
 * API endpoint to create a user account for the current session
 * This is useful when all users were deleted but the session still exists
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
    }

    // Check if user already exists (explicitly select fields to avoid preferences column)
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
      },
    })

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user: existingUser,
      })
    }

    // Try to create user with session ID first
    let newUser
    try {
      newUser = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email || `user-${session.user.id}@temp.local`,
          name: session.user.name || null,
          image: session.user.image || null,
          role: UserRole.ADMIN, // Create as admin
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          image: true,
          createdAt: true,
        },
      })
    } catch (createError: any) {
      // If ID conflict, try without specifying ID
      if (createError.code === 'P2002' && session.user.email) {
        // Try to find by email (explicitly select fields to avoid preferences column)
        const userByEmail = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            image: true,
            createdAt: true,
          },
        })

        if (userByEmail) {
          return NextResponse.json({
            success: true,
            message: 'User found by email',
            user: userByEmail,
          })
        }

        // Create without ID (explicitly select fields to avoid preferences column)
        newUser = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || null,
            image: session.user.image || null,
            role: UserRole.ADMIN,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            image: true,
            createdAt: true,
          },
        })
      } else {
        throw createError
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
    })
  } catch (error: any) {
    console.error('Create session user error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create user',
        details: error.code || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

