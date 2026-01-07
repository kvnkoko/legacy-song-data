'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Eye,
  Settings2
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

interface Release {
  id: string
  type: string
  title: string
  artistsChosenDate: Date | null
  legacyReleaseDate: Date | null
  copyrightStatus: string | null
  videoType: string | null
  artist: {
    name: string
    legalName: string | null
  }
  tracks: Array<{
    id: string
    name: string
    performer: string | null
    composer: string | null
    band: string | null
    musicProducer: string | null
    studio: string | null
    recordLabel: string | null
    genre: string | null
  }>
  platformRequests: Array<{
    platform: string
    status: string
    channelName: string | null
  }>
}

// Helper function to format platform tag
function formatPlatformTag(platform: string, channelName: string | null | undefined): string {
  // Platform short codes
  const platformCodes: Record<string, string> = {
    youtube: 'yt',
    flow: 'flow',
    ringtunes: 'rt',
    international_streaming: 'is',
    facebook: 'fb',
    tiktok: 'tt',
  }
  
  const platformCode = platformCodes[platform.toLowerCase()] || platform.substring(0, 4)
  
  // If channel name exists, format as "platform-channelname"
  if (channelName && channelName.trim()) {
    const channelSlug = channelName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
    return `${platformCode}-${channelSlug}`
  }
  
  // Otherwise just return platform code
  return platformCode
}

interface ReleasesTableProps {
  releases: Release[]
  total: number
  currentPage: number
  totalPages: number
  searchQuery?: string
}

const COLUMNS = [
  { id: 'title', label: 'Release Title', defaultVisible: true },
  { id: 'artist', label: 'Artist', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'tracks', label: 'Tracks', defaultVisible: true },
  { id: 'artistsDate', label: "Artist's Date", defaultVisible: true },
  { id: 'legacyDate', label: 'Legacy Date', defaultVisible: true },
  { id: 'copyright', label: 'Copyright', defaultVisible: false },
  { id: 'videoType', label: 'Video Type', defaultVisible: false },
  { id: 'platforms', label: 'Platforms', defaultVisible: true },
  { id: 'trackDetails', label: 'Track Details', defaultVisible: false },
] as const

