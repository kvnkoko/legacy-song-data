import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { createAuditLog } from '@/lib/utils'

export async function POST(
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

    // Prevent self-deletion
    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create audit log before deletion
    await createAuditLog(prisma, {
      userId: session.user.id,
      entityType: 'user',
      entityId: params.id,
      action: 'delete',
      oldValue: JSON.stringify({ email: user.email, name: user.name, role: user.role }),
    })

    // If user has employee record, log that too
    if (user.employee) {
      await createAuditLog(prisma, {
        userId: session.user.id,
        entityType: 'employee',
        entityId: user.employee.id,
        action: 'delete',
        oldValue: JSON.stringify({ employeeId: user.employee.employeeId }),
      })
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}




