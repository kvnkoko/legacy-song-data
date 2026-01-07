import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { UserPlus, Briefcase } from 'lucide-react'
import { EmployeeForm } from '@/components/employee-form'
import { EmployeeStatusBadge } from '@/components/employee-status-selector'

export default async function EmployeesAdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const employees = await prisma.employee.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      reportingTo: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      },
      assignedReleases: true,
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
          <h1 className="text-3xl font-bold tracking-tight">Manage Employees</h1>
          <p className="text-muted-foreground mt-1.5">Add and manage employees in the system</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">Back to Admin</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Employees</CardTitle>
              <CardDescription>Employees with or without CMS access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 hover:border-border/80 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" title={employee.user.name || 'No name'}>{employee.user.name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground truncate" title={employee.user.email}>{employee.user.email}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span className="truncate">Employee ID: {employee.employeeId}</span>
                        <EmployeeStatusBadge status={employee.status} />
                        {employee.department && (
                          <span className="truncate">• Dept: {employee.department}</span>
                        )}
                        {employee.team && <span className="truncate">• Team: {employee.team}</span>}
                        {employee.jobTitle && <span className="truncate">• {employee.jobTitle}</span>}
                        {employee.reportingTo && (
                          <span className="truncate" title={`Reports to: ${employee.reportingTo.user.name || employee.reportingTo.user.email}`}>
                            • Reports to: {employee.reportingTo.user.name || employee.reportingTo.user.email}
                          </span>
                        )}
                        {employee.user.role !== UserRole.CLIENT && (
                          <span className="truncate">• Role: {employee.user.role.replace('_', ' ')}</span>
                        )}
                        {!employee.user.role || employee.user.role === UserRole.CLIENT ? (
                          <span className="text-blue-600">• No CMS Access</span>
                        ) : (
                          <span className="text-green-600">• Has CMS Access</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/profiles/employee/${employee.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/admin/employees/${employee.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {employees.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No employees yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add Employee</CardTitle>
              <CardDescription>Create a new employee record</CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


