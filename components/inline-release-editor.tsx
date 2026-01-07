'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { CopyrightStatus, VideoType, ReleaseType } from '@prisma/client'
import { Calendar, Save, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface InlineReleaseEditorProps {
  release: any
  employees?: Array<{ id: string; user: { name: string | null; email: string } }>
  onSave?: () => void
  onCancel?: () => void
}

// Helper function to get current artists from release
function getCurrentArtists(release: any): string {
  const allArtists: any[] = []
  if (release.artist) {
    allArtists.push({ ...release.artist, isPrimary: true })
  }
  if (release.releaseArtists) {
    release.releaseArtists.forEach((ra: any) => {
      if (ra.artistId !== release.artistId && !allArtists.find(a => a.id === ra.artist.id)) {
        allArtists.push({ ...ra.artist, isPrimary: ra.isPrimary })
      }
    })
  }
  // Sort: primary first
  allArtists.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1
    return 0
  })
  return allArtists.map(a => a.name).join(', ')
}

export function InlineReleaseEditor({ release, employees = [], onSave, onCancel }: InlineReleaseEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  
  const [formData, setFormData] = useState({
    title: release.title || '',
    type: release.type || ReleaseType.SINGLE,
    artists: getCurrentArtists(release),
    artistsChosenDate: release.artistsChosenDate 
      ? new Date(release.artistsChosenDate).toISOString().split('T')[0]
      : '',
    legacyReleaseDate: release.legacyReleaseDate
      ? new Date(release.legacyReleaseDate).toISOString().split('T')[0]
      : '',
    copyrightStatus: release.copyrightStatus || 'none',
    videoType: release.videoType || VideoType.NONE,
    assignedA_RId: release.assignedA_RId || 'none',
    notes: release.notes || '',
  })

  useEffect(() => {
    setFormData({
      title: release.title || '',
      type: release.type || ReleaseType.SINGLE,
      artists: getCurrentArtists(release),
      artistsChosenDate: release.artistsChosenDate 
        ? new Date(release.artistsChosenDate).toISOString().split('T')[0]
        : '',
      legacyReleaseDate: release.legacyReleaseDate
        ? new Date(release.legacyReleaseDate).toISOString().split('T')[0]
        : '',
      copyrightStatus: release.copyrightStatus || 'none',
      videoType: release.videoType || VideoType.NONE,
      assignedA_RId: release.assignedA_RId || 'none',
      notes: release.notes || '',
    })
  }, [release])

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
          artists: formData.artists || null,
          artistsChosenDate: formData.artistsChosenDate || null,
          legacyReleaseDate: formData.legacyReleaseDate || null,
          copyrightStatus: formData.copyrightStatus === 'none' ? null : formData.copyrightStatus,
          videoType: formData.videoType,
          assignedA_RId: formData.assignedA_RId === 'none' ? null : formData.assignedA_RId,
          notes: formData.notes || null,
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

      router.refresh()
      onSave?.()
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

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <CardTitle className="text-lg">Edit Release</CardTitle>
            </div>
            <Badge variant="purple">{release.type}</Badge>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Release Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Release Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as ReleaseType })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ReleaseType.SINGLE}>Single</SelectItem>
                          <SelectItem value={ReleaseType.ALBUM}>Album</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artists">Artist</Label>
                    <Input
                      id="artists"
                      value={formData.artists}
                      onChange={(e) => setFormData({ ...formData, artists: e.target.value })}
                      className="bg-background"
                      placeholder="Enter artist names (comma-separated)"
                    />
                    {(release.artist || (release.releaseArtists && release.releaseArtists.length > 0)) && (
                      <p className="text-xs text-muted-foreground">
                        Current artists are shown above. Edit to change.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="artistsChosenDate">Artist's Chosen Date</Label>
                      <Input
                        id="artistsChosenDate"
                        type="date"
                        value={formData.artistsChosenDate}
                        onChange={(e) => setFormData({ ...formData, artistsChosenDate: e.target.value })}
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="legacyReleaseDate">Legacy Release Date</Label>
                      <Input
                        id="legacyReleaseDate"
                        type="date"
                        value={formData.legacyReleaseDate}
                        onChange={(e) => setFormData({ ...formData, legacyReleaseDate: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="copyrightStatus">Copyright Status</Label>
                      <Select
                        value={formData.copyrightStatus}
                        onValueChange={(value) => setFormData({ ...formData, copyrightStatus: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
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
                      <Label htmlFor="videoType">Video Type</Label>
                      <Select
                        value={formData.videoType}
                        onValueChange={(value) => setFormData({ ...formData, videoType: value as VideoType })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={VideoType.NONE}>None</SelectItem>
                          <SelectItem value={VideoType.MUSIC_VIDEO}>Music Video</SelectItem>
                          <SelectItem value={VideoType.LYRICS_VIDEO}>Lyrics Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {employees.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="assignedA_RId">Assigned A&R</Label>
                      <Select
                        value={formData.assignedA_RId}
                        onValueChange={(value) => setFormData({ ...formData, assignedA_RId: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.user.name || emp.user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="bg-background resize-none"
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
                </form>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
