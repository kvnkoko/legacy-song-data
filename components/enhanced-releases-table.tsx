'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Eye,
  Settings2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Trash2,
  Edit,
} from 'lucide-react'
import { InlineReleaseEditor } from './inline-release-editor'
import { InlineTrackEditor } from './inline-track-editor'
import { TrackArtistsDisplay } from './release-detail-client'
import { formatDate } from '@/lib/utils'
import { DateRangePicker } from './date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { UserRole } from '@prisma/client'
import { SearchableFilter } from './searchable-filter'
import { useDebounce } from '@/hooks/use-debounce'
import { Pagination } from '@/components/ui/pagination'

interface Release {
  id: string
  type: string
  title: string
  artistsChosenDate: Date | null
  legacyReleaseDate: Date | null
  copyrightStatus: string | null
  videoType: string | null
  artist: {
    id: string
    name: string
    legalName: string | null
  }
  releaseArtists?: Array<{
    id: string
    isPrimary: boolean
    createdAt: Date
    artist: {
      id: string
      name: string
      legalName: string | null
    }
  }>
  assignedA_R?: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
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
    trackNumber: number
    trackArtists?: Array<{
      id: string
      isPrimary: boolean
      artist: {
        id: string
        name: string
        legalName: string | null
      }
    }>
  }>
  platformRequests: Array<{
    platform: string
    status: string
    channelName: string | null
  }>
}

interface EnhancedReleasesTableProps {
  releases: Release[]
  total: number
  currentPage: number
  totalPages: number
  pageSize: number
  stats: {
    totalReleases: number
    totalTracks: number
    totalSingles: number
    totalAlbums: number
    totalUploaded: number
  }
  searchParams: {
    search?: string
    type?: string
    platform?: string
    status?: string
    performer?: string
    composer?: string
    band?: string
    studio?: string
    label?: string
    genre?: string
    startDate?: string
    endDate?: string
    sortField?: string
    sortDirection?: 'asc' | 'desc' | 'desc-nulls-last'
    missingArtist?: string
    pageSize?: string
  }
  userRole?: UserRole
}

type SortField = 'title' | 'artist' | 'type' | 'artistsDate' | 'legacyDate' | 'tracks' | 'performer' | 'composer' | 'genre'
type SortDirection = 'asc' | 'desc' | 'desc-nulls-last'

// Date columns that support 3-state sorting
const DATE_COLUMNS: SortField[] = ['artistsDate', 'legacyDate']

const COLUMNS = [
  { id: 'title', label: 'Title', defaultVisible: true, sortable: true },
  { id: 'artist', label: 'Artist', defaultVisible: true, sortable: true },
  { id: 'type', label: 'Type', defaultVisible: true, sortable: true },
  { id: 'tracks', label: 'Tracks', defaultVisible: true, sortable: true },
  { id: 'artistsDate', label: "Artist's Date", defaultVisible: true, sortable: true },
  { id: 'legacyDate', label: 'Legacy Date', defaultVisible: true, sortable: true },
  { id: 'performer', label: 'Artist', defaultVisible: false, sortable: true },
  { id: 'composer', label: 'Composer', defaultVisible: false, sortable: true },
  { id: 'band', label: 'Band/Producer', defaultVisible: false, sortable: false },
  { id: 'studio', label: 'Studio', defaultVisible: false, sortable: false },
  { id: 'label', label: 'Label', defaultVisible: false, sortable: false },
  { id: 'genre', label: 'Genre', defaultVisible: false, sortable: true },
  { id: 'copyright', label: 'Copyright', defaultVisible: false, sortable: false },
  { id: 'videoType', label: 'Video', defaultVisible: false, sortable: false },
  { id: 'platforms', label: 'Platforms', defaultVisible: true, sortable: false },
] as const

function formatPlatformTag(platform: string, channelName: string | null | undefined): string {
  const platformCodes: Record<string, string> = {
    youtube: 'yt',
    flow: 'flow',
    ringtunes: 'rt',
    international_streaming: 'is',
    facebook: 'fb',
    tiktok: 'tt',
  }
  
  const platformCode = platformCodes[platform.toLowerCase()] || platform.substring(0, 4)
  
  if (channelName && channelName.trim()) {
    const channelSlug = channelName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
    return `${platformCode}-${channelSlug}`
  }
  
  return platformCode
}

