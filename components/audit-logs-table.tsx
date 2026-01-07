'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  X,
  User,
  Calendar,
  FileText,
  Activity
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DateRangePicker } from './date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

interface AuditLog {
  id: string
  userId: string
  releaseId: string | null
  entityType: string
  entityId: string
  action: string
  fieldName: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: Date
  user: {
    id: string
    email: string
    name: string | null
    role: string
    employee: {
      employeeId: string
    } | null
  }
  release: {
    id: string
    title: string
    artist: {
      name: string
    }
  } | null
}

interface AuditLogsTableProps {
  auditLogs: AuditLog[]
  total: number
  currentPage: number
  totalPages: number
  users: Array<{
    id: string
    email: string
    name: string | null
    role: string
    employee: { employeeId: string } | null
  }>
  entityTypes: string[]
  actions: string[]
  searchParams: {
    userId?: string
    entityType?: string
    action?: string
    startDate?: string
    endDate?: string
    search?: string
  }
}

export function AuditLogsTable({
  auditLogs,
  total,
  currentPage,
  totalPages,
  users,
  entityTypes,
  actions,
  searchParams,
}: AuditLogsTableProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const [search, setSearch] = useState(searchParams.search || '')
  const [userIdFilter, setUserIdFilter] = useState(searchParams.userId || 'all')
  const [entityTypeFilter, setEntityTypeFilter] = useState(searchParams.entityType || 'all')
  const [actionFilter, setActionFilter] = useState(searchParams.action || 'all')
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(
    searchParams.startDate ? new Date(searchParams.startDate) : undefined
  )
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(
    searchParams.endDate ? new Date(searchParams.endDate) : undefined
  )

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParamsHook.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    params.set('page', '1') // Reset to first page on filter change
    router.push(`/audit-logs?${params.toString()}`)
  }

  const handleSearch = () => {
    updateSearchParams({ search: search || undefined })
  }

  const clearFilters = () => {
    setSearch('')
    setUserIdFilter('all')
    setEntityTypeFilter('all')
    setActionFilter('all')
    setDateRangeStart(undefined)
    setDateRangeEnd(undefined)
    router.push('/audit-logs')
  }

  const hasActiveFilters = 
    search || 
    userIdFilter !== 'all' || 
    entityTypeFilter !== 'all' || 
    actionFilter !== 'all' || 
    dateRangeStart || 
    dateRangeEnd

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'default'
      case 'update':
        return 'secondary'
      case 'delete':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getEntityTypeLabel = (entityType: string) => {
    return entityType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Total Logs</div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Unique Users</div>
          <div className="text-2xl font-bold">{new Set(auditLogs.map(log => log.userId)).size}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Entity Types</div>
          <div className="text-2xl font-bold">{entityTypes.length}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Actions</div>
          <div className="text-2xl font-bold">{actions.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search entity IDs, field names, values..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} size="sm">
              Search
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker
              startDate={dateRangeStart}
              endDate={dateRangeEnd}
              onDateChange={(start, end) => {
                setDateRangeStart(start)
                setDateRangeEnd(end)
                updateSearchParams({
                  startDate: start?.toISOString(),
                  endDate: end?.toISOString(),
                })
              }}
            />

            <Select 
              value={userIdFilter} 
              onValueChange={(value) => {
                setUserIdFilter(value)
                updateSearchParams({ userId: value })
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email} {user.employee && `(${user.employee.employeeId})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={entityTypeFilter} 
              onValueChange={(value) => {
                setEntityTypeFilter(value)
                updateSearchParams({ entityType: value })
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {getEntityTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={actionFilter} 
              onValueChange={(value) => {
                setActionFilter(value)
                updateSearchParams({ action: value })
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Showing {auditLogs.length} of {total} logs</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[200px]">User</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
                <TableHead className="w-[150px]">Entity Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="w-[120px]">Field</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <div>
                          <div>{formatDate(log.createdAt)}</div>
                          <div className="text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {log.user.name || log.user.email}
                          </div>
                          {log.user.employee && (
                            <div className="text-xs text-muted-foreground">
                              {log.user.employee.employeeId}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {log.user.role.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)} className="text-xs">
                        {log.action.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{getEntityTypeLabel(log.entityType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.release ? (
                        <Link 
                          href={`/releases/${log.release.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {log.release.title}
                          <div className="text-xs text-muted-foreground">
                            by {log.release.artist.name}
                          </div>
                        </Link>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          <code className="text-xs">{log.entityId}</code>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.fieldName ? (
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {log.fieldName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {log.oldValue || log.newValue ? (
                        <div className="space-y-1 text-xs">
                          {log.oldValue && (
                            <div className="flex items-start gap-2">
                              <span className="text-red-600 font-medium">-</span>
                              <span className="line-through text-muted-foreground truncate">
                                {log.oldValue}
                              </span>
                            </div>
                          )}
                          {log.newValue && (
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 font-medium">+</span>
                              <span className="truncate">{log.newValue}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, total)} of {total} logs
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href={`/audit-logs?page=${currentPage - 1}${searchParamsHook.toString() ? `&${searchParamsHook.toString()}` : ''}`}
            >
              <Button variant="outline" size="sm" disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            </Link>
            <div className="text-sm px-4">
              Page {currentPage} of {totalPages}
            </div>
            <Link 
              href={`/audit-logs?page=${currentPage + 1}${searchParamsHook.toString() ? `&${searchParamsHook.toString()}` : ''}`}
            >
              <Button variant="outline" size="sm" disabled={currentPage === totalPages}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}






