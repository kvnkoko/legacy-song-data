import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole, EmployeeStatus } from '@prisma/client'
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
    // Only ADMIN and MANAGER can change employee status
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employeeId = params.id
    const body = await req.json()
    const { status, notes } = body

    // Validate status
    if (!status || !Object.values(EmployeeStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid employee status' },
        { status: 400 }
      )
    }

    // Get current employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Validate status transitions
    // Can't go from TERMINATED or RESIGNED back to ACTIVE without special handling
    if (
      (employee.status === EmployeeStatus.TERMINATED ||
        employee.status === EmployeeStatus.RESIGNED) &&
      status === EmployeeStatus.ACTIVE
    ) {
      // Only ADMIN can reactivate terminated/resigned employees
      if (role !== UserRole.ADMIN) {
        return NextResponse.json(
          {
            error:
              'Only administrators can reactivate terminated or resigned employees',
          },
          { status: 403 }
        )
      }
    }

    // Update employee status
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: { status },
      select: {
        id: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'employee',
      entityId: employeeId,
      action: 'update',
      fieldName: 'status',
      oldValue: employee.status,
      newValue: status,
    })

    // If notes were provided, we could store them in a separate table
    // For now, we'll just log them in the audit log if needed
    if (notes) {
      await createAuditLog(prisma, {
        userId: session.user.id,
        entityType: 'employee',
        entityId: employeeId,
        action: 'update',
        fieldName: 'status_notes',
        newValue: notes,
      })
    }

    return NextResponse.json({
      id: updatedEmployee.id,
      status: updatedEmployee.status,
      message: 'Employee status updated successfully',
    })
  } catch (error: any) {
    console.error('Update employee status error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update employee status' },
      { status: 500 }
    )
  }
}

