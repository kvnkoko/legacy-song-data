import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * API endpoint to ensure admin user exists
 * This can be called once after deployment to create the admin user
 * 
 * Usage: POST /api/admin/ensure-admin
 * No authentication required (one-time setup)
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Checking for admin user...')
    
    // Check if admin exists
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    })

    if (!admin) {
      console.log('❌ Admin user not found. Creating...')
      const passwordHash = await bcrypt.hash('admin123', 10)
      admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash,
          name: 'Admin User',
          role: UserRole.ADMIN,
        },
      })
      console.log('✅ Admin user created!')
      
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        user: {
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        credentials: {
          email: 'admin@example.com',
          password: 'admin123',
        },
      })
    } else {
      console.log('✅ Admin user exists')
      
      // Verify password
      if (!admin.passwordHash) {
        console.log('⚠️  Admin user has no password. Setting password...')
        const passwordHash = await bcrypt.hash('admin123', 10)
        admin = await prisma.user.update({
          where: { id: admin.id },
          data: { passwordHash },
        })
        console.log('✅ Password set to: admin123')
        
        return NextResponse.json({
          success: true,
          message: 'Admin user password was missing and has been set',
          user: {
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
          credentials: {
            email: 'admin@example.com',
            password: 'admin123',
          },
        })
      } else {
        // Test password
        const isValid = await bcrypt.compare('admin123', admin.passwordHash)
        if (!isValid) {
          console.log('⚠️  Password is incorrect. Resetting...')
          const passwordHash = await bcrypt.hash('admin123', 10)
          admin = await prisma.user.update({
            where: { id: admin.id },
            data: { passwordHash },
          })
          console.log('✅ Password reset to: admin123')
          
          return NextResponse.json({
            success: true,
            message: 'Admin user password has been reset',
            user: {
              email: admin.email,
              name: admin.name,
              role: admin.role,
            },
            credentials: {
              email: 'admin@example.com',
              password: 'admin123',
            },
          })
        } else {
          console.log('✅ Password is correct')
          
          return NextResponse.json({
            success: true,
            message: 'Admin user already exists and password is correct',
            user: {
              email: admin.email,
              name: admin.name,
              role: admin.role,
            },
            credentials: {
              email: 'admin@example.com',
              password: 'admin123',
            },
          })
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Error ensuring admin user:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to ensure admin user',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// Also allow GET for easy testing
export async function GET(req: NextRequest) {
  return POST(req)
}
