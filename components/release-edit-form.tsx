'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { CopyrightStatus, VideoType, ReleaseType } from '@prisma/client'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Plus, Trash2, Save, X, Keyboard, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ArtistMultiSelect } from '@/components/artist-multi-select'
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

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube', supportsChannels: true },
  { key: 'flow', label: 'Flow', supportsChannels: false },
  { key: 'ringtunes', label: 'Ringtunes', supportsChannels: false },
  { key: 'international_streaming', label: 'International Streaming', supportsChannels: false },
  { key: 'facebook', label: 'Facebook', supportsChannels: true },
  { key: 'tiktok', label: 'TikTok', supportsChannels: false },
]

interface Track {
  id?: string
  name: string
  trackNumber: number
  performer?: string
  composer?: string
  band?: string
  musicProducer?: string
  studio?: string
  recordLabel?: string
  genre?: string
  isNew?: boolean
  artistIds?: string[] // Array of artist IDs for this track
}

interface PlatformRequest {
  platform: string
  requested: boolean
  selectedChannels: string[] // Array of channel IDs
}

interface ReleaseEditFormProps {
  release: any
  employees: any[]
  allArtists: Array<{ id: string; name: string }>
  channelsByPlatform: {
    youtube?: any[]
    facebook?: any[]
  }
}

