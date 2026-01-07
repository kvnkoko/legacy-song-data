import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Bulk assign employees to department
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
    const { employeeIds, department } = body

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: 'Employee IDs are required' }, { status: 400 })
    }

    // Update all employees
    await prisma.employee.updateMany({
      where: { id: { in: employeeIds } },
      data: { department: department || null },
    })

    // Create audit logs
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
    })

    await Promise.all(
      employees.map(emp =>
        createAuditLog(prisma, {
          userId: session.user.id,
          entityType: 'employee',
          entityId: emp.id,
          action: 'update',
          fieldName: 'department',
          newValue: department || null,
        })
      )
    )

    return NextResponse.json({ 
      success: true, 
      updated: employeeIds.length 
    })
  } catch (error: any) {
    console.error('Assign department error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign department' },
      { status: 500 }
    )
  }
}

