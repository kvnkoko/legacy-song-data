'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Save, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface InlineTrackEditorProps {
  track: any
  onSave?: () => void
  onCancel?: () => void
}

export function InlineTrackEditor({ track, onSave, onCancel }: InlineTrackEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
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

  useEffect(() => {
    if (track) {
      // Get current artists from trackArtists relationships
      let artistNames = track.performer || ''
      
      // If trackArtists exist, use those instead (they're more accurate)
      if (track.trackArtists && track.trackArtists.length > 0) {
        const primaryArtists = track.trackArtists
          .filter((ta: any) => ta.isPrimary)
          .map((ta: any) => ta.artist.name)
        const secondaryArtists = track.trackArtists
          .filter((ta: any) => !ta.isPrimary)
          .map((ta: any) => ta.artist.name)
        const allArtists = [...primaryArtists, ...secondaryArtists]
        artistNames = allArtists.join(', ')
      }
      
      setFormData({
        name: track.name || '',
        trackNumber: track.trackNumber?.toString() || '',
        performer: artistNames,
        composer: track.composer || '',
        band: track.band || '',
        musicProducer: track.musicProducer || '',
        studio: track.studio || '',
        recordLabel: track.recordLabel || '',
        genre: track.genre || '',
      })
    }
  }, [track])

  // Fetch track data if only ID is provided
  useEffect(() => {
    if (typeof track === 'string') {
      fetch(`/api/tracks/${track}`)
        .then(res => res.json())
        .then(data => {
          if (data.track) {
            // Get current artists from trackArtists relationships
            let artistNames = data.track.performer || ''
            
            // If trackArtists exist, use those instead (they're more accurate)
            if (data.track.trackArtists && data.track.trackArtists.length > 0) {
              const primaryArtists = data.track.trackArtists
                .filter((ta: any) => ta.isPrimary)
                .map((ta: any) => ta.artist.name)
              const secondaryArtists = data.track.trackArtists
                .filter((ta: any) => !ta.isPrimary)
                .map((ta: any) => ta.artist.name)
              const allArtists = [...primaryArtists, ...secondaryArtists]
              artistNames = allArtists.join(', ')
            }
            
            setFormData({
              name: data.track.name || '',
              trackNumber: data.track.trackNumber?.toString() || '',
              performer: artistNames,
              composer: data.track.composer || '',
              band: data.track.band || '',
              musicProducer: data.track.musicProducer || '',
              studio: data.track.studio || '',
              recordLabel: data.track.recordLabel || '',
              genre: data.track.genre || '',
            })
          }
        })
        .catch(() => {
          toast({
            title: 'Error',
            description: 'Failed to load track data',
            variant: 'destructive',
          })
        })
    }
  }, [track, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const trackId = typeof track === 'string' ? track : track.id

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

      router.refresh()
      onSave?.()
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

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Edit Track</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Track Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trackNumber">Track Number</Label>
                    <Input
                      id="trackNumber"
                      type="number"
                      min="1"
                      value={formData.trackNumber}
                      onChange={(e) => setFormData({ ...formData, trackNumber: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="performer">Artist</Label>
                    <Input
                      id="performer"
                      value={formData.performer}
                      onChange={(e) => setFormData({ ...formData, performer: e.target.value })}
                      className="bg-background"
                      placeholder="Enter artist names (comma-separated)"
                    />
                    {track.trackArtists && track.trackArtists.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Current artists are shown above. Edit to change.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="composer">Composer</Label>
                    <Input
                      id="composer"
                      value={formData.composer}
                      onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="band">Band</Label>
                    <Input
                      id="band"
                      value={formData.band}
                      onChange={(e) => setFormData({ ...formData, band: e.target.value })}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="musicProducer">Music Producer</Label>
                    <Input
                      id="musicProducer"
                      value={formData.musicProducer}
                      onChange={(e) => setFormData({ ...formData, musicProducer: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studio">Studio</Label>
                    <Input
                      id="studio"
                      value={formData.studio}
                      onChange={(e) => setFormData({ ...formData, studio: e.target.value })}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recordLabel">Record Label</Label>
                    <Input
                      id="recordLabel"
                      value={formData.recordLabel}
                      onChange={(e) => setFormData({ ...formData, recordLabel: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}