export function ReleaseEditForm({ release, employees, allArtists, channelsByPlatform }: ReleaseEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Initialize form data with all release fields
  // Get release artists (primary first, then secondary)
  const releaseArtistIds = release.releaseArtists
    ? release.releaseArtists
        .sort((a: any, b: any) => {
          // Primary first, then by creation date
          if (a.isPrimary && !b.isPrimary) return -1
          if (!a.isPrimary && b.isPrimary) return 1
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
        .map((ra: any) => ra.artist.id)
    : release.artistId ? [release.artistId] : []

  const [formData, setFormData] = useState({
    title: release.title || '',
    type: release.type || ReleaseType.SINGLE,
    artistIds: releaseArtistIds, // Array of artist IDs (first is primary)
    artistsChosenDate: release.artistsChosenDate ? new Date(release.artistsChosenDate) : null as Date | null,
    legacyReleaseDate: release.legacyReleaseDate ? new Date(release.legacyReleaseDate) : null as Date | null,
    assignedA_RId: release.assignedA_RId || 'none',
    copyrightStatus: release.copyrightStatus || 'none',
    videoType: release.videoType || VideoType.NONE,
    paymentRemarks: release.paymentRemarks || '',
    notes: release.notes || '',
    tracks: (release.tracks || []).map((track: any) => {
      // Get track artists (primary first, then secondary)
      const trackArtistIds = track.trackArtists
        ? track.trackArtists
            .sort((a: any, b: any) => {
              if (a.isPrimary && !b.isPrimary) return -1
              if (!a.isPrimary && b.isPrimary) return 1
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            })
            .map((ta: any) => ta.artist.id)
        : []
      
      return {
        id: track.id,
        name: track.name || '',
        trackNumber: track.trackNumber || 1,
        performer: track.performer || '',
        composer: track.composer || '',
        band: track.band || '',
        musicProducer: track.musicProducer || '',
        studio: track.studio || '',
        recordLabel: track.recordLabel || '',
        genre: track.genre || '',
        artistIds: trackArtistIds,
      }
    }) as Track[],
    platformRequests: PLATFORMS.map(platform => {
      // Get all existing requests for this platform (including channel-specific ones)
      const existingRequests = release.platformRequests.filter(
        (pr: any) => pr.platform === platform.key
      )
      
      // Extract selected channel IDs
      const selectedChannels = existingRequests
        .filter((pr: any) => pr.channelId)
        .map((pr: any) => pr.channelId || pr.channel?.id)
        .filter(Boolean)

      return {
        platform: platform.key,
        requested: existingRequests.length > 0,
        selectedChannels: selectedChannels,
      } as PlatformRequest
    }),
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (formRef.current && !loading) {
          formRef.current.requestSubmit()
        }
      }
      // Ctrl/Cmd + K to show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      // Escape to close dialogs
      if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false)
        setDeleteTrackId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/releases/${release.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          artistIds: formData.artistIds, // Array of artist IDs (first is primary)
          artistsChosenDate: formData.artistsChosenDate?.toISOString() || null,
          legacyReleaseDate: formData.legacyReleaseDate?.toISOString() || null,
          assignedA_RId: formData.assignedA_RId === 'none' ? null : formData.assignedA_RId,
          copyrightStatus: formData.copyrightStatus === 'none' ? null : formData.copyrightStatus,
          videoType: formData.videoType,
          paymentRemarks: formData.paymentRemarks || null,
          notes: formData.notes || null,
          tracks: formData.tracks.map(track => ({
            ...track,
            artistIds: track.artistIds || [], // Include artist IDs for each track
          })),
          platformRequests: formData.platformRequests,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update release')
      }

      toast({
        title: 'Success',
        description: 'Release updated successfully',
      })

      router.push(`/releases/${release.id}`)
      router.refresh()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update release',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const addTrack = () => {
    const newTrackNumber = formData.tracks.length > 0
      ? Math.max(...formData.tracks.map(t => t.trackNumber)) + 1
      : 1
    
    setFormData(prev => ({
      ...prev,
      tracks: [
        ...prev.tracks,
        {
          name: '',
          trackNumber: newTrackNumber,
          performer: '',
          composer: '',
          band: '',
          musicProducer: '',
          studio: '',
          recordLabel: '',
          genre: '',
          artistIds: [], // Initialize with empty array for new tracks
          isNew: true,
        },
      ],
    }))
  }

  const updateTrack = (index: number, updates: Partial<Track>) => {
    setFormData(prev => ({
      ...prev,
      tracks: prev.tracks.map((track, i) =>
        i === index ? { ...track, ...updates } : track
      ),
    }))
  }

  const removeTrack = (index: number) => {
    const track = formData.tracks[index]
    if (track.id) {
      setDeleteTrackId(track.id)
    } else {
      setFormData(prev => ({
        ...prev,
        tracks: prev.tracks.filter((_, i) => i !== index),
      }))
    }
  }

  const confirmDeleteTrack = async () => {
    if (!deleteTrackId) return

    const index = formData.tracks.findIndex(t => t.id === deleteTrackId)
    if (index === -1) return

    try {
      const response = await fetch(`/api/tracks/${deleteTrackId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete track')
      }

      setFormData(prev => ({
        ...prev,
        tracks: prev.tracks.filter((_, i) => i !== index),
      }))

      toast({
        title: 'Success',
        description: 'Track deleted successfully',
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete track',
        variant: 'destructive',
      })
    } finally {
      setDeleteTrackId(null)
    }
  }

  const updatePlatformRequest = (platformKey: string, updates: Partial<PlatformRequest>) => {
    setFormData(prev => ({
      ...prev,
      platformRequests: prev.platformRequests.map(pr =>
        pr.platform === platformKey ? { ...pr, ...updates } : pr
      ),
    }))
  }

  const toggleChannel = (platformKey: string, channelId: string) => {
    const request = formData.platformRequests.find(pr => pr.platform === platformKey)
    if (!request) return

    const isSelected = request.selectedChannels.includes(channelId)
    const newChannels = isSelected
      ? request.selectedChannels.filter(id => id !== channelId)
      : [...request.selectedChannels, channelId]

    updatePlatformRequest(platformKey, {
      selectedChannels: newChannels,
      requested: newChannels.length > 0 || request.requested,
    })
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* Keyboard Shortcuts Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Keyboard className="w-4 h-4" />
            <span>Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Ctrl/Cmd + K</kbd> for shortcuts</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyboardShortcuts(true)}
            className="gap-2"
          >
            <Keyboard className="w-4 h-4" />
            Shortcuts
          </Button>
        </div>

        {/* Basic Release Information */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <CardTitle className="text-xl">Basic Information</CardTitle>
            <CardDescription>Core release details</CardDescription>
        </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-sm font-semibold">
                  Release Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter release title"
                  required
                  className="h-11"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold">
                  Release Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as ReleaseType }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ReleaseType.SINGLE}>Single</SelectItem>
                    <SelectItem value={ReleaseType.ALBUM}>Album</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="artists" className="text-sm font-semibold">
                  Artists <span className="text-destructive">*</span>
                </Label>
                <ArtistMultiSelect
                  value={formData.artistIds}
                  onChange={(artistIds) => setFormData(prev => ({ ...prev, artistIds }))}
                  placeholder="Search and select artists (first is primary)..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artistsChosenDate" className="text-sm font-semibold">
                  Artist's Chosen Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-11"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.artistsChosenDate ? (
                        format(formData.artistsChosenDate, 'PPP')
                      ) : (
                        <span className="text-muted-foreground">Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.artistsChosenDate || undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, artistsChosenDate: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

          <div className="space-y-2">
                <Label htmlFor="legacyReleaseDate" className="text-sm font-semibold">
                  Legacy Release Date
                </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                      className="w-full justify-start text-left font-normal h-11"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.legacyReleaseDate ? (
                    format(formData.legacyReleaseDate, 'PPP')
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.legacyReleaseDate || undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, legacyReleaseDate: date || null }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
                <Label htmlFor="assignedA_RId" className="text-sm font-semibold">
                  Assigned A&R
                </Label>
            <Select
              value={formData.assignedA_RId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignedA_RId: value }))}
            >
                  <SelectTrigger className="h-11">
                <SelectValue placeholder="Select A&R" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.user.name || employee.user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracks */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Tracks</CardTitle>
                <CardDescription>Manage release tracks</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTrack}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Track
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {formData.tracks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tracks added yet. Click "Add Track" to get started.</p>
              </div>
            ) : (
              formData.tracks.map((track, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          Track {track.trackNumber}
                        </Badge>
                        {track.isNew && (
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTrack(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`track-name-${index}`} className="text-sm font-semibold">
                          Track Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`track-name-${index}`}
                          value={track.name}
                          onChange={(e) => updateTrack(index, { name: e.target.value })}
                          placeholder="Enter track name"
                          required
                          className="h-11"
                        />
          </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`track-artists-${index}`} className="text-sm font-semibold">
                          Track Artists
                        </Label>
                        <ArtistMultiSelect
                          value={track.artistIds || []}
                          onChange={(artistIds) => updateTrack(index, { artistIds })}
                          placeholder="Search and select artists for this track (first is primary)..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-number-${index}`} className="text-sm font-semibold">
                          Track Number
                        </Label>
                        <Input
                          id={`track-number-${index}`}
                          type="number"
                          min="1"
                          value={track.trackNumber}
                          onChange={(e) => updateTrack(index, { trackNumber: parseInt(e.target.value) || 1 })}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-performer-${index}`} className="text-sm font-semibold">
                          Artist
                        </Label>
                        <Input
                          id={`track-performer-${index}`}
                          value={track.performer || ''}
                          onChange={(e) => updateTrack(index, { performer: e.target.value })}
                          placeholder="Artist name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-composer-${index}`} className="text-sm font-semibold">
                          Composer
                        </Label>
                        <Input
                          id={`track-composer-${index}`}
                          value={track.composer || ''}
                          onChange={(e) => updateTrack(index, { composer: e.target.value })}
                          placeholder="Composer name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-band-${index}`} className="text-sm font-semibold">
                          Band
                        </Label>
                        <Input
                          id={`track-band-${index}`}
                          value={track.band || ''}
                          onChange={(e) => updateTrack(index, { band: e.target.value })}
                          placeholder="Band name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-producer-${index}`} className="text-sm font-semibold">
                          Music Producer
                        </Label>
                        <Input
                          id={`track-producer-${index}`}
                          value={track.musicProducer || ''}
                          onChange={(e) => updateTrack(index, { musicProducer: e.target.value })}
                          placeholder="Producer name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-studio-${index}`} className="text-sm font-semibold">
                          Studio
                        </Label>
                        <Input
                          id={`track-studio-${index}`}
                          value={track.studio || ''}
                          onChange={(e) => updateTrack(index, { studio: e.target.value })}
                          placeholder="Studio name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-label-${index}`} className="text-sm font-semibold">
                          Record Label
                        </Label>
                        <Input
                          id={`track-label-${index}`}
                          value={track.recordLabel || ''}
                          onChange={(e) => updateTrack(index, { recordLabel: e.target.value })}
                          placeholder="Record label"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`track-genre-${index}`} className="text-sm font-semibold">
                          Genre
                        </Label>
                        <Input
                          id={`track-genre-${index}`}
                          value={track.genre || ''}
                          onChange={(e) => updateTrack(index, { genre: e.target.value })}
                          placeholder="Genre"
                          className="h-11"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Additional Metadata */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <CardTitle className="text-xl">Additional Metadata</CardTitle>
            <CardDescription>Copyright, video, and other information</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
                <Label htmlFor="copyrightStatus" className="text-sm font-semibold">
                  Copyright Status
                </Label>
            <Select
              value={formData.copyrightStatus}
              onValueChange={(value) => setFormData(prev => ({ ...prev, copyrightStatus: value }))}
            >
                  <SelectTrigger className="h-11">
                <SelectValue placeholder="Select copyright status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value={CopyrightStatus.ORIGINAL}>Original</SelectItem>
                <SelectItem value={CopyrightStatus.COVER}>Cover</SelectItem>
                <SelectItem value={CopyrightStatus.INTERNATIONAL}>International</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
                <Label htmlFor="videoType" className="text-sm font-semibold">
                  Video Type
                </Label>
            <Select
              value={formData.videoType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, videoType: value }))}
            >
                  <SelectTrigger className="h-11">
                <SelectValue placeholder="Select video type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VideoType.NONE}>None</SelectItem>
                <SelectItem value={VideoType.MUSIC_VIDEO}>Music Video</SelectItem>
                <SelectItem value={VideoType.LYRICS_VIDEO}>Lyrics Video</SelectItem>
              </SelectContent>
            </Select>
              </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="paymentRemarks" className="text-sm font-semibold">
                Payment Remarks
              </Label>
            <Textarea
              id="paymentRemarks"
              value={formData.paymentRemarks}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentRemarks: e.target.value }))}
              placeholder="Payment-related notes..."
              rows={3}
                className="resize-none"
            />
          </div>

          <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Internal Notes
              </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes and comments..."
              rows={4}
                className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

        {/* Platform Requests */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <CardTitle className="text-xl">Platform Requests</CardTitle>
            <CardDescription>Request releases for specific platforms and channels</CardDescription>
        </CardHeader>
          <CardContent className="pt-6 space-y-4">
          {PLATFORMS.map((platform) => {
            const request = formData.platformRequests.find(pr => pr.platform === platform.key)
              const channels = channelsByPlatform[platform.key as keyof typeof channelsByPlatform] || []
              const hasChannels = channels.length > 0

            return (
                <Card key={platform.key} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Label htmlFor={`platform-${platform.key}`} className="text-base font-semibold">
                      {platform.label}
                    </Label>
                        {platform.supportsChannels && hasChannels && (
                          <p className="text-xs text-muted-foreground mt-1">
                              Select one or more channels
                            </p>
                        )}
                      </div>
                    <Switch
                      checked={request?.requested || false}
                      onCheckedChange={(checked) =>
                          updatePlatformRequest(platform.key, { 
                            requested: checked,
                            selectedChannels: checked ? request?.selectedChannels || [] : [],
                          })
                      }
                    />
                  </div>

                    {request?.requested && platform.supportsChannels && hasChannels && (
                      <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                        <Label className="text-sm font-medium">Select Channels</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {channels.map((channel) => {
                            const channelId = channel.channelId || channel.id
                            const isSelected = request.selectedChannels.includes(channelId)
                            
                            return (
                              <div
                                key={channel.id}
                                className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                                onClick={() => toggleChannel(platform.key, channelId)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleChannel(platform.key, channelId)}
                                  id={`channel-${platform.key}-${channel.id}`}
                                />
                                <Label
                                  htmlFor={`channel-${platform.key}-${channel.id}`}
                                  className="flex-1 cursor-pointer font-medium"
                                >
                                    {channel.name}
                                </Label>
                          </div>
                        )
                          })}
                        </div>
                        {request.selectedChannels.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            No channels selected. The platform request will be created without a specific channel.
                          </p>
                      )}
                    </div>
                  )}

                    {request?.requested && platform.supportsChannels && !hasChannels && (
                      <div className="pl-6 border-l-2 border-yellow-500/20">
                        <div className="p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                            No {platform.label} channels available
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            Please add {platform.label} channels in <strong>Admin → Platform Channels</strong> first.
                          </p>
                </div>
              </div>
                    )}
                  </CardContent>
                </Card>
            )
          })}
        </CardContent>
      </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/releases/${release.id}`)}
            className="gap-2"
        >
            <X className="w-4 h-4" />
          Cancel
        </Button>
          <Button type="submit" disabled={loading} className="gap-2 min-w-[140px]">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
      </div>
    </form>

      {/* Keyboard Shortcuts Dialog */}
      <AlertDialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </AlertDialogTitle>
            <AlertDialogDescription>
              Use these shortcuts to navigate and interact with the form more efficiently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Save changes</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Ctrl/Cmd + S</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Show keyboard shortcuts</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Ctrl/Cmd + K</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Close dialogs</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Esc</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Navigate between fields</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Tab</kbd>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowKeyboardShortcuts(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Track Confirmation */}
      <AlertDialog open={!!deleteTrackId} onOpenChange={(open) => !open && setDeleteTrackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this track? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTrackId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTrack} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
