'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertTriangle, Music, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArtistAutocomplete } from '@/components/artist-autocomplete'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArtistMergeDetailsView } from './artist-merge-details-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'

interface Artist {
  id: string
  name: string
  legalName: string | null
  releases?: { id: string }[]
  trackArtists?: { id: string }[]
}

interface ArtistMergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceArtist: Artist
  onSuccess?: () => void
}

export function ArtistMergeDialog({
  open,
  onOpenChange,
  sourceArtist,
  onSuccess,
}: ArtistMergeDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [targetArtistId, setTargetArtistId] = useState<string | null>(null)
  const [secondaryArtistMode, setSecondaryArtistMode] = useState<'none' | 'existing' | 'new'>('none')
  const [secondaryArtistId, setSecondaryArtistId] = useState<string | null>(null)
  const [secondaryArtistName, setSecondaryArtistName] = useState('')
  const [sourceData, setSourceData] = useState<{
    releasesCount: number
    tracksCount: number
    releases: Array<{ 
      id: string
      title: string
      type: string
      currentPrimaryArtist: { id: string; name: string; legalName: string | null } | null
      currentSecondaryArtists: Array<{ id: string; name: string; legalName: string | null }>
      sourceArtistRole: 'primary' | 'secondary' | 'none'
    }>
    tracks: Array<{ 
      id: string
      name: string
      release: { id: string; title: string }
      performer?: string | null
      composer?: string | null
      band?: string | null
      musicProducer?: string | null
      currentPrimaryArtists: Array<{ id: string; name: string; legalName: string | null }>
      currentSecondaryArtists: Array<{ id: string; name: string; legalName: string | null }>
      sourceArtistRole: 'primary' | 'secondary' | 'none'
    }>
  } | null>(null)
  
  // Per-item configurations: trackId/releaseId -> 'primary' | 'secondary' | 'keep'
  const [trackConfigs, setTrackConfigs] = useState<Map<string, 'primary' | 'secondary'>>(new Map())
  const [releaseConfigs, setReleaseConfigs] = useState<Map<string, 'primary' | 'secondary'>>(new Map())

  // Fetch source artist data when dialog opens
  useEffect(() => {
    if (open && sourceArtist.id) {
      const fetchSourceData = async () => {
        try {
          const response = await fetch(`/api/artists/${sourceArtist.id}/merge-preview`)
          if (response.ok) {
            const data = await response.json()
            setSourceData(data)
            
            // Initialize configurations with defaults based on current role
            const newTrackConfigs = new Map<string, 'primary' | 'secondary'>()
            const newReleaseConfigs = new Map<string, 'primary' | 'secondary'>()
            
            // Default: keep current role (primary stays primary, secondary stays secondary)
            data.tracks?.forEach((track: any) => {
              if (track.sourceArtistRole === 'primary') {
                newTrackConfigs.set(track.id, 'primary')
              } else if (track.sourceArtistRole === 'secondary') {
                newTrackConfigs.set(track.id, 'secondary')
              } else {
                // If no role, default to primary
                newTrackConfigs.set(track.id, 'primary')
              }
            })
            
            data.releases?.forEach((release: any) => {
              if (release.sourceArtistRole === 'primary') {
                newReleaseConfigs.set(release.id, 'primary')
              } else if (release.sourceArtistRole === 'secondary') {
                newReleaseConfigs.set(release.id, 'secondary')
              } else {
                // If no role, default to primary
                newReleaseConfigs.set(release.id, 'primary')
              }
            })
            
            setTrackConfigs(newTrackConfigs)
            setReleaseConfigs(newReleaseConfigs)
          }
        } catch (error) {
          console.error('Failed to fetch source artist data:', error)
        }
      }
      fetchSourceData()
    }
  }, [open, sourceArtist.id])

  const sourceReleasesCount = sourceData?.releasesCount || sourceArtist.releases?.length || 0
  const sourceTracksCount = sourceData?.tracksCount || sourceArtist.trackArtists?.length || 0

  const handleMerge = async () => {
    if (!targetArtistId) {
      toast({
        title: 'Error',
        description: 'Please select a target artist to merge into',
        variant: 'destructive',
      })
      return
    }

    if (targetArtistId === sourceArtist.id) {
      toast({
        title: 'Error',
        description: 'Cannot merge an artist into itself',
        variant: 'destructive',
      })
      return
    }

    if (secondaryArtistMode === 'existing' && !secondaryArtistId) {
      toast({
        title: 'Error',
        description: 'Please select an existing artist for secondary artist',
        variant: 'destructive',
      })
      return
    }

    if (secondaryArtistMode === 'new' && !secondaryArtistName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the new secondary artist',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      // Build track and release configurations
      const trackConfigurations = Array.from(trackConfigs.entries()).map(([trackId, role]) => ({
        trackId,
        isPrimary: role === 'primary',
      }))
      
      const releaseConfigurations = Array.from(releaseConfigs.entries()).map(([releaseId, role]) => ({
        releaseId,
        isPrimary: role === 'primary',
      }))

      const response = await fetch('/api/artists/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceArtistId: sourceArtist.id,
          targetArtistId,
          secondaryArtistId: secondaryArtistMode === 'existing' ? secondaryArtistId : null,
          secondaryArtistName: secondaryArtistMode === 'new' ? secondaryArtistName.trim() : null,
          trackConfigurations,
          releaseConfigurations,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to merge artists')
      }

      toast({
        title: 'Success',
        description: data.message || 'Artists merged successfully',
      })

      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to merge artists',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Artists</DialogTitle>
          <DialogDescription>
            Merge "{sourceArtist.name}" into another artist. All releases and tracks will be transferred.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Artist Info */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Source Artist (to be merged)</Label>
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="font-medium">{sourceArtist.name}</div>
              {sourceArtist.legalName && (
                <div className="text-sm text-muted-foreground mt-1">
                  Legal Name: {sourceArtist.legalName}
                </div>
              )}
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span>{sourceReleasesCount} release{sourceReleasesCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span>{sourceTracksCount} track{sourceTracksCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Target Artist Selection */}
          <div className="space-y-2">
            <Label htmlFor="target-artist" className="text-sm font-semibold">
              Target Artist (to merge into) *
            </Label>
            <ArtistAutocomplete
              value={targetArtistId || ''}
              onChange={(artistId) => setTargetArtistId(artistId)}
              excludeArtistIds={[sourceArtist.id]}
              placeholder="Search for target artist..."
            />
            <p className="text-xs text-muted-foreground">
              Select the artist that will receive all releases and tracks from the source artist
            </p>
          </div>

          <div className="border-t my-4" />

          {/* Per-Item Primary/Secondary Selection */}
          {sourceData && (sourceData.releases.length > 0 || sourceData.tracks.length > 0) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Configure Artist Role for Each Item</Label>
                <p className="text-xs text-muted-foreground">
                  Choose whether the merged artist should be primary or secondary for each track and release.
                  You can see the current artist assignments below.
                </p>
              </div>

              <Tabs defaultValue="tracks" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tracks">
                    Tracks ({sourceData.tracks.length})
                  </TabsTrigger>
                  <TabsTrigger value="releases">
                    Releases ({sourceData.releases.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tracks" className="space-y-4">
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Role</TableHead>
                          <TableHead>Track Name</TableHead>
                          <TableHead>Release</TableHead>
                          <TableHead>Current Artists</TableHead>
                          <TableHead className="w-0"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sourceData.tracks.map((track) => {
                          const currentConfig = trackConfigs.get(track.id) || 'primary'
                          return (
                            <TableRow key={track.id}>
                              <TableCell>
                                <RadioGroup
                                  value={currentConfig}
                                  onValueChange={(value) => {
                                    const newConfigs = new Map(trackConfigs)
                                    newConfigs.set(track.id, value as 'primary' | 'secondary')
                                    setTrackConfigs(newConfigs)
                                  }}
                                >
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="primary" id={`track-${track.id}-primary`} />
                                      <Label htmlFor={`track-${track.id}-primary`} className="text-xs cursor-pointer">
                                        Primary
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="secondary" id={`track-${track.id}-secondary`} />
                                      <Label htmlFor={`track-${track.id}-secondary`} className="text-xs cursor-pointer">
                                        Secondary
                                      </Label>
                                    </div>
                                  </div>
                                </RadioGroup>
                              </TableCell>
                              <TableCell className="font-medium">{track.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {track.release.title}
                              </TableCell>
                              <TableCell>
                                {track.currentPrimaryArtists.length > 0 || track.currentSecondaryArtists.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {/* All artists together: first highlighted (primary), rest normal (secondary) */}
                                    {track.currentPrimaryArtists.map((artist, index) => (
                                      <Badge key={artist.id} variant="default" className="text-xs font-bold">
                                        {artist.name}
                                      </Badge>
                                    ))}
                                    {track.currentSecondaryArtists.map((artist) => (
                                      <Badge key={artist.id} variant="outline" className="text-xs">
                                        {artist.name}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">—</span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="releases" className="space-y-4">
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Role</TableHead>
                          <TableHead>Release Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Current Artists</TableHead>
                          <TableHead className="w-0"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sourceData.releases.map((release) => {
                          const currentConfig = releaseConfigs.get(release.id) || 'primary'
                          return (
                            <TableRow key={release.id}>
                              <TableCell>
                                <RadioGroup
                                  value={currentConfig}
                                  onValueChange={(value) => {
                                    const newConfigs = new Map(releaseConfigs)
                                    newConfigs.set(release.id, value as 'primary' | 'secondary')
                                    setReleaseConfigs(newConfigs)
                                  }}
                                >
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="primary" id={`release-${release.id}-primary`} />
                                      <Label htmlFor={`release-${release.id}-primary`} className="text-xs cursor-pointer">
                                        Primary
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="secondary" id={`release-${release.id}-secondary`} />
                                      <Label htmlFor={`release-${release.id}-secondary`} className="text-xs cursor-pointer">
                                        Secondary
                                      </Label>
                                    </div>
                                  </div>
                                </RadioGroup>
                              </TableCell>
                              <TableCell className="font-medium">{release.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{release.type}</Badge>
                              </TableCell>
                              <TableCell>
                                {release.currentPrimaryArtist || release.currentSecondaryArtists.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {/* All artists together: first highlighted (primary), rest normal (secondary) */}
                                    {release.currentPrimaryArtist && (
                                      <Badge variant="default" className="text-xs font-bold">
                                        {release.currentPrimaryArtist.name}
                                      </Badge>
                                    )}
                                    {release.currentSecondaryArtists.map((artist) => (
                                      <Badge key={artist.id} variant="outline" className="text-xs">
                                        {artist.name}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">—</span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <div className="border-t my-4" />

          {/* Secondary Artist Selection */}
          {(sourceReleasesCount > 0 || sourceTracksCount > 0) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Add Secondary Artist to Affected Songs</Label>
                <p className="text-xs text-muted-foreground">
                  Optionally add a secondary artist to all songs (tracks) that will be affected by this merge.
                  This is useful when the same artist was entered twice with different names.
                </p>
              </div>

              <Select
                value={secondaryArtistMode}
                onValueChange={(value) => {
                  setSecondaryArtistMode(value as 'none' | 'existing' | 'new')
                  setSecondaryArtistId(null)
                  setSecondaryArtistName('')
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't add secondary artist</SelectItem>
                  <SelectItem value="existing">Select from existing artists</SelectItem>
                  <SelectItem value="new">Create new artist</SelectItem>
                </SelectContent>
              </Select>

              {secondaryArtistMode === 'existing' && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="secondary-artist-existing" className="text-sm">
                    Select Artist *
                  </Label>
                  <ArtistAutocomplete
                    value={secondaryArtistId || ''}
                    onChange={(artistId) => setSecondaryArtistId(artistId)}
                    excludeArtistIds={[sourceArtist.id, targetArtistId || '']}
                    placeholder="Search for secondary artist..."
                  />
                </div>
              )}

              {secondaryArtistMode === 'new' && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="secondary-artist-name" className="text-sm">
                    Artist Name *
                  </Label>
                  <Input
                    id="secondary-artist-name"
                    value={secondaryArtistName}
                    onChange={(e) => setSecondaryArtistName(e.target.value)}
                    placeholder="Enter artist name..."
                  />
                </div>
              )}

              {/* Detailed Preview of affected items */}
              {sourceData && (sourceData.releases.length > 0 || sourceData.tracks.length > 0) && (
                <div className="pl-6 space-y-4">
                  <Label className="text-sm font-semibold">
                    Preview: {secondaryArtistMode !== 'none' ? 'Secondary artist will be added to' : 'Items that will be affected'}
                  </Label>
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="details">Full Details</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="space-y-2">
                      <div className="text-xs text-muted-foreground space-y-1 max-h-48 overflow-y-auto border rounded p-3">
                        {sourceData.releases.length > 0 && (
                          <div>
                            <div className="font-medium mb-1">Releases ({sourceData.releases.length}):</div>
                            <ul className="list-disc list-inside space-y-0.5">
                              {sourceData.releases.slice(0, 10).map((release) => (
                                <li key={release.id}>{release.title}</li>
                              ))}
                              {sourceData.releases.length > 10 && (
                                <li className="text-muted-foreground">
                                  ...and {sourceData.releases.length - 10} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                        {sourceData.tracks.length > 0 && (
                          <div className={sourceData.releases.length > 0 ? 'mt-2' : ''}>
                            <div className="font-medium mb-1">Tracks ({sourceData.tracks.length}):</div>
                            <ul className="list-disc list-inside space-y-0.5">
                              {sourceData.tracks.slice(0, 10).map((track) => (
                                <li key={track.id}>{track.name}</li>
                              ))}
                              {sourceData.tracks.length > 10 && (
                                <li className="text-muted-foreground">
                                  ...and {sourceData.tracks.length - 10} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="details" className="space-y-2">
                      <ArtistMergeDetailsView
                        releases={sourceData.releases}
                        tracks={sourceData.tracks}
                        canEdit={false}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. The source artist will be
              deleted after merging. All releases and tracks will be transferred to the target artist.
              {secondaryArtistMode !== 'none' && ' A secondary artist will be added to all affected songs.'}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={loading || !targetArtistId}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Merge Artists
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

