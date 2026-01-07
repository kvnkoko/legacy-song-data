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
    const { department, jobTitle, location, team, hireDate, reportingToId } = body

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Prevent circular reporting
    if (reportingToId === params.id) {
      return NextResponse.json(
        { error: 'Employee cannot report to themselves' },
        { status: 400 }
      )
    }

    // Check for circular reporting chain
    if (reportingToId) {
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
      
      const isCircular = await checkCircular(reportingToId, params.id)
      if (isCircular) {
        return NextResponse.json(
          { error: 'This would create a circular reporting structure' },
          { status: 400 }
        )
      }
    }

    // Update employee
    const updateData: any = {}
    if (department !== undefined) updateData.department = department || null
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle || null
    if (location !== undefined) updateData.location = location || null
    if (team !== undefined) updateData.team = team || null
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null
    if (reportingToId !== undefined) updateData.reportingToId = reportingToId || null

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        department: true,
        jobTitle: true,
        location: true,
        team: true,
        reportingToId: true,
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
      entityId: employee.id,
      action: 'update',
      fieldName: 'org_structure',
      oldValue: JSON.stringify({
          department: existingEmployee.department,
          jobTitle: existingEmployee.jobTitle,
          location: existingEmployee.location,
          team: existingEmployee.team,
          reportingToId: existingEmployee.reportingToId,
        }),
      newValue: JSON.stringify({
        department: employee.department,
        jobTitle: employee.jobTitle,
        location: employee.location,
        team: employee.team,
        reportingToId: employee.reportingToId,
      }),
    })

    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Update employee org error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update employee' },
      { status: 500 }
    )
  }
}



