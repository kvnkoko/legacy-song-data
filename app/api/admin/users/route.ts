import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createAuditLog } from '@/lib/utils'

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
    const { email, name, password, role: userRole, employeeId, team } = body

    // Validate
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: userRole || UserRole.CLIENT,
      },
    })

    // Create employee record if needed
    let employee = null
    if ((userRole === UserRole.A_R || userRole === UserRole.DATA_TEAM || userRole?.startsWith('PLATFORM_')) && (employeeId || team)) {
      employee = await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: employeeId || `EMP-${user.id.slice(0, 8)}`,
          team: team || null,
        },
      })
    }

    // Create audit log for user creation
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'create',
      newValue: JSON.stringify({ email: user.email, name: user.name, role: user.role }),
    })

    // Create audit log for employee creation if applicable
    if (employee) {
      await createAuditLog(prisma, {
        userId: session.user.id,
        entityType: 'employee',
        entityId: employee.id,
        action: 'create',
        newValue: JSON.stringify({ employeeId: employee.employeeId, team: employee.team }),
      })
    }

    return NextResponse.json({ id: user.id, email: user.email })
  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}




