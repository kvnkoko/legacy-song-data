import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole, EmployeeStatus } from '@prisma/client'
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
    const { 
      email, 
      name, 
      password, 
      role: userRole, 
      employeeId, 
      team, 
      department,
      jobTitle,
      location,
      hireDate,
      bio,
      reportingToId,
      status
    } = body

    // Validate
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 })
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

    // Create user (use CLIENT role if 'none' or empty - they won't have CMS access)
    const finalRole = (userRole === 'none' || !userRole) ? UserRole.CLIENT : userRole
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: finalRole,
      },
    })

    // Prevent circular reporting if reportingToId is provided
    if (reportingToId) {
      // Check if this would create a circular reference
      const checkCircular = async (empId: string, targetId: string, depth = 0): Promise<boolean> => {
        if (depth > 10) return true // Prevent infinite loops
        if (empId === targetId) return true
        
        const emp = await prisma.employee.findUnique({
          where: { id: empId },
          select: { reportingToId: true },
        })
        
        if (!emp || !emp.reportingToId) return false
        if (emp.reportingToId === targetId) return true
        
        return checkCircular(emp.reportingToId, targetId, depth + 1)
      }
      
      // Since we're creating a new employee, we can't check circular yet
      // But we can verify the reportingToId exists
      const reportingTo = await prisma.employee.findUnique({
        where: { id: reportingToId },
      })
      
      if (!reportingTo) {
        return NextResponse.json(
          { error: 'Reporting manager not found' },
          { status: 400 }
        )
      }
    }

    // Always create employee record
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeId: employeeId || `EMP-${Date.now()}`,
        team: team || null,
        department: department || null,
        jobTitle: jobTitle || null,
        location: location || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        bio: bio || null,
        reportingToId: reportingToId || null,
        status: (status && Object.values(EmployeeStatus).includes(status)) ? status : EmployeeStatus.ACTIVE,
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'employee',
      entityId: employee.id,
      action: 'create',
      fieldName: 'employee',
      newValue: JSON.stringify({ email, name, role: finalRole, employeeId: employee.employeeId }),
    })

    return NextResponse.json({ 
      id: user.id, 
      email: user.email,
      employeeId: employee.employeeId 
    })
  } catch (error: any) {
    console.error('Create employee error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create employee' },
      { status: 500 }
    )
  }
}

