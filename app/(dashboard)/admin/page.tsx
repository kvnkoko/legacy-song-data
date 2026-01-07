import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, UserPlus, Settings, Radio } from 'lucide-react'
import { UserDeleteButton } from '@/components/user-delete-button'
import { DatabaseCleanupButton } from '@/components/database-cleanup-button'
import { CancelImportsButton } from '@/components/cancel-imports-button'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          status: true,
          department: true,
          team: true,
          jobTitle: true,
        },
      },
      artist: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const roleCounts = {
    ADMIN: users.filter(u => u.role === UserRole.ADMIN).length,
    MANAGER: users.filter(u => u.role === UserRole.MANAGER).length,
    A_R: users.filter(u => u.role === UserRole.A_R).length,
    DATA_TEAM: users.filter(u => u.role === UserRole.DATA_TEAM).length,
    PLATFORM: users.filter(u => u.role.startsWith('PLATFORM_')).length,
    CLIENT: users.filter(u => u.role === UserRole.CLIENT).length,
  }

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">Manage users, permissions, and system settings</p>
        </div>
        <Link href="/admin/users/new">
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{roleCounts.ADMIN}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clients/Artists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{roleCounts.CLIENT}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage all system users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 hover:border-border/80 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" title={user.name || 'No name'}>{user.name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground truncate" title={user.email}>{user.email}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        Role: <span className="capitalize">{user.role.replace('_', ' ').toLowerCase()}</span>
                        {user.employee && ` • Employee ID: ${user.employee.employeeId}`}
                        {user.artist && ` • Artist`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/users/${user.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <UserDeleteButton userId={user.id} currentUserId={session.user.id} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {role === UserRole.ADMIN && (
                <div className="pb-3 border-b space-y-3">
                  <CancelImportsButton />
                  <DatabaseCleanupButton />
                </div>
              )}
              <Link href="/admin/users/new">
                <Button variant="outline" className="w-full justify-start px-4 py-2">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add New User
                </Button>
              </Link>
              <Link href="/admin/employees">
                <Button variant="outline" className="w-full justify-start px-4 py-2">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Employees
                </Button>
              </Link>
              <Link href="/admin/artists">
                <Button variant="outline" className="w-full justify-start px-4 py-2">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Manage Artists
                </Button>
              </Link>
              <Link href="/admin/channels">
                <Button variant="outline" className="w-full justify-start px-4 py-2">
                  <Radio className="w-4 h-4 mr-2" />
                  Platform Channels
                </Button>
              </Link>
              <Link href="/admin/form-fields">
                <Button variant="outline" className="w-full justify-start px-4 py-2">
                  <Settings className="w-4 h-4 mr-2" />
                  Form Fields
                </Button>
              </Link>
              <Link href="/admin/permissions">
                <Button variant="outline" className="w-full justify-start px-4 py-2">
                  <Settings className="w-4 h-4 mr-2" />
                  Field Permissions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

