import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createAuditLog } from '@/lib/utils'

export async function GET(
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

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
        artist: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error: any) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

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
    const { email, name, password, role: userRole, employeeId, team } = body

    // Get current user data for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true, name: true, role: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: params.id },
        },
      })

      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
    }

    // Update user
    const updateData: any = {}
    if (email) updateData.email = email
    if (name !== undefined) updateData.name = name
    if (userRole) updateData.role = userRole
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    })

    // Update employee record if needed
    if (userRole === UserRole.A_R || userRole === UserRole.DATA_TEAM || userRole?.startsWith('PLATFORM_')) {
      const employee = await prisma.employee.findUnique({
        where: { userId: params.id },
      })

      if (employee) {
        const oldEmployeeData = { employeeId: employee.employeeId, team: employee.team }
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            employeeId: employeeId || employee.employeeId,
            team: team !== undefined ? team : employee.team,
          },
        })
        // Audit log for employee update
        await createAuditLog(prisma, {
          userId: session.user.id,
          entityType: 'employee',
          entityId: employee.id,
          action: 'update',
          oldValue: JSON.stringify(oldEmployeeData),
          newValue: JSON.stringify({ employeeId: employeeId || employee.employeeId, team: team !== undefined ? team : employee.team }),
        })
      } else if (employeeId || team) {
        const newEmployee = await prisma.employee.create({
          data: {
            userId: params.id,
            employeeId: employeeId || `EMP-${params.id.slice(0, 8)}`,
            team: team || null,
          },
        })
        // Audit log for employee creation
        await createAuditLog(prisma, {
          userId: session.user.id,
          entityType: 'employee',
          entityId: newEmployee.id,
          action: 'create',
          newValue: JSON.stringify({ employeeId: newEmployee.employeeId, team: newEmployee.team }),
        })
      }
    }

    // Create audit log for user update
    const fieldsChanged: string[] = []
    if (email && email !== currentUser.email) fieldsChanged.push(`email: ${currentUser.email} → ${email}`)
    if (name !== undefined && name !== currentUser.name) fieldsChanged.push(`name: ${currentUser.name} → ${name}`)
    if (userRole && userRole !== currentUser.role) fieldsChanged.push(`role: ${currentUser.role} → ${userRole}`)
    if (password) fieldsChanged.push('password: [changed]')

    if (fieldsChanged.length > 0) {
      await createAuditLog(prisma, {
        userId: session.user.id,
        entityType: 'user',
        entityId: params.id,
        action: 'update',
        oldValue: JSON.stringify({ email: currentUser.email, name: currentUser.name, role: currentUser.role }),
        newValue: JSON.stringify({ email: user.email, name: user.name, role: user.role }),
      })
    }

    return NextResponse.json({ id: user.id, email: user.email })
  } catch (error: any) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}




