'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Music, 
  Calendar, 
  Edit,
  Disc,
  ExternalLink
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { AnimatedCard } from '@/components/animated-card'
import { EmptyState } from '@/components/empty-state'
import { InlineReleaseEditor } from './inline-release-editor'
import { InlineTrackEditor } from './inline-track-editor'
import { AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ArtistReleasesTracksViewProps {
  artist: any
  releases: any[]
  tracksWithArtist: any[]
  canEdit: boolean
  totalReleases: number
  employees?: Array<{ id: string; user: { name: string | null; email: string } }>
}

export function ArtistReleasesTracksView({
  artist,
  releases,
  tracksWithArtist,
  canEdit,
  totalReleases,
  employees = [],
}: ArtistReleasesTracksViewProps) {
  const [employeesList, setEmployeesList] = useState(employees)
  
  // Fetch employees if not provided
  useEffect(() => {
    if (employees.length === 0 && canEdit) {
      fetch('/api/releases/filter-options?type=assignedAR')
        .then(res => res.json())
        .then(data => {
          if (data.options) {
            setEmployeesList(data.options.map((opt: any) => ({
              id: opt.id,
              user: {
                name: opt.name,
                email: opt.name,
              },
            })))
          }
        })
        .catch(() => {})
    }
  }, [canEdit, employees.length])
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [expandedReleases, setExpandedReleases] = useState<Set<string>>(new Set())
  
  const hasReleases = releases.length > 0
  const hasTracks = tracksWithArtist.length > 0
  
  // Default to tracks tab if no releases but has tracks
  const [activeTab, setActiveTab] = useState<'releases' | 'tracks'>(() => {
    return !hasReleases && hasTracks ? 'tracks' : 'releases'
  })

  // Update tab if releases/tracks change
  useEffect(() => {
    if (!hasReleases && hasTracks && activeTab === 'releases') {
      setActiveTab('tracks')
    }
  }, [hasReleases, hasTracks, activeTab])

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'releases' | 'tracks')} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            <Music className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" />
            <span className="flex items-center gap-2 flex-wrap">
              {hasReleases && hasTracks ? (
                <>
                  Releases & Tracks
                  <Badge variant="secondary" className="ml-1 text-xs sm:text-sm px-2 py-1">
                    {totalReleases} releases, {tracksWithArtist.length} track{tracksWithArtist.length !== 1 ? 's' : ''}
                  </Badge>
                </>
              ) : hasReleases ? (
                <>Releases ({totalReleases})</>
              ) : (
                <>Tracks ({tracksWithArtist.length})</>
              )}
            </span>
          </h2>
          {hasReleases && hasTracks && (
            <TabsList className="shrink-0">
              <TabsTrigger value="releases" className="gap-2">
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">Releases</span>
                <span className="sm:hidden">Rel</span>
                <span className="text-xs">({totalReleases})</span>
              </TabsTrigger>
              <TabsTrigger value="tracks" className="gap-2">
                <Disc className="w-4 h-4" />
                <span className="hidden sm:inline">Tracks</span>
                <span className="sm:hidden">Trk</span>
                <span className="text-xs">({tracksWithArtist.length})</span>
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {/* Releases Tab */}
        <TabsContent value="releases" className="space-y-6 mt-6">
          {hasReleases ? (
            <div className="space-y-4">
              {releases.map((release, index) => {
                const isEditing = editingReleaseId === release.id
                
                return (
                  <div key={release.id}>
                    {isEditing ? (
                      <InlineReleaseEditor
                        release={release}
                        employees={employeesList}
                        onSave={() => {
                          setEditingReleaseId(null)
                        }}
                        onCancel={() => setEditingReleaseId(null)}
                      />
                    ) : (
                      <AnimatedCard delay={0.5 + index * 0.05} hover glow>
                        <Card className="hover:border-primary/30 transition-all h-full bg-gradient-to-br from-card via-card to-primary/5 group">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="line-clamp-2 flex-1">{release.title}</CardTitle>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="purple">{release.type}</Badge>
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setEditingReleaseId(release.id)
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <CardDescription>
                              {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {/* Display Artists */}
                            {(() => {
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
                              allArtists.sort((a, b) => {
                                if (a.isPrimary && !b.isPrimary) return -1
                                if (!a.isPrimary && b.isPrimary) return 1
                                return 0
                              })
                              
                              // Only show artists section if there are artists
                              // Only show secondary artists if they exist
                              const primaryArtist = allArtists[0]
                              const secondaryArtists = allArtists.slice(1)
                              
                              return primaryArtist && (
                                <div className="mb-3">
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Artists</div>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge 
                                      key={primaryArtist.id} 
                                      variant="default"
                                      className="font-bold"
                                    >
                                      {primaryArtist.name}
                                    </Badge>
                                    {/* Only show secondary artists if they exist */}
                                    {secondaryArtists.length > 0 && secondaryArtists.map((artist: any) => (
                                      <Badge 
                                        key={artist.id} 
                                        variant="outline"
                                      >
                                        {artist.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                            
                            <div className="space-y-2 text-sm">
                              {release.artistsChosenDate && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="w-4 h-4 text-primary" />
                                  {formatDate(release.artistsChosenDate)}
                                </div>
                              )}
                              {release.legacyReleaseDate && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="w-4 h-4 text-primary" />
                                  Legacy: {formatDate(release.legacyReleaseDate)}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newExpanded = new Set(expandedReleases)
                                  if (newExpanded.has(release.id)) {
                                    newExpanded.delete(release.id)
                                  } else {
                                    newExpanded.add(release.id)
                                  }
                                  setExpandedReleases(newExpanded)
                                }}
                                className="flex-1"
                              >
                                {expandedReleases.has(release.id) ? (
                                  <>
                                    <ChevronUp className="w-3 h-3 mr-2" />
                                    Hide Tracks
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3 mr-2" />
                                    Show Tracks ({release.tracks.length})
                                  </>
                                )}
                              </Button>
                              <Link href={`/releases/${release.id}`}>
                                <Button variant="outline" size="sm">
                                  View Details
                                  <ExternalLink className="w-3 h-3 ml-2" />
                                </Button>
                              </Link>
                            </div>

                            {/* Expandable Tracks Section */}
                            {expandedReleases.has(release.id) && release.tracks && release.tracks.length > 0 && (
                              <div className="mt-4 pt-4 border-t space-y-3">
                                <div className="text-sm font-semibold mb-3">Tracks ({release.tracks.length})</div>
                                {release.tracks.map((track: any, trackIndex: number) => {
                                  const isEditingTrack = editingTrackId === track.id
                                  
                                  return (
                                    <div key={track.id} className="border rounded-lg p-3 bg-muted/30">
                                      {isEditingTrack ? (
                                        <InlineTrackEditor
                                          track={track}
                                          onSave={() => {
                                            setEditingTrackId(null)
                                          }}
                                          onCancel={() => setEditingTrackId(null)}
                                        />
                                      ) : (
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="font-medium">{track.name}</span>
                                              {track.trackNumber && (
                                                <Badge variant="outline" className="text-xs">
                                                  #{track.trackNumber}
                                                </Badge>
                                              )}
                                            </div>
                                            
                                            {/* Display Artists for Track */}
                                            {(() => {
                                              const allArtists: any[] = []
                                              if (track.trackArtists && track.trackArtists.length > 0) {
                                                track.trackArtists.forEach((ta: any) => {
                                                  allArtists.push({ ...ta.artist, isPrimary: ta.isPrimary })
                                                })
                                              } else if (release.artist) {
                                                allArtists.push({ ...release.artist, isPrimary: true })
                                              }
                                              allArtists.sort((a, b) => {
                                                if (a.isPrimary && !b.isPrimary) return -1
                                                if (!a.isPrimary && b.isPrimary) return 1
                                                return 0
                                              })
                                              
                                              // Only show artists section if there are artists
                                              // Only show secondary artists if they exist
                                              const primaryArtist = allArtists[0]
                                              const secondaryArtists = allArtists.slice(1)
                                              
                                              return primaryArtist && (
                                                <div className="mb-2">
                                                  <div className="text-xs font-medium text-muted-foreground mb-1">Artists</div>
                                                  <div className="flex flex-wrap gap-1">
                                                    <Badge 
                                                      key={primaryArtist.id} 
                                                      variant="default"
                                                      className="font-bold"
                                                    >
                                                      {primaryArtist.name}
                                                    </Badge>
                                                    {/* Only show secondary artists if they exist */}
                                                    {secondaryArtists.length > 0 && secondaryArtists.map((artist: any) => (
                                                      <Badge 
                                                        key={artist.id} 
                                                        variant="outline"
                                                      >
                                                        {artist.name}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                </div>
                                              )
                                            })()}
                                            
                                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
                                              {track.composer && (
                                                <div>
                                                  <span className="font-medium">Composer:</span> {track.composer}
                                                </div>
                                              )}
                                              {track.band && (
                                                <div>
                                                  <span className="font-medium">Band:</span> {track.band}
                                                </div>
                                              )}
                                              {track.studio && (
                                                <div>
                                                  <span className="font-medium">Studio:</span> {track.studio}
                                                </div>
                                              )}
                                              {track.genre && (
                                                <div>
                                                  <span className="font-medium">Genre:</span> {track.genre}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {canEdit && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setEditingTrackId(track.id)}
                                              className="flex-shrink-0"
                                            >
                                              <Edit className="w-4 h-4 mr-2" />
                                              Edit
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </AnimatedCard>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon="Music"
              title="No releases yet"
              description="Releases will appear here once they're submitted"
            />
          )}
        </TabsContent>

        {/* Tracks Tab */}
        <TabsContent value="tracks" className="space-y-6 mt-6">
          {hasTracks ? (
            <div className="space-y-4">
              {tracksWithArtist
                .filter((track) => {
                  // Only show tracks where artist is linked via TrackArtist relationship
                  // Do NOT show tracks based on string field matches (composer, band, producer)
                  return track.trackArtists?.some((ta: any) => ta.artistId === artist.id)
                })
                .map((track, index) => {
                // Determine role based on TrackArtist relationship only
                const trackArtistRelation = track.trackArtists?.find((ta: any) => ta.artistId === artist.id)
                
                let role = 'Artist'
                if (trackArtistRelation) {
                  role = trackArtistRelation.isPrimary ? 'Primary Artist' : 'Secondary Artist'
                }
                
                const isEditing = editingTrackId === track.id
                
                return (
                  <div key={track.id}>
                    {isEditing ? (
                      <InlineTrackEditor
                        track={track}
                        onSave={() => {
                          setEditingTrackId(null)
                        }}
                        onCancel={() => setEditingTrackId(null)}
                      />
                    ) : (
                      <AnimatedCard delay={0.6 + index * 0.05}>
                        <Card className="hover:border-primary/30 transition-all bg-gradient-to-br from-card via-card to-primary/5 group">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg line-clamp-1">{track.name}</h3>
                                  <Badge variant="outline" className="text-xs">{role}</Badge>
                                </div>
                                
                                {/* Display Artists */}
                                {(() => {
                                  const allArtists: any[] = []
                                  if (track.trackArtists && track.trackArtists.length > 0) {
                                    track.trackArtists.forEach((ta: any) => {
                                      allArtists.push({ ...ta.artist, isPrimary: ta.isPrimary })
                                    })
                                  } else if (track.release?.artist) {
                                    allArtists.push({ ...track.release.artist, isPrimary: true })
                                  }
                                  allArtists.sort((a, b) => {
                                    if (a.isPrimary && !b.isPrimary) return -1
                                    if (!a.isPrimary && b.isPrimary) return 1
                                    return 0
                                  })
                                  
                                  // Only show artists section if there are artists
                                  // Only show secondary artists if they exist
                                  const primaryArtist = allArtists[0]
                                  const secondaryArtists = allArtists.slice(1)
                                  
                                  return primaryArtist && (
                                    <div className="mb-3">
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Artists</div>
                                      <div className="flex flex-wrap gap-1">
                                        <Badge 
                                          key={primaryArtist.id} 
                                          variant="default"
                                          className="font-bold"
                                        >
                                          {primaryArtist.name}
                                        </Badge>
                                        {/* Only show secondary artists if they exist */}
                                        {secondaryArtists.length > 0 && secondaryArtists.map((artist: any) => (
                                          <Badge 
                                            key={artist.id} 
                                            variant="outline"
                                          >
                                            {artist.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })()}
                                
                                <div className="space-y-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4" />
                                    <Link 
                                      href={`/releases/${track.release.id}`}
                                      className="hover:text-primary hover:underline transition-colors"
                                    >
                                      {track.release.title}
                                    </Link>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-4 mt-3">
                                    {track.performer && (
                                      <div>
                                        <span className="text-xs font-medium">Performer:</span>{' '}
                                        <span className="text-xs">{track.performer}</span>
                                      </div>
                                    )}
                                    {track.composer && (
                                      <div>
                                        <span className="text-xs font-medium">Composer:</span>{' '}
                                        <span className="text-xs">{track.composer}</span>
                                      </div>
                                    )}
                                    {track.band && (
                                      <div>
                                        <span className="text-xs font-medium">Band:</span>{' '}
                                        <span className="text-xs">{track.band}</span>
                                      </div>
                                    )}
                                    {track.musicProducer && (
                                      <div>
                                        <span className="text-xs font-medium">Producer:</span>{' '}
                                        <span className="text-xs">{track.musicProducer}</span>
                                      </div>
                                    )}
                                    {track.studio && (
                                      <div>
                                        <span className="text-xs font-medium">Studio:</span>{' '}
                                        <span className="text-xs">{track.studio}</span>
                                      </div>
                                    )}
                                    {track.genre && (
                                      <div>
                                        <span className="text-xs font-medium">Genre:</span>{' '}
                                        <span className="text-xs">{track.genre}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setEditingTrackId(track.id)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                <Link href={`/releases/${track.release.id}`}>
                                  <Button variant="outline" size="sm">
                                    <ExternalLink className="w-3 h-3 mr-2" />
                                    View Release
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedCard>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon="Disc"
              title="No tracks found"
              description="Tracks where this artist appears will be shown here"
            />
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}
