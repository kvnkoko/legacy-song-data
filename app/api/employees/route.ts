import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EmployeeStatus } from '@prisma/client'

// Get all employees for dropdowns and lists
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employees = await prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    return NextResponse.json({ employees })
  } catch (error: any) {
    console.error('Get employees error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

