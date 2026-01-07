import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Briefcase, 
  Users, 
  Mail,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { EmployeePhotoUpload } from '@/components/employee-photo-upload'
import { EmployeeOrgEdit } from '@/components/employee-org-edit'
import { UserRole, EmployeeStatus } from '@prisma/client'
import { EmployeeProfileImage } from '@/components/employee-profile-image'
import { AnimatedCard } from '@/components/animated-card'
import { StatsCard } from '@/components/stats-card'
import { EmptyState } from '@/components/empty-state'
import { EmployeeStatusSelector } from '@/components/employee-status-selector'

export default async function EmployeeProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      employeeId: true,
      team: true,
      department: true,
      jobTitle: true,
      location: true,
      photo: true,
      bio: true,
      hireDate: true,
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
          id: true,
          title: true,
          type: true,
          createdAt: true,
          artist: {
            select: {
              id: true,
              name: true,
            },
          },
          tracks: {
            select: {
              id: true,
            },
          },
          platformRequests: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20, // Limit to first 20 releases for initial load
      },
    },
  })

  if (!employee) {
    notFound()
  }

  const session = await getServerSession(authOptions)
  const role = session?.user?.role as UserRole | undefined
  const canEdit = session && (
    session.user.id === employee.userId ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.MANAGER
  )

  // Get all employees for org edit dropdown
  let allEmployees: any[] = []
  if (canEdit) {
    allEmployees = await prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })
  }

  const totalReleases = employee.assignedReleases.length
  const pendingReleases = employee.assignedReleases.filter((r) => {
    return r.platformRequests.some((p) => p.status === 'PENDING')
  }).length
  const completedReleases = employee.assignedReleases.filter((r) => {
    return r.platformRequests.some((p) => p.status === 'UPLOADED')
  }).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Header */}
      <div className="relative h-80 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-b border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-8 pt-8 relative z-10">
          <Link href="/employees">
            <Button variant="ghost" size="sm" className="mb-4 hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-8 -mt-32 relative z-10">
        {/* Hero Profile Card */}
        <AnimatedCard delay={0.1}>
          <Card className="shadow-purple-lg border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Prominent Avatar */}
                <div className="flex-shrink-0 flex justify-center md:justify-start">
                  <div className="relative">
                    <EmployeeProfileImage
                      name={employee.user.name || 'Employee'}
                      email={employee.user.email}
                      photo={employee.photo}
                      size="xl"
                      showGlow
                      active={employee.status === EmployeeStatus.ACTIVE}
                      showBadge
                    />
                    {canEdit && (
                      <div className="mt-4">
                        <EmployeePhotoUpload 
                          employeeId={employee.id}
                          currentPhoto={employee.photo}
                          canEdit={!!canEdit}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="mb-6">
                    <div className="flex items-start justify-between flex-col md:flex-row gap-4">
                      <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                          {employee.user.name || 'Employee'}
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                          <Mail className="w-4 h-4 text-primary" />
                          {employee.user.email}
                        </p>
                        {employee.employeeId && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ID: {employee.employeeId}
                          </p>
                        )}
                      </div>
                    {canEdit && (
                      <EmployeeOrgEdit
                        employeeId={employee.id}
                        currentData={{
                          department: employee.department,
                          jobTitle: employee.jobTitle,
                          location: employee.location,
                          team: employee.team,
                          hireDate: employee.hireDate,
                          reportingToId: employee.reportingToId,
                        }}
                        employees={allEmployees.map(e => ({
                          id: e.id,
                          user: {
                            name: e.user.name,
                            email: e.user.email,
                          },
                        }))}
                        canEdit={!!canEdit}
                      />
                    )}
                    </div>
                  </div>

                  {/* Role & Org Info */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="w-3 h-3" />
                      {employee.user.role.replace('_', ' ')}
                    </Badge>
                    {employee.jobTitle && (
                      <Badge variant="default" className="gap-1">
                        {employee.jobTitle}
                      </Badge>
                    )}
                    {employee.department && (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="w-3 h-3" />
                        {employee.department}
                      </Badge>
                    )}
                    {employee.team && (
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {employee.team}
                      </Badge>
                    )}
                    {employee.location && (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="w-3 h-3" />
                        {employee.location}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Status Selector (Admin/Manager only) */}
                  {canEdit && role && (role === UserRole.ADMIN || role === UserRole.MANAGER) && (
                    <div className="mt-4 pt-4 border-t">
                      <EmployeeStatusSelector
                        employeeId={employee.id}
                        currentStatus={employee.status}
                        employeeName={employee.user.name || 'Employee'}
                      />
                    </div>
                  )}

                  {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <StatsCard
                    title="Assigned"
                    value={totalReleases}
                    icon="Briefcase"
                    gradient={false}
                    delay={0.2}
                  />
                  <StatsCard
                    title="Pending"
                    value={pendingReleases}
                    icon="Clock"
                    gradient={false}
                    delay={0.3}
                  />
                  <StatsCard
                    title="Completed"
                    value={completedReleases}
                    icon="CheckCircle2"
                    gradient={false}
                    delay={0.4}
                  />
                </div>

                {/* Additional Info */}
                <div className="pt-4 border-t space-y-2">
                  {employee.hireDate && (
                    <div className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Hired: </span>
                      <span className="font-medium">{formatDate(employee.hireDate)}</span>
                    </div>
                  )}
                  
                  {/* Reporting Structure */}
                  {(employee.reportingTo || employee.reports.length > 0) && (
                    <div className="space-y-2 mt-3">
                      {employee.reportingTo && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Reports to: </span>
                          <Link 
                            href={`/profiles/employee/${employee.reportingTo.id}`}
                            className="font-medium hover:underline"
                          >
                            {employee.reportingTo.user.name || employee.reportingTo.user.email}
                          </Link>
                        </div>
                      )}
                      {employee.reports.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Manages ({employee.reports.length}): </span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {employee.reports.map((report) => (
                              <Link
                                key={report.id}
                                href={`/profiles/employee/${report.id}`}
                                className="font-medium hover:underline text-primary"
                              >
                                {report.user.name || report.user.email}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {employee.bio && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{employee.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>
        </AnimatedCard>

        {/* Assigned Releases */}
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Briefcase className="w-6 h-6" weight="fill" />
              Assigned Releases ({totalReleases})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employee.assignedReleases.map((release) => (
              <Link key={release.id} href={`/releases/${release.id}`}>
                <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="line-clamp-2">{release.title}</CardTitle>
                      <Badge variant="outline">{release.type}</Badge>
                    </div>
                    <CardDescription>
                      {release.artist.name} • {release.tracks.length} tracks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {release.platformRequests.some(p => p.status === 'PENDING') ? (
                        <Clock className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-flow-green" />
                      )}
                      {release.platformRequests.some(p => p.status === 'PENDING') 
                        ? 'Pending' 
                        : 'In Progress'}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {employee.assignedReleases.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No assigned releases
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

