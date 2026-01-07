import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Search, 
  Briefcase,
  CheckCircle2,
  XCircle,
  Building2,
  GitBranch,
  Music
} from 'lucide-react'
import Link from 'next/link'
import { EmployeeFormDialog } from '@/components/employee-form-dialog'
import { UserRole, EmployeeStatus } from '@prisma/client'
import { EmployeeFilters } from './employee-filters'
import { ProfileCard } from '@/components/profile-card'
import { EmptyState } from '@/components/empty-state'
import { AnimatedCard } from '@/components/animated-card'
import { EmployeeStatusBadge } from '@/components/employee-status-selector'

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { search?: string; team?: string; role?: string; department?: string; status?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  const canAddEmployees = role === UserRole.ADMIN || role === UserRole.MANAGER

  const search = searchParams.search || ''
  const teamFilter = searchParams.team
  const roleFilter = searchParams.role
  const departmentFilter = searchParams.department
  const statusFilter = searchParams.status

  const where: any = {
    // Default to showing only ACTIVE employees, but allow filtering
    status: statusFilter && statusFilter !== 'all' ? (statusFilter as EmployeeStatus) : EmployeeStatus.ACTIVE,
  }
  
  // If "all" is selected, don't filter by status
  if (statusFilter === 'all') {
    delete where.status
  }

  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { employeeId: { contains: search, mode: 'insensitive' } },
      { jobTitle: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { team: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (teamFilter && teamFilter !== 'all') {
    where.team = teamFilter
  }

  if (departmentFilter && departmentFilter !== 'all') {
    where.department = departmentFilter
  }

  if (roleFilter && roleFilter !== 'all') {
    if (where.OR) {
      // If we have OR conditions, we need to combine them properly
      where.AND = [
        { OR: where.OR },
        { user: { role: roleFilter } },
      ]
      delete where.OR
    } else {
      where.user = { role: roleFilter }
    }
  }

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      team: true,
      department: true,
      jobTitle: true,
      location: true,
      photo: true,
      status: true,
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
            },
          },
        },
      },
      assignedReleases: {
        select: {
          artistId: true,
        },
      },
      _count: {
        select: {
          assignedReleases: true,
        },
      },
    },
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })

  // Get unique teams, departments, roles, and statuses for filters
  const allEmployees = await prisma.employee.findMany({
    select: {
      team: true,
      department: true,
      status: true,
      user: {
        select: {
          role: true,
        },
      },
    },
  })
  const teams = Array.from(new Set(allEmployees.map(e => e.team).filter(Boolean))).sort()
  const departments = Array.from(new Set(allEmployees.map(e => e.department).filter(Boolean))).sort()
  const roles = Array.from(new Set(allEmployees.map(e => e.user.role)))
  const statuses = Array.from(new Set(allEmployees.map(e => e.status).filter(Boolean))) as string[]

  // Get total counts
  const totalEmployees = await prisma.employee.count()
  const employeesByStatus = await prisma.employee.groupBy({
    by: ['status'],
    _count: true,
  })

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            <Users className="w-8 h-8 text-primary" />
            Employee Directory
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {search || statusFilter !== 'all' 
              ? `${employees.length} employee${employees.length !== 1 ? 's' : ''} found`
              : `${totalEmployees} total employee${totalEmployees !== 1 ? 's' : ''}`}
            {employeesByStatus.length > 0 && !search && statusFilter === 'all' && (
              <span className="ml-2 text-xs">
                ({employeesByStatus.map(s => `${s._count} ${s.status}`).join(', ')})
              </span>
            )}
          </p>
        </div>
        {canAddEmployees && <EmployeeFormDialog />}
      </div>

      {/* Filters */}
      <AnimatedCard delay={0.1}>
        <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/10">
          <CardContent className="p-4">
            <EmployeeFilters 
              departments={departments} 
              teams={teams} 
              roles={roles.map(r => r.toString())}
              statuses={statuses}
            />
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {employees.map((employee, index) => {
          const badges = [
            employee.user.role.replace('_', ' '),
            ...(employee.jobTitle ? [employee.jobTitle] : []),
            ...(employee.department ? [employee.department] : []),
            ...(employee.team ? [employee.team] : []),
          ]

          // Count unique artists from assigned releases
          const uniqueArtists = new Set(
            employee.assignedReleases
              .map(release => release.artistId)
              .filter(Boolean)
          )
          const artistCount = uniqueArtists.size

          return (
            <AnimatedCard key={employee.id} delay={0.3 + index * 0.05} hover glow>
              <ProfileCard
                type="employee"
                name={employee.user.name || 'Employee'}
                subtitle={employee.jobTitle || undefined}
                email={employee.user.email}
                photo={employee.photo}
                stats={[
                  { label: 'Releases', value: employee._count.assignedReleases || 0, icon: 'Briefcase' },
                  ...(artistCount > 0 
                    ? [{ label: 'Artists', value: artistCount, icon: 'Music' }] 
                    : []),
                  ...(employee.reports && employee.reports.length > 0 
                    ? [{ label: 'Team', value: employee.reports.length, icon: 'Users' }] 
                    : []),
                ]}
                badges={[
                  <EmployeeStatusBadge key="status" status={employee.status} />,
                  ...badges,
                ]}
                href={`/profiles/employee/${employee.id}`}
              />
            </AnimatedCard>
          )
        })}
      </div>

      {employees.length === 0 && (
        <EmptyState
          icon="Users"
          title="No employees found"
          description={search ? "Try adjusting your search or filters" : "Employees will appear here once they're added to the system"}
        />
      )}
    </div>
  )
}

