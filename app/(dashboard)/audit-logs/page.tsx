import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { UserRole } from '@prisma/client'
import { AuditLogsTable } from '@/components/audit-logs-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'
import { ReloadButton } from '@/components/reload-button'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { 
    page?: string
    userId?: string
    entityType?: string
    action?: string
    startDate?: string
    endDate?: string
    search?: string
  }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  // Only Admin and Manager can view audit logs
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const page = parseInt(searchParams.page || '1')
  const pageSize = 50

  // Build where clause
  const where: any = {}

  if (searchParams.userId) {
    where.userId = searchParams.userId
  }

  if (searchParams.entityType) {
    where.entityType = searchParams.entityType
  }

  if (searchParams.action) {
    where.action = searchParams.action
  }

  if (searchParams.startDate || searchParams.endDate) {
    where.createdAt = {}
    if (searchParams.startDate) {
      where.createdAt.gte = new Date(searchParams.startDate)
    }
    if (searchParams.endDate) {
      where.createdAt.lte = new Date(searchParams.endDate)
    }
  }

  if (searchParams.search) {
    where.OR = [
      { entityId: { contains: searchParams.search, mode: 'insensitive' as const } },
      { fieldName: { contains: searchParams.search, mode: 'insensitive' as const } },
      { oldValue: { contains: searchParams.search, mode: 'insensitive' as const } },
      { newValue: { contains: searchParams.search, mode: 'insensitive' as const } },
    ]
  }

  // Initialize default values
  let auditLogs: any[] = []
  let total = 0
  let users: any[] = []
  let entityTypes: any[] = []
  let actions: any[] = []
  let dbError: string | null = null

  try {
    // Test connection first with a simple query (with timeout)
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
    ]) as any

    const results = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            include: {
              employee: true,
            },
          },
          release: {
            select: {
              id: true,
              title: true,
              artist: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          employee: {
            select: {
              employeeId: true,
            },
          },
        },
        orderBy: { email: 'asc' },
      }),
      prisma.auditLog.findMany({
        select: { entityType: true },
        distinct: ['entityType'],
        orderBy: { entityType: 'asc' },
      }),
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
    ])

    auditLogs = results[0]
    total = results[1]
    users = results[2]
    entityTypes = results[3]
    actions = results[4]
  } catch (error: any) {
    console.error('Database error:', error)
    // Check if it's a connection error
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P1001' || error.code === 'P1000') {
        dbError = `Failed to connect to the database. Please ensure the database server is running and accessible.`
      } else {
        dbError = `Database error (${error.code}): ${error.message || 'An unexpected database error occurred'}`
      }
    } else if (error.message?.includes("Can't reach database server") || 
        error.message?.includes("P1001") ||
        error.message?.includes("P1000") ||
        error.code === 'P1001' ||
        error.code === 'P1000') {
      dbError = `Failed to connect to the database. Please ensure the database server is running and accessible.`
    } else {
      dbError = `An unexpected database error occurred: ${(error as Error).message || 'Unknown error'}`
    }
  }

  const totalPages = Math.ceil(total / pageSize) || 1
  const uniqueEntityTypes = Array.from(new Set(entityTypes.map((e: any) => e.entityType)))
  const uniqueActions = Array.from(new Set(actions.map((a: any) => a.action)))

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1.5">
            Track all user actions and changes across the system
          </p>
        </div>
      </div>

      {dbError && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Database Error</AlertTitle>
          <AlertDescription>
            {dbError}
            <p className="mt-2">Please check your <code>.env</code> file for <code>DATABASE_URL</code> and ensure your database server is running.</p>
            <div className="mt-4">
              <ReloadButton />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!dbError && (
        <AuditLogsTable
          auditLogs={auditLogs as any}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          users={users}
          entityTypes={uniqueEntityTypes}
          actions={uniqueActions}
          searchParams={searchParams}
        />
      )}
    </div>
  )
}


