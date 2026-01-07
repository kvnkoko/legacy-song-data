import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { UserRole, EmployeeStatus } from '@prisma/client'
import { EnhancedOrgChartView } from '@/components/enhanced-org-chart-view'

export default async function OrgChartPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  const canEdit = role === UserRole.ADMIN || role === UserRole.MANAGER

  // Get all employees with their hierarchy
  const employees = await prisma.employee.findMany({
    where: { status: EmployeeStatus.ACTIVE },
    select: {
      id: true,
      employeeId: true,
      team: true,
      department: true,
      jobTitle: true,
      location: true,
      hireDate: true,
      photo: true,
      status: true,
      reportingToId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
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
      reports: {
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
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizational Chart</h1>
          <p className="text-muted-foreground mt-1.5">
            Visualize and manage your company hierarchy with advanced filtering and analytics
          </p>
        </div>
      </div>

      <EnhancedOrgChartView employees={employees as any} canEdit={canEdit} />
    </div>
  )
}