export function ReleasesTable({ 
  releases, 
  total, 
  currentPage, 
  totalPages,
  searchQuery = ''
}: ReleasesTableProps) {
  const [search, setSearch] = useState(searchQuery)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id))
  )
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const filteredReleases = useMemo(() => {
    if (!search) return releases
    
    const lowerSearch = search.toLowerCase()
    return releases.filter(release => 
      release.title.toLowerCase().includes(lowerSearch) ||
      release.artist.name.toLowerCase().includes(lowerSearch) ||
      release.tracks.some(t => 
        t.name.toLowerCase().includes(lowerSearch) ||
        t.performer?.toLowerCase().includes(lowerSearch) ||
        t.composer?.toLowerCase().includes(lowerSearch)
      )
    )
  }, [releases, search])

  const visibleColumnsArray = COLUMNS.filter(c => visibleColumns.has(c.id))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search releases, artists, tracks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns.has(column.id)}
                  onCheckedChange={(checked) => {
                    const newVisible = new Set(visibleColumns)
                    if (checked) {
                      newVisible.add(column.id)
                    } else {
                      newVisible.delete(column.id)
                    }
                    setVisibleColumns(newVisible)
                  }}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <a href="/api/export/csv?mode=track">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              {visibleColumnsArray.map((column) => (
                <TableHead key={column.id} className="font-semibold">
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReleases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnsArray.length + 2} className="text-center py-8 text-muted-foreground">
                  No releases found
                </TableCell>
              </TableRow>
            ) : (
              filteredReleases.map((release) => (
                <>
                  <TableRow 
                    key={release.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleRow(release.id)}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRow(release.id)
                        }}
                      >
                        {expandedRows.has(release.id) ? (
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    
                    {visibleColumnsArray.map((column) => {
                      switch (column.id) {
                        case 'title':
                          return (
                            <TableCell key={column.id} className="font-medium py-3 leading-relaxed">
                              {release.title}
                            </TableCell>
                          )
                        case 'artist':
                          return (
                            <TableCell key={column.id} className="py-3">
                              <div className="leading-relaxed">
                                <div className="font-medium leading-relaxed pb-0.5">{release.artist.name}</div>
                                {release.artist.legalName && (
                                  <div className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                                    {release.artist.legalName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          )
                        case 'type':
                          return (
                            <TableCell key={column.id}>
                              <Badge variant="outline">{release.type}</Badge>
                            </TableCell>
                          )
                        case 'tracks':
                          return (
                            <TableCell key={column.id} className="py-3">
                              <div className="font-medium leading-relaxed">{release.tracks.length}</div>
                              {release.tracks.length > 0 && (
                                <div className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                                  {release.tracks.slice(0, 2).map(t => t.name).join(', ')}
                                  {release.tracks.length > 2 && ` +${release.tracks.length - 2}`}
                                </div>
                              )}
                            </TableCell>
                          )
                        case 'artistsDate':
                          return (
                            <TableCell key={column.id} className="text-sm">
                              {release.artistsChosenDate 
                                ? formatDate(release.artistsChosenDate)
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          )
                        case 'legacyDate':
                          return (
                            <TableCell key={column.id} className="text-sm">
                              {release.legacyReleaseDate 
                                ? formatDate(release.legacyReleaseDate)
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          )
                        case 'copyright':
                          return (
                            <TableCell key={column.id}>
                              {release.copyrightStatus ? (
                                <Badge variant="secondary">{release.copyrightStatus}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )
                        case 'videoType':
                          return (
                            <TableCell key={column.id}>
                              {release.videoType && release.videoType !== 'NONE' ? (
                                <Badge variant="secondary">{release.videoType}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )
                        case 'platforms':
                          return (
                            <TableCell key={column.id}>
                              <div className="flex flex-wrap gap-1">
                                {release.platformRequests.map((pr) => (
                                  <Badge 
                                    key={`${pr.platform}-${pr.channelName || ''}`} 
                                    variant={
                                      pr.status === 'UPLOADED' ? 'default' :
                                      pr.status === 'REJECTED' ? 'destructive' :
                                      pr.status === 'UPLOADED' ? 'default' :
                                      'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {formatPlatformTag(pr.platform, pr.channelName)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          )
                        case 'trackDetails':
                          return (
                            <TableCell key={column.id} className="text-xs text-muted-foreground max-w-xs">
                              {release.tracks.map((t, i) => (
                                <div key={t.id} className="truncate">
                                  {i + 1}. {t.name}
                                  {t.performer && ` • ${t.performer}`}
                                  {t.composer && ` • ${t.composer}`}
                                </div>
                              ))}
                            </TableCell>
                          )
                        default:
                          return <TableCell key={column.id}>—</TableCell>
                      }
                    })}
                    
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Link href={`/releases/${release.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded row with track details */}
                  {expandedRows.has(release.id) && (
                    <TableRow key={`${release.id}-expanded`}>
                      <TableCell colSpan={visibleColumnsArray.length + 2} className="bg-muted/30 p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {release.artistsChosenDate && (
                              <div>
                                <div className="text-muted-foreground text-xs">Artist's Date</div>
                                <div className="font-medium">{formatDate(release.artistsChosenDate)}</div>
                              </div>
                            )}
                            {release.legacyReleaseDate && (
                              <div>
                                <div className="text-muted-foreground text-xs">Legacy Date</div>
                                <div className="font-medium">{formatDate(release.legacyReleaseDate)}</div>
                              </div>
                            )}
                            {release.copyrightStatus && (
                              <div>
                                <div className="text-muted-foreground text-xs">Copyright</div>
                                <div className="font-medium">{release.copyrightStatus}</div>
                              </div>
                            )}
                            {release.videoType && release.videoType !== 'NONE' && (
                              <div>
                                <div className="text-muted-foreground text-xs">Video</div>
                                <div className="font-medium">{release.videoType}</div>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div className="text-sm font-semibold mb-2">Tracks ({release.tracks.length})</div>
                            <div className="space-y-2">
                              {release.tracks.map((track, idx) => (
                                <div key={track.id} className="border rounded-lg p-3 bg-background">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                      <div>
                                        <div className="text-muted-foreground text-xs">Song</div>
                                        <div className="font-medium">{track.name}</div>
                                      </div>
                                      {track.performer && (
                                        <div>
                                          <div className="text-muted-foreground text-xs">Artist</div>
                                          <div>{track.performer}</div>
                                        </div>
                                      )}
                                      {track.composer && (
                                        <div>
                                          <div className="text-muted-foreground text-xs">Composer</div>
                                          <div>{track.composer}</div>
                                        </div>
                                      )}
                                      {track.band && (
                                        <div>
                                          <div className="text-muted-foreground text-xs">Band/Producer</div>
                                          <div>{track.band}</div>
                                        </div>
                                      )}
                                      {track.studio && (
                                        <div>
                                          <div className="text-muted-foreground text-xs">Studio</div>
                                          <div>{track.studio}</div>
                                        </div>
                                      )}
                                      {track.recordLabel && (
                                        <div>
                                          <div className="text-muted-foreground text-xs">Label</div>
                                          <div>{track.recordLabel}</div>
                                        </div>
                                      )}
                                      {track.genre && (
                                        <div>
                                          <div className="text-muted-foreground text-xs">Genre</div>
                                          <div>{track.genre}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, total)} of {total} releases
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/releases?page=${currentPage - 1}${searchQuery ? `&search=${searchQuery}` : ''}`}>
              <Button variant="outline" size="sm" disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            </Link>
            <div className="text-sm px-4">
              Page {currentPage} of {totalPages}
            </div>
            <Link href={`/releases?page=${currentPage + 1}${searchQuery ? `&search=${searchQuery}` : ''}`}>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

