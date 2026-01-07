import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole, EmployeeStatus } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'

// Get all departments with employee counts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all departments from Department table (if it exists) or from employees
    let allDepartments: string[] = []
    
    try {
      // Try to get departments from Department table first
      const deptRecords = await (prisma as any).department.findMany({
        select: { name: true },
      })
      
      if (deptRecords) {
        allDepartments = deptRecords.map((d: { name: string }) => d.name)
      }
    } catch {
      // Department table doesn't exist yet, fall back to employee-based approach
    }

    // Get all unique departments from employees (for backward compatibility)
    const employees = await prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE, department: { not: null } },
      select: { department: true },
    })

    const departmentMap = new Map<string, number>()
    
    // Add departments from Department table with 0 count initially
    allDepartments.forEach(dept => {
      departmentMap.set(dept, 0)
    })
    
    // Count employees per department
    employees.forEach(emp => {
      if (emp.department) {
        departmentMap.set(emp.department, (departmentMap.get(emp.department) || 0) + 1)
      }
    })

    // Also add any departments that exist in employees but not in Department table
    employees.forEach(emp => {
      if (emp.department && !departmentMap.has(emp.department)) {
        departmentMap.set(emp.department, 1)
      }
    })

    const departments = Array.from(departmentMap.entries()).map(([name, count]) => ({
      name,
      employeeCount: count,
    })).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ departments })
  } catch (error: any) {
    console.error('Get departments error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

// Create or update department (by renaming)
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
    const { name, oldName } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const departmentName = name.trim()

    // If oldName is provided, rename the department
    if (oldName && oldName !== departmentName) {
      // Get affected employees for audit log
      const affectedEmployees = await prisma.employee.findMany({
        where: { department: oldName },
        select: { id: true },
      })

      // Update employees
      await prisma.employee.updateMany({
        where: { department: oldName },
        data: { department: departmentName },
      })

      // Update Department table if it exists
      try {
        await (prisma as any).department.updateMany({
          where: { name: oldName },
          data: { name: departmentName },
        })
      } catch {
        // Ignore if table doesn't exist
      }

      // Create audit logs for affected employees
      await Promise.all(
        affectedEmployees.map(emp =>
          createAuditLog(prisma, {
            userId: session.user.id,
            entityType: 'employee',
            entityId: emp.id,
            action: 'update',
            fieldName: 'department',
            oldValue: oldName,
            newValue: departmentName,
          })
        )
      )

      // Create audit log for department rename
      await createAuditLog(prisma, {
        userId: session.user.id,
        entityType: 'department',
        entityId: oldName,
        action: 'update',
        fieldName: 'name',
        oldValue: oldName,
        newValue: departmentName,
      })
    } else {
      // Create new department in Department table if it exists
      try {
        await (prisma as any).department.upsert({
          where: { name: departmentName },
          update: {},
          create: { name: departmentName },
        })
      } catch {
        // Ignore if table doesn't exist
      }

      // Create audit log for department creation
      await createAuditLog(prisma, {
        userId: session.user.id,
        entityType: 'department',
        entityId: departmentName,
        action: 'create',
        newValue: departmentName,
      })
    }

    return NextResponse.json({ success: true, name: departmentName })
  } catch (error: any) {
    console.error('Create/update department error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create/update department' },
      { status: 500 }
    )
  }
}

// Delete department (remove from all employees)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    // Get affected employees for audit log
    const affectedEmployees = await prisma.employee.findMany({
      where: { department: name },
      select: { id: true },
    })

    // Remove department from all employees
    await prisma.employee.updateMany({
      where: { department: name },
      data: { department: null },
    })

    // Create audit logs for affected employees
    await Promise.all(
      affectedEmployees.map(emp =>
        createAuditLog(prisma, {
          userId: session.user.id,
          entityType: 'employee',
          entityId: emp.id,
          action: 'update',
          fieldName: 'department',
          oldValue: name,
          newValue: null,
        })
      )
    )

    // Create audit log for department deletion
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'department',
      entityId: name,
      action: 'delete',
      oldValue: name,
    })

    // Delete from Department table if it exists
    try {
      await (prisma as any).department.deleteMany({
        where: { name },
      })
    } catch {
      // Ignore if table doesn't exist
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete department error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete department' },
      { status: 500 }
    )
  }
}