export function EnhancedReleasesTable({ 
  releases, 
  total, 
  currentPage, 
  totalPages,
  pageSize,
  stats,
  searchParams: initialSearchParams,
  userRole
}: EnhancedReleasesTableProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const { toast } = useToast()
  
  const [search, setSearch] = useState(initialSearchParams.search || '')
  const [selectedReleases, setSelectedReleases] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id))
  )
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)

  // Initialize filters from URL params
  const [typeFilter, setTypeFilter] = useState(initialSearchParams.type || 'all')
  const [platformFilter, setPlatformFilter] = useState(initialSearchParams.platform || 'all')
  const [statusFilter, setStatusFilter] = useState(initialSearchParams.status || 'all')
  const [performerFilter, setPerformerFilter] = useState(initialSearchParams.performer || 'all')
  const [composerFilter, setComposerFilter] = useState(initialSearchParams.composer || 'all')
  const [bandFilter, setBandFilter] = useState(initialSearchParams.band || 'all')
  const [studioFilter, setStudioFilter] = useState(initialSearchParams.studio || 'all')
  const [labelFilter, setLabelFilter] = useState(initialSearchParams.label || 'all')
  const [genreFilter, setGenreFilter] = useState(initialSearchParams.genre || 'all')
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(
    initialSearchParams.startDate ? new Date(initialSearchParams.startDate) : undefined
  )
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(
    initialSearchParams.endDate ? new Date(initialSearchParams.endDate) : undefined
  )
  const [sortField, setSortField] = useState<SortField | null>(
    (initialSearchParams.sortField as SortField) || null
  )
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    (initialSearchParams.sortDirection as SortDirection) || 'asc'
  )
  const [missingArtistFilter, setMissingArtistFilter] = useState(
    initialSearchParams.missingArtist === 'true'
  )

  const debouncedSearch = useDebounce(search, 500)

  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER

  // Update URL params when filters change (server-side filtering)
  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParamsHook.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        // Don't add pageSize to URL if it's the default (50)
        if (key === 'pageSize' && value === '50') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      } else {
        params.delete(key)
      }
    })
    
    // Only reset to page 1 if it's a filter change (not a page change)
    if (!updates.page) {
      params.set('page', '1')
    }
    router.push(`/releases?${params.toString()}`)
  }

  // Update search when debounced value changes
  useEffect(() => {
    updateSearchParams({ search: debouncedSearch || undefined })
  }, [debouncedSearch])

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedReleases)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedReleases(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedReleases.size === releases.length) {
      setSelectedReleases(new Set())
    } else {
      setSelectedReleases(new Set(releases.map(r => r.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedReleases.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedReleases.size} release(s)? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/releases/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseIds: Array.from(selectedReleases) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete releases')
      }

      toast({
        title: 'Success',
        description: `Deleted ${data.deleted} release(s) successfully`,
      })

      setSelectedReleases(new Set())
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete releases',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleSort = (field: SortField) => {
    const isDateColumn = DATE_COLUMNS.includes(field)
    
    if (sortField !== field) {
      // New field - start with ascending
      setSortField(field)
      setSortDirection('asc')
      updateSearchParams({ 
        sortField: field, 
        sortDirection: 'asc' 
      })
    } else {
      // Same field - cycle through states
      let newDirection: SortDirection
      
      if (isDateColumn) {
        // Date columns: asc -> desc-nulls-last -> desc -> asc
        switch (sortDirection) {
          case 'asc':
            newDirection = 'desc-nulls-last'
            break
          case 'desc-nulls-last':
            newDirection = 'desc'
            break
          case 'desc':
            newDirection = 'asc'
            break
          default:
            newDirection = 'asc'
        }
      } else {
        // Non-date columns: asc -> desc -> asc
        newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
      }
      
      setSortDirection(newDirection)
      updateSearchParams({ 
        sortField: field, 
        sortDirection: newDirection 
      })
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
    }
    
    switch (sortDirection) {
      case 'asc':
        return <ArrowUp className="w-3 h-3 ml-1" />
      case 'desc':
        return <ArrowDown className="w-3 h-3 ml-1" />
      case 'desc-nulls-last':
        return (
          <div className="relative ml-1" title="Descending (latest first, no empty dates)">
            <ArrowDown className="w-3 h-3" />
            <span className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-primary rounded-full" />
          </div>
        )
      default:
        return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
    }
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setPlatformFilter('all')
    setStatusFilter('all')
    setPerformerFilter('all')
    setComposerFilter('all')
    setBandFilter('all')
    setStudioFilter('all')
    setLabelFilter('all')
    setGenreFilter('all')
    setDateRangeStart(undefined)
    setDateRangeEnd(undefined)
    setSortField(null)
    setMissingArtistFilter(false)
    router.push('/releases')
  }

  const hasActiveFilters = 
    search || 
    typeFilter !== 'all' || 
    platformFilter !== 'all' || 
    statusFilter !== 'all' || 
    performerFilter !== 'all' || 
    composerFilter !== 'all' || 
    bandFilter !== 'all' || 
    studioFilter !== 'all' || 
    labelFilter !== 'all' || 
    genreFilter !== 'all' || 
    dateRangeStart || 
    dateRangeEnd ||
    missingArtistFilter

  const visibleColumnsArray = COLUMNS.filter(c => visibleColumns.has(c.id))
  
  // Get unique platforms and statuses from current releases
  const platforms = Array.from(new Set(releases.flatMap(r => r.platformRequests.map(pr => pr.platform))))
  const statuses = Array.from(new Set(releases.flatMap(r => r.platformRequests.map(pr => pr.status))))

  // Get all artists for a release (primary first, then secondary)
  const getReleaseArtists = (release: Release) => {
    const artists: Array<{ id: string; name: string; legalName: string | null; isPrimary: boolean }> = []
    
    // Primary artist from Release.artistId
    artists.push({ ...release.artist, isPrimary: true })
    
    // Secondary artists from ReleaseArtist relationships
    if (release.releaseArtists && release.releaseArtists.length > 0) {
      release.releaseArtists.forEach(ra => {
        if (ra.artistId !== release.artist.id && !artists.find(a => a.id === ra.artist.id)) {
          artists.push({ ...ra.artist, isPrimary: ra.isPrimary })
        }
      })
    }
    
    // Sort: primary first, then secondary
    return artists.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1
      if (!a.isPrimary && b.isPrimary) return 1
      return 0
    })
  }

  // Get all artists for a track (primary first, then secondary)
  const getTrackArtists = (track: any, releaseArtist?: any) => {
    const artists: Array<{ id: string; name: string; legalName: string | null; isPrimary: boolean }> = []
    
    if (track.trackArtists && track.trackArtists.length > 0) {
      // Use TrackArtist relationships
      track.trackArtists.forEach((ta: any) => {
        artists.push({ ...ta.artist, isPrimary: ta.isPrimary })
      })
    } else if (releaseArtist) {
      // Fallback to release artist if no TrackArtist entries
      artists.push({ ...releaseArtist, isPrimary: true })
    }
    
    // Sort: primary first, then secondary
    return artists.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1
      if (!a.isPrimary && b.isPrimary) return 1
      return 0
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Total Releases</div>
          <div className="text-2xl font-bold">{stats.totalReleases.toLocaleString()}</div>
          {hasActiveFilters && (
            <div className="text-xs text-muted-foreground mt-1">Showing {releases.length}</div>
          )}
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Total Tracks</div>
          <div className="text-2xl font-bold">{stats.totalTracks.toLocaleString()}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Singles</div>
          <div className="text-2xl font-bold">{stats.totalSingles.toLocaleString()}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Albums</div>
          <div className="text-2xl font-bold">{stats.totalAlbums.toLocaleString()}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Uploaded</div>
          <div className="text-2xl font-bold">{stats.totalUploaded.toLocaleString()}</div>
        </div>
      </div>

      {/* Enhanced Toolbar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
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

          <div className="flex items-center gap-2 flex-wrap">
            {canDelete && selectedReleases.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedReleases.size})
              </Button>
            )}

            <DateRangePicker
              startDate={dateRangeStart}
              endDate={dateRangeEnd}
              onDateChange={(start, end) => {
                setDateRangeStart(start)
                setDateRangeEnd(end)
                updateSearchParams({
                  startDate: start?.toISOString(),
                  endDate: end?.toISOString(),
                })
              }}
            />

            <Select 
              value={typeFilter} 
              onValueChange={(value) => {
                setTypeFilter(value)
                updateSearchParams({ type: value })
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SINGLE">Single</SelectItem>
                <SelectItem value="ALBUM">Album</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={platformFilter} 
              onValueChange={(value) => {
                setPlatformFilter(value)
                updateSearchParams({ platform: value })
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map(platform => (
                  <SelectItem key={platform} value={platform}>
                    {platform.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={statusFilter} 
              onValueChange={(value) => {
                setStatusFilter(value)
                updateSearchParams({ status: value })
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-4">
                <DropdownMenuLabel>Release-Level Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="space-y-3 mt-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="missing-artist-filter"
                      checked={missingArtistFilter}
                      onCheckedChange={(checked) => {
                        setMissingArtistFilter(checked as boolean)
                        updateSearchParams({ missingArtist: checked ? 'true' : undefined })
                      }}
                    />
                    <label
                      htmlFor="missing-artist-filter"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Missing Album Artist
                    </label>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Track-Level Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="space-y-3 mt-3">
                  <SearchableFilter
                    field="performer"
                    label="Artist"
                    value={performerFilter !== 'all' ? performerFilter : undefined}
                    onValueChange={(value) => {
                      setPerformerFilter(value || 'all')
                      updateSearchParams({ performer: value })
                    }}
                  />
                  <SearchableFilter
                    field="composer"
                    label="Composer"
                    value={composerFilter !== 'all' ? composerFilter : undefined}
                    onValueChange={(value) => {
                      setComposerFilter(value || 'all')
                      updateSearchParams({ composer: value })
                    }}
                  />
                  <SearchableFilter
                    field="band"
                    label="Band/Producer"
                    value={bandFilter !== 'all' ? bandFilter : undefined}
                    onValueChange={(value) => {
                      setBandFilter(value || 'all')
                      updateSearchParams({ band: value })
                    }}
                  />
                  <SearchableFilter
                    field="studio"
                    label="Studio"
                    value={studioFilter !== 'all' ? studioFilter : undefined}
                    onValueChange={(value) => {
                      setStudioFilter(value || 'all')
                      updateSearchParams({ studio: value })
                    }}
                  />
                  <SearchableFilter
                    field="label"
                    label="Label"
                    value={labelFilter !== 'all' ? labelFilter : undefined}
                    onValueChange={(value) => {
                      setLabelFilter(value || 'all')
                      updateSearchParams({ label: value })
                    }}
                  />
                  <SearchableFilter
                    field="genre"
                    label="Genre"
                    value={genreFilter !== 'all' ? genreFilter : undefined}
                    onValueChange={(value) => {
                      setGenreFilter(value || 'all')
                      updateSearchParams({ genre: value })
                    }}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Showing {releases.length} of {total.toLocaleString()} releases</span>
            {(performerFilter !== 'all' || composerFilter !== 'all' || bandFilter !== 'all' || 
              studioFilter !== 'all' || labelFilter !== 'all' || genreFilter !== 'all') && (
              <span className="ml-2">• Track filters active</span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedReleases.size === releases.length && releases.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              {visibleColumnsArray.map((column) => (
                <TableHead key={column.id} className="font-semibold">
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.id as SortField)}
                      className="flex items-center hover:text-foreground"
                    >
                      {column.label}
                      <SortIcon field={column.id as SortField} />
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {releases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnsArray.length + 2} className="text-center py-8 text-muted-foreground">
                  No releases found
                </TableCell>
              </TableRow>
            ) : (
              releases.map((release) => {
                const allArtists = getReleaseArtists(release)
                return (
                  <>
                    <TableRow 
                      key={release.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleRow(release.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedReleases.has(release.id)}
                          onCheckedChange={() => toggleSelect(release.id)}
                        />
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
                                  {/* Primary artist always shown, secondary artists only when they exist */}
                                  <div className="flex flex-wrap gap-1">
                                    {allArtists.length > 0 && (
                                      <Badge 
                                        key={allArtists[0].id} 
                                        variant="default"
                                        className="font-bold"
                                      >
                                        {allArtists[0].name}
                                      </Badge>
                                    )}
                                    {/* Only show secondary artists if they exist */}
                                    {allArtists.length > 1 && allArtists.slice(1).map((artist) => (
                                      <Badge 
                                        key={artist.id} 
                                        variant="outline"
                                      >
                                        {artist.name}
                                      </Badge>
                                    ))}
                                  </div>
                                  {allArtists.some(a => {
                                    const legalName = a.legalName
                                    return legalName && 
                                           legalName.trim() && 
                                           legalName.trim() !== '-' && 
                                           !legalName.trim().endsWith(', -') &&
                                           !legalName.trim().startsWith(', -')
                                  }) && (
                                    <div className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                                      {allArtists
                                        .filter(a => {
                                          const legalName = a.legalName
                                          return legalName && 
                                                 legalName.trim() && 
                                                 legalName.trim() !== '-' && 
                                                 !legalName.trim().endsWith(', -') &&
                                                 !legalName.trim().startsWith(', -')
                                        })
                                        .map(a => a.legalName?.trim().replace(/,\s*-$/, '').trim())
                                        .filter(name => name && name.length > 0)
                                        .join(', ')}
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
                          case 'performer':
                            return (
                              <TableCell key={column.id} className="text-sm">
                                {release.tracks.some(t => t.performer) ? (
                                  <div className="space-y-1">
                                    {release.tracks.filter(t => t.performer).slice(0, 2).map(t => (
                                      <div key={t.id} className="text-xs">{t.performer}</div>
                                    ))}
                                    {release.tracks.filter(t => t.performer).length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{release.tracks.filter(t => t.performer).length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )
                          case 'composer':
                            return (
                              <TableCell key={column.id} className="text-sm">
                                {release.tracks.some(t => t.composer) ? (
                                  <div className="space-y-1">
                                    {release.tracks.filter(t => t.composer).slice(0, 2).map(t => (
                                      <div key={t.id} className="text-xs">{t.composer}</div>
                                    ))}
                                    {release.tracks.filter(t => t.composer).length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{release.tracks.filter(t => t.composer).length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )
                          case 'band':
                            return (
                              <TableCell key={column.id} className="text-sm">
                                {release.tracks.some(t => t.band || t.musicProducer) ? (
                                  <div className="space-y-1">
                                    {release.tracks.filter(t => t.band || t.musicProducer).slice(0, 2).map(t => (
                                      <div key={t.id} className="text-xs">{t.band || t.musicProducer}</div>
                                    ))}
                                    {release.tracks.filter(t => t.band || t.musicProducer).length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{release.tracks.filter(t => t.band || t.musicProducer).length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )
                          case 'studio':
                            return (
                              <TableCell key={column.id} className="text-sm">
                                {release.tracks.some(t => t.studio) ? (
                                  <div className="space-y-1">
                                    {release.tracks.filter(t => t.studio).slice(0, 2).map(t => (
                                      <div key={t.id} className="text-xs">{t.studio}</div>
                                    ))}
                                    {release.tracks.filter(t => t.studio).length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{release.tracks.filter(t => t.studio).length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )
                          case 'label':
                            return (
                              <TableCell key={column.id} className="text-sm">
                                {release.tracks.some(t => t.recordLabel) ? (
                                  <div className="space-y-1">
                                    {release.tracks.filter(t => t.recordLabel).slice(0, 2).map(t => (
                                      <div key={t.id} className="text-xs">{t.recordLabel}</div>
                                    ))}
                                    {release.tracks.filter(t => t.recordLabel).length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{release.tracks.filter(t => t.recordLabel).length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )
                          case 'genre':
                            return (
                              <TableCell key={column.id} className="text-sm">
                                {release.tracks.some(t => t.genre) ? (
                                  <div className="space-y-1">
                                    {Array.from(new Set(release.tracks.filter(t => t.genre).map(t => t.genre))).slice(0, 2).map(genre => (
                                      <div key={genre} className="text-xs">{genre}</div>
                                    ))}
                                    {Array.from(new Set(release.tracks.filter(t => t.genre).map(t => t.genre))).length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{Array.from(new Set(release.tracks.filter(t => t.genre).map(t => t.genre))).length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
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
                          default:
                            return <TableCell key={column.id}>—</TableCell>
                        }
                      })}
                      
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Link href={`/releases/${release.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {userRole && (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER || userRole === UserRole.A_R || userRole === UserRole.DATA_TEAM) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingReleaseId(editingReleaseId === release.id ? null : release.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Release Editor */}
                    {editingReleaseId === release.id && (
                      <TableRow key={`${release.id}-editor`}>
                        <TableCell colSpan={visibleColumnsArray.length + 2} className="bg-muted/30 p-4">
                          <InlineReleaseEditor
                            release={release}
                            employees={[]} // TODO: Pass employees if needed
                            onSave={() => {
                              setEditingReleaseId(null)
                              router.refresh()
                            }}
                            onCancel={() => setEditingReleaseId(null)}
                          />
                        </TableCell>
                      </TableRow>
                    )}

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
                              {release.assignedA_R && release.assignedA_R.length > 0 && (
                                <div>
                                  <div className="text-muted-foreground text-xs">Assigned A&R</div>
                                  <div className="font-medium">
                                    {release.assignedA_R.map(ar => ar.user.name).join(', ')}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <div className="text-sm font-semibold mb-2">Tracks ({release.tracks.length})</div>
                              <div className="space-y-2">
                                {release.tracks.map((track) => (
                                  <div key={track.id} className="border rounded-lg p-3 bg-background space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                        <div>
                                          <div className="text-muted-foreground text-xs">Song</div>
                                          <div className="font-medium">{track.name}</div>
                                          {/* Display artists only when they exist (via TrackArtists or fallback to release artist) */}
                                          {((track.trackArtists && track.trackArtists.length > 0) || release.artist) && (
                                            <div className="mt-2">
                                              <TrackArtistsDisplay track={track} releaseArtist={release.artist} />
                                            </div>
                                          )}
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
                                        {track.musicProducer && !track.band && (
                                          <div>
                                            <div className="text-muted-foreground text-xs">Producer</div>
                                            <div>{track.musicProducer}</div>
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
                                      {userRole && (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER || userRole === UserRole.A_R || userRole === UserRole.DATA_TEAM) && (
                                        <div className="ml-4">
                                          {editingTrackId === track.id ? (
                                            <InlineTrackEditor
                                              track={track}
                                              onSave={() => {
                                                setEditingTrackId(null)
                                                router.refresh()
                                              }}
                                              onCancel={() => setEditingTrackId(null)}
                                            />
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setEditingTrackId(track.id)}
                                              className="gap-2"
                                            >
                                              <Edit className="w-4 h-4" />
                                              Edit
                                            </Button>
                                          )}
                                        </div>
                                      )}
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
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Professional Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(page) => {
            const params = new URLSearchParams(searchParamsHook.toString())
            params.set('page', page.toString())
            router.push(`/releases?${params.toString()}`)
          }}
          onPageSizeChange={(newPageSize) => {
            const params = new URLSearchParams(searchParamsHook.toString())
            if (newPageSize === 50) {
              params.delete('pageSize')
            } else {
              params.set('pageSize', newPageSize.toString())
            }
            params.set('page', '1') // Reset to first page when changing page size
            router.push(`/releases?${params.toString()}`)
          }}
          pageSizeOptions={[25, 50, 100, 200, 500]}
          showPageSizeSelector={true}
          showJumpToPage={totalPages > 10}
        />
      )}
    </div>
  )
}
