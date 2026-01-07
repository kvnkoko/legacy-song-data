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
    const { reportingToId } = body

    // Get current employee data for audit log
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: { reportingToId: true },
    })

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Normalize reportingToId - convert empty string, 'none', or null to null
    const normalizedReportingToId = reportingToId && reportingToId !== 'none' && reportingToId !== '' ? reportingToId : null

    // Prevent circular references
    if (normalizedReportingToId === params.id) {
      return NextResponse.json({ error: 'Employee cannot report to themselves' }, { status: 400 })
    }

    // Check for circular reference in hierarchy
    if (normalizedReportingToId) {
      let currentId = normalizedReportingToId
      const visited = new Set<string>([params.id])
      
      while (currentId) {
        if (visited.has(currentId)) {
          return NextResponse.json({ error: 'Circular reference detected in reporting structure' }, { status: 400 })
        }
        visited.add(currentId)
        
        const manager = await prisma.employee.findUnique({
          where: { id: currentId },
          select: { reportingToId: true },
        })
        
        if (!manager) break
        currentId = manager.reportingToId || ''
      }

      // Verify the manager exists
      const managerExists = await prisma.employee.findUnique({
        where: { id: normalizedReportingToId },
        select: { id: true },
      })

      if (!managerExists) {
        return NextResponse.json({ error: 'Selected manager not found' }, { status: 404 })
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        reportingToId: normalizedReportingToId,
      },
      select: {
        id: true,
        reportingTo: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })

    // Create audit log
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'employee',
      entityId: params.id,
      action: 'update',
      fieldName: 'reportingToId',
      oldValue: currentEmployee.reportingToId || null,
      newValue: normalizedReportingToId,
    })

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        reportingTo: employee.reportingTo ? {
          id: employee.reportingTo.id,
          name: employee.reportingTo.user.name,
        } : null,
      },
    })
  } catch (error: any) {
    console.error('Update reporting error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update reporting structure' },
      { status: 500 }
    )
  }
}



