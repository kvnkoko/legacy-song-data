'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { PlatformRequestStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, CheckCircle2, XCircle, Clock, Upload } from 'lucide-react'
import Link from 'next/link'

interface PlatformRequestUpdateFormProps {
  request: any
  platform: string
  channels: any[]
}

export function PlatformRequestUpdateForm({ request, platform, channels }: PlatformRequestUpdateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: request.status || PlatformRequestStatus.PENDING,
    channelId: request.channelId || '',
    uploadLink: request.uploadLink || '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/platform-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          uploadedAt: formData.status === PlatformRequestStatus.UPLOADED ? new Date().toISOString() : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update request')
      }

      toast({
        title: 'Success',
        description: 'Platform request updated successfully',
      })

      router.push(`/platforms/${platform}`)
      router.refresh()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update request',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: PlatformRequestStatus) => {
    switch (status) {
      case PlatformRequestStatus.PENDING:
        return <Clock className="w-4 h-4 text-yellow-600" />
      case PlatformRequestStatus.UPLOADED:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case PlatformRequestStatus.REJECTED:
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: PlatformRequestStatus) => {
    const variants = {
      [PlatformRequestStatus.UPLOADED]: 'default',
      [PlatformRequestStatus.REJECTED]: 'destructive',
      [PlatformRequestStatus.PENDING]: 'outline',
    } as const

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Link href={`/platforms/${platform}`}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Platform Portal
        </Button>
      </Link>

      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Release</Label>
              <div className="font-medium">{request.release?.title || 'Untitled'}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Artist</Label>
              <div className="font-medium">{request.release?.artist.name}</div>
            </div>
            {request.track && (
              <div>
                <Label className="text-xs text-muted-foreground">Track</Label>
                <div className="font-medium">{request.track.name}</div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Current Status</Label>
              <div className="mt-1">{getStatusBadge(request.status)}</div>
            </div>
            {request.channelName && (
              <div>
                <Label className="text-xs text-muted-foreground">Channel</Label>
                <div className="font-medium">{request.channelName}</div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Requested</Label>
              <div className="font-medium">{formatDate(request.createdAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
          <CardDescription>Reject or mark as uploaded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as PlatformRequestStatus }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PlatformRequestStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={PlatformRequestStatus.REJECTED}>Rejected</SelectItem>
                <SelectItem value={PlatformRequestStatus.UPLOADED}>Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {platform === 'youtube' && channels.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="channelId">Channel</Label>
              <Select
                value={formData.channelId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, channelId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.channelId || channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.status === PlatformRequestStatus.UPLOADED && (
            <div className="space-y-2">
              <Label htmlFor="uploadLink">Upload Link *</Label>
              <Input
                id="uploadLink"
                type="url"
                value={formData.uploadLink}
                onChange={(e) => setFormData(prev => ({ ...prev, uploadLink: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                required={formData.status === PlatformRequestStatus.UPLOADED}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes about this decision..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/platforms/${platform}`)}
        >
          Cancel
        </Button>
      </div>

      {/* Decision History */}
      {request.decisions && request.decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Decision History</CardTitle>
            <CardDescription>Previous status updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {request.decisions.map((decision: any) => (
                <div key={decision.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(decision.status)}
                      <span className="font-medium">{decision.user.name || decision.user.email}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(decision.createdAt)}
                    </div>
                  </div>
                  {getStatusBadge(decision.status)}
                  {decision.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{decision.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}




