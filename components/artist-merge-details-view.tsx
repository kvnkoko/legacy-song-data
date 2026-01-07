'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Music, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Edit
} from 'lucide-react'
import Link from 'next/link'
import { InlineTrackEditor } from './inline-track-editor'
import { AnimatePresence } from 'framer-motion'

interface Track {
  id: string
  name: string
  release: {
    id: string
    title: string
  }
  performer?: string | null
  composer?: string | null
  band?: string | null
  musicProducer?: string | null
}

interface Release {
  id: string
  title: string
  type: string
}

interface ArtistMergeDetailsViewProps {
  releases: Release[]
  tracks: Track[]
  canEdit?: boolean
}

export function ArtistMergeDetailsView({ releases, tracks, canEdit = false }: ArtistMergeDetailsViewProps) {
  const [expandedReleases, setExpandedReleases] = useState<Set<string>>(new Set())
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set())
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)

  const toggleRelease = (releaseId: string) => {
    const newSet = new Set(expandedReleases)
    if (newSet.has(releaseId)) {
      newSet.delete(releaseId)
    } else {
      newSet.add(releaseId)
    }
    setExpandedReleases(newSet)
  }

  const toggleTrack = (trackId: string) => {
    const newSet = new Set(expandedTracks)
    if (newSet.has(trackId)) {
      newSet.delete(trackId)
    } else {
      newSet.add(trackId)
    }
    setExpandedTracks(newSet)
  }

  return (
    <div className="space-y-4">
      {/* Releases Section */}
      {releases.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              Releases ({releases.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (expandedReleases.size === releases.length) {
                  setExpandedReleases(new Set())
                } else {
                  setExpandedReleases(new Set(releases.map(r => r.id)))
                }
              }}
            >
              {expandedReleases.size === releases.length ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {releases.map((release) => (
              <Card key={release.id} className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm line-clamp-1">{release.title}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">{release.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/releases/${release.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleRelease(release.id)}
                      >
                        {expandedReleases.has(release.id) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedReleases.has(release.id) && (
                  <CardContent className="pt-0">
                    <Link href={`/releases/${release.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Release Details
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tracks Section */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              Tracks ({tracks.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (expandedTracks.size === tracks.length) {
                  setExpandedTracks(new Set())
                } else {
                  setExpandedTracks(new Set(tracks.map(t => t.id)))
                }
              }}
            >
              {expandedTracks.size === tracks.length ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tracks.map((track) => {
              const isExpanded = expandedTracks.has(track.id)
              const isEditing = editingTrackId === track.id

              return (
                <div key={track.id}>
                  {isEditing ? (
                    <InlineTrackEditor
                      track={track}
                      onSave={() => setEditingTrackId(null)}
                      onCancel={() => setEditingTrackId(null)}
                    />
                  ) : (
                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm line-clamp-1">{track.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Link 
                                href={`/releases/${track.release.id}`}
                                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                              >
                                {track.release.title}
                              </Link>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingTrackId(track.id)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            )}
                            <Link href={`/releases/${track.release.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleTrack(track.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="pt-0 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {track.performer && (
                              <div>
                                <span className="font-medium">Artist:</span>{' '}
                                <span className="text-muted-foreground">{track.performer}</span>
                              </div>
                            )}
                            {track.composer && (
                              <div>
                                <span className="font-medium">Composer:</span>{' '}
                                <span className="text-muted-foreground">{track.composer}</span>
                              </div>
                            )}
                            {track.band && (
                              <div>
                                <span className="font-medium">Band:</span>{' '}
                                <span className="text-muted-foreground">{track.band}</span>
                              </div>
                            )}
                            {track.musicProducer && (
                              <div>
                                <span className="font-medium">Producer:</span>{' '}
                                <span className="text-muted-foreground">{track.musicProducer}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {releases.length === 0 && tracks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No releases or tracks to display</p>
        </div>
      )}
    </div>
  )
}
