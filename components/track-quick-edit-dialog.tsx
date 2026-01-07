'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface Track {
  id: string
  name: string
  trackNumber: number | null
  performer: string | null
  composer: string | null
  band: string | null
  musicProducer: string | null
  studio: string | null
  recordLabel: string | null
  genre: string | null
}

interface TrackQuickEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackId: string
  onSuccess?: () => void
}

export function TrackQuickEditDialog({
  open,
  onOpenChange,
  trackId,
  onSuccess,
}: TrackQuickEditDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [track, setTrack] = useState<Track | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    trackNumber: '',
    performer: '',
    composer: '',
    band: '',
    musicProducer: '',
    studio: '',
    recordLabel: '',
    genre: '',
  })

  // Fetch track data when dialog opens
  useEffect(() => {
    if (open && trackId) {
      setFetching(true)
      fetch(`/api/tracks/${trackId}`)
        .then(res => res.json())
        .then(data => {
          if (data.track) {
            setTrack(data.track)
            setFormData({
              name: data.track.name || '',
              trackNumber: data.track.trackNumber?.toString() || '',
              performer: data.track.performer || '',
              composer: data.track.composer || '',
              band: data.track.band || '',
              musicProducer: data.track.musicProducer || '',
              studio: data.track.studio || '',
              recordLabel: data.track.recordLabel || '',
              genre: data.track.genre || '',
            })
          }
        })
        .catch(err => {
          toast({
            title: 'Error',
            description: 'Failed to load track data',
            variant: 'destructive',
          })
        })
        .finally(() => setFetching(false))
    }
  }, [open, trackId, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          trackNumber: formData.trackNumber ? parseInt(formData.trackNumber) : null,
          performer: formData.performer || null,
          composer: formData.composer || null,
          band: formData.band || null,
          musicProducer: formData.musicProducer || null,
          studio: formData.studio || null,
          recordLabel: formData.recordLabel || null,
          genre: formData.genre || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update track')
      }

      toast({
        title: 'Success',
        description: 'Track updated successfully',
      })

      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update track',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Edit Track</DialogTitle>
          <DialogDescription>
            Update track information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Track Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackNumber">Track Number</Label>
              <Input
                id="trackNumber"
                type="number"
                min="1"
                value={formData.trackNumber}
                onChange={(e) => setFormData({ ...formData, trackNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="performer">Artist</Label>
              <Input
                id="performer"
                value={formData.performer}
                onChange={(e) => setFormData({ ...formData, performer: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="composer">Composer</Label>
              <Input
                id="composer"
                value={formData.composer}
                onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="band">Band</Label>
              <Input
                id="band"
                value={formData.band}
                onChange={(e) => setFormData({ ...formData, band: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="musicProducer">Music Producer</Label>
              <Input
                id="musicProducer"
                value={formData.musicProducer}
                onChange={(e) => setFormData({ ...formData, musicProducer: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studio">Studio</Label>
              <Input
                id="studio"
                value={formData.studio}
                onChange={(e) => setFormData({ ...formData, studio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordLabel">Record Label</Label>
              <Input
                id="recordLabel"
                value={formData.recordLabel}
                onChange={(e) => setFormData({ ...formData, recordLabel: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
