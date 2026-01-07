'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { PlatformRequestStatus, UserRole } from '@prisma/client'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

interface PlatformRequest {
  id: string
  status: PlatformRequestStatus
  channelName: string | null
  channelId: string | null
  uploadLink: string | null
  uploadedAt: Date | null
  createdAt: Date
  release: {
    id: string
    title: string
    artist: {
      id: string
      name: string
    }
    tracks: Array<{
      id: string
      name: string
    }>
  } | null
  track: {
    id: string
    name: string
  } | null
  decisions: Array<{
    id: string
    status: PlatformRequestStatus
    notes: string | null
    createdAt: Date
    user: {
      name: string | null
      email: string
    }
  }>
  channel?: {
    id: string
    name: string
  } | null
}

interface PlatformChannel {
  id: string
  name: string
  channelId: string | null
}

interface PlatformRequestsTableProps {
  requests: PlatformRequest[]
  platformSlug: string
  platformName: string
  channels: PlatformChannel[]
  total: number
  currentPage: number
  totalPages: number
  searchParams: {
    status?: string
    channel?: string
    search?: string
  }
  userRole: UserRole
}

export function PlatformRequestsTable({
  requests,
  platformSlug,
  platformName,
  channels,
  total,
  currentPage,
  totalPages,
  searchParams,
  userRole,
}: PlatformRequestsTableProps) {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()
  const [search, setSearch] = useState(searchParams.search || '')
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<PlatformRequestStatus | ''>('')
  const [bulkChannelIds, setBulkChannelIds] = useState<string[]>([])
  const [bulkNotes, setBulkNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [quickActionRequest, setQuickActionRequest] = useState<{
    id: string
    status: PlatformRequestStatus
    channelId?: string
  } | null>(null)
  const [quickActionNotes, setQuickActionNotes] = useState('')

  const debouncedSearch = useDebounce(search, 500)
  const hasChannels = channels.length > 0
  const canApprove = userRole === UserRole.ADMIN || 
                     userRole === UserRole.MANAGER || 
                     userRole.toString().startsWith('PLATFORM_')

  // Update URL when search changes
  const updateURL = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(params.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    })
    newParams.set('page', '1')
    router.push(`/platforms/${platformSlug}?${newParams.toString()}`)
  }

  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== searchParams.search) {
      updateURL({ search: debouncedSearch || null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const handleQuickAction = async (requestId: string, status: PlatformRequestStatus, channelId?: string) => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/platform-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          channelId,
          notes: quickActionNotes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update request')
      }

      toast({
        title: 'Success',
        description: `Request ${status.toLowerCase()} successfully`,
      })

      setQuickActionRequest(null)
      setQuickActionNotes('')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update request',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkAction = async () => {
    if (!bulkStatus || selectedRequests.size === 0) return

    setProcessing(true)
    try {
      const response = await fetch('/api/platform-requests/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestIds: Array.from(selectedRequests),
          status: bulkStatus,
          channelIds: hasChannels && bulkChannelIds.length > 0 ? bulkChannelIds : undefined,
          notes: bulkNotes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update requests')
      }

      toast({
        title: 'Success',
        description: `Updated ${selectedRequests.size} request(s) successfully`,
      })

      setSelectedRequests(new Set())
      setBulkActionOpen(false)
      setBulkStatus('')
      setBulkChannelIds([])
      setBulkNotes('')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update requests',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedRequests)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRequests(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedRequests.size === requests.length) {
      setSelectedRequests(new Set())
    } else {
      setSelectedRequests(new Set(requests.map(r => r.id)))
    }
  }

  const getStatusColor = (status: PlatformRequestStatus) => {
    switch (status) {
      case PlatformRequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case PlatformRequestStatus.UPLOADED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case PlatformRequestStatus.REJECTED:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by title or artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateURL({ search: debouncedSearch || null })
                }
              }}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={searchParams.status || 'all'}
          onValueChange={(value) => updateURL({ status: value })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={PlatformRequestStatus.PENDING}>Pending</SelectItem>
            <SelectItem value={PlatformRequestStatus.REJECTED}>Rejected</SelectItem>
            <SelectItem value={PlatformRequestStatus.UPLOADED}>Uploaded</SelectItem>
          </SelectContent>
        </Select>

        {hasChannels && (
          <Select
            value={searchParams.channel || 'all'}
            onValueChange={(value) => updateURL({ channel: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.name}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {canApprove && selectedRequests.size > 0 && (
          <Button
            onClick={() => setBulkActionOpen(true)}
            variant="default"
          >
            Bulk Action ({selectedRequests.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {canApprove && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRequests.size === requests.length && requests.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Release / Track</TableHead>
              <TableHead>Artist</TableHead>
              {hasChannels && <TableHead>Channel</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Last Decision</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canApprove ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id} className="hover:bg-muted/50">
                  {canApprove && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRequests.has(request.id)}
                        onCheckedChange={() => toggleSelect(request.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {request.release?.title || request.track?.name || 'Untitled'}
                      </div>
                      {request.track && request.release && (
                        <div className="text-xs text-muted-foreground">
                          Track: {request.track.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.release?.artist.name || '-'}
                  </TableCell>
                  {hasChannels && (
                    <TableCell>
                      {request.channelName ? (
                        <Badge variant="outline">{request.channelName}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No channel</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.decisions.length > 0 ? (
                      <div className="text-sm">
                        <div>{request.decisions[0].user.name || request.decisions[0].user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(request.decisions[0].createdAt)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {canApprove && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => setQuickActionRequest({
                              id: request.id,
                              status: PlatformRequestStatus.UPLOADED,
                              channelId: request.channelId || undefined,
                            })}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Mark as Uploaded
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => setQuickActionRequest({
                              id: request.id,
                              status: PlatformRequestStatus.REJECTED,
                              channelId: request.channelId || undefined,
                            })}
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Link href={`/platforms/${platformSlug}/${request.id}/update`}>
                        <Button size="sm" variant="ghost" className="h-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, total)} of {total} requests
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(params.toString())
                newParams.set('page', String(Math.max(1, currentPage - 1)))
                router.push(`/platforms/${platformSlug}?${newParams.toString()}`)
              }}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(params.toString())
                newParams.set('page', String(Math.min(totalPages, currentPage + 1)))
                router.push(`/platforms/${platformSlug}?${newParams.toString()}`)
              }}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Action Dialog */}
      <Dialog open={!!quickActionRequest} onOpenChange={(open) => !open && setQuickActionRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {quickActionRequest?.status === PlatformRequestStatus.UPLOADED ? 'Mark as Uploaded' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {quickActionRequest?.status === PlatformRequestStatus.UPLOADED
                ? 'Mark this request as uploaded'
                : 'Reject this request'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {hasChannels && (
              <div className="space-y-2">
                <Label>Channel (optional)</Label>
                <Select
                  value={quickActionRequest?.channelId || ''}
                  onValueChange={(value) => {
                    if (quickActionRequest) {
                      setQuickActionRequest({ ...quickActionRequest, channelId: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific channel</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={quickActionNotes}
                onChange={(e) => setQuickActionNotes(e.target.value)}
                placeholder="Add notes about this decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuickActionRequest(null)
                setQuickActionNotes('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (quickActionRequest) {
                  handleQuickAction(
                    quickActionRequest.id,
                    quickActionRequest.status,
                    quickActionRequest.channelId
                  )
                }
              }}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Action</DialogTitle>
            <DialogDescription>
              Update {selectedRequests.size} selected request(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as PlatformRequestStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PlatformRequestStatus.REJECTED}>Reject</SelectItem>
                  <SelectItem value={PlatformRequestStatus.UPLOADED}>Mark as Uploaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasChannels && (
              <div className="space-y-2">
                <Label>Channels (optional - leave empty for all channels)</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {channels.map((channel) => (
                    <div key={channel.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={bulkChannelIds.includes(channel.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkChannelIds([...bulkChannelIds, channel.id])
                          } else {
                            setBulkChannelIds(bulkChannelIds.filter(id => id !== channel.id))
                          }
                        }}
                      />
                      <Label className="font-normal cursor-pointer">{channel.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add notes about this decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={!bulkStatus || processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update {selectedRequests.size} Request(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

