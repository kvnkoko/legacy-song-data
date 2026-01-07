'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ChannelManagerProps {
  channels: any[]
  platforms: string[]
}

export function ChannelManager({ channels: initialChannels, platforms }: ChannelManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [channels, setChannels] = useState(initialChannels)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null)

  // Update channels when initialChannels prop changes
  useEffect(() => {
    setChannels(initialChannels)
  }, [initialChannels])
  const [formData, setFormData] = useState({
    platform: '',
    name: '',
    channelId: '',
    description: '',
    active: true,
  })

  const handleAdd = async () => {
    if (!formData.platform || !formData.name) {
      toast({
        title: 'Error',
        description: 'Platform and name are required',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create channel')
      }

      toast({
        title: 'Success',
        description: 'Channel created successfully',
      })

      setFormData({
        platform: '',
        name: '',
        channelId: '',
        description: '',
        active: true,
      })
      setShowAddForm(false)
      // Refresh the page to get updated channels
      window.location.reload()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create channel',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setLoading(true)
    try {
      const channel = channels.find(c => c.id === id)
      if (!channel) return

      const response = await fetch(`/api/admin/channels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: channel.name,
          channelId: channel.channelId,
          description: channel.description,
          active: channel.active,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update channel')
      }

      toast({
        title: 'Success',
        description: 'Channel updated successfully',
      })

      setEditingId(null)
      // Refresh the page to get updated channels
      window.location.reload()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update channel',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setChannelToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!channelToDelete) return

    setLoading(true)
    setDeleteDialogOpen(false)
    try {
      const response = await fetch(`/api/admin/channels/${channelToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete channel')
      }

      toast({
        title: 'Success',
        description: 'Channel deleted successfully',
      })

      // Refresh the page to get updated channels
      router.refresh()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete channel',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setChannelToDelete(null)
    }
  }

  const groupedChannels = platforms.reduce((acc, platform) => {
    acc[platform] = channels.filter(c => c.platform === platform)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manage Channels</CardTitle>
              <CardDescription>Add and manage channels for each platform</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Channel
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Music Channel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channelId">Channel ID (Optional)</Label>
                <Input
                  id="channelId"
                  value={formData.channelId}
                  onChange={(e) => setFormData(prev => ({ ...prev, channelId: e.target.value }))}
                  placeholder="YouTube channel ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="active">Active</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={loading}>
                {loading ? 'Creating...' : 'Create Channel'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {platforms.map((platform) => {
        const platformChannels = groupedChannels[platform] || []
        if (platformChannels.length === 0 && !showAddForm) return null

        return (
          <Card key={platform}>
            <CardHeader>
              <CardTitle className="capitalize">
                {platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {platformChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {editingId === channel.id ? (
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={channel.name}
                              onChange={(e) => {
                                setChannels(prev =>
                                  prev.map(c => c.id === channel.id ? { ...c, name: e.target.value } : c)
                                )
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Channel ID</Label>
                            <Input
                              value={channel.channelId || ''}
                              onChange={(e) => {
                                setChannels(prev =>
                                  prev.map(c => c.id === channel.id ? { ...c, channelId: e.target.value } : c)
                                )
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={channel.active}
                            onCheckedChange={(checked) => {
                              setChannels(prev =>
                                prev.map(c => c.id === channel.id ? { ...c, active: checked } : c)
                              )
                            }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {channel.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(channel.id)} disabled={loading}>
                            <Check className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null)
                              window.location.reload()
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-base">{channel.name}</span>
                            {channel.active ? (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          {channel.channelId && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Channel ID:</span> {channel.channelId}
                            </p>
                          )}
                          {channel.description && (
                            <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
                          )}
                          {!channel.channelId && !channel.description && (
                            <p className="text-xs text-muted-foreground italic">No additional details</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(channel.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(channel.id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {platformChannels.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No channels for this platform yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this channel? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

