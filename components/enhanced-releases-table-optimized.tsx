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
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DateRangePicker } from './date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { UserRole } from '@prisma/client'
import { SearchableFilter } from './searchable-filter'
import { useDebounce } from '@/hooks/use-debounce'

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
  }>
}

interface EnhancedReleasesTableProps {
  releases: Release[]
  total: number
  currentPage: number
  totalPages: number
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
    sortDirection?: 'asc' | 'desc'
  }
  userRole?: UserRole
}

type SortField = 'title' | 'artist' | 'type' | 'artistsDate' | 'legacyDate' | 'tracks' | 'performer' | 'composer' | 'genre'

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

export function EnhancedReleasesTable({ 
  releases, 
  total, 
  currentPage, 
  totalPages,
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    initialSearchParams.sortDirection || 'asc'
  )

  const debouncedSearch = useDebounce(search, 500)

  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER

  // Update URL params when filters change (server-side filtering)
  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParamsHook.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    params.set('page', '1') // Reset to first page on filter change
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
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)
    updateSearchParams({ 
      sortField: field, 
      sortDirection: newDirection 
    })
  }

  // Calculate totals (server-side filtered)
  const totalTracks = releases.reduce((sum, r) => sum + r.tracks.length, 0)
  const totalSingles = releases.filter(r => r.type === 'SINGLE').length
  const totalAlbums = releases.filter(r => r.type === 'ALBUM').length
  const totalUploaded = releases.filter(r => 
    r.platformRequests.some(pr => pr.status === 'UPLOADED')
  ).length

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />
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
    dateRangeEnd

  const visibleColumnsArray = COLUMNS.filter(c => visibleColumns.has(c.id))
  
  // Get unique platforms and statuses from current releases (limited set)
  const platforms = Array.from(new Set(releases.flatMap(r => r.platformRequests.map(pr => pr.platform))))
  const statuses = Array.from(new Set(releases.flatMap(r => r.platformRequests.map(pr => pr.status))))

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Total Releases</div>
          <div className="text-2xl font-bold">{total.toLocaleString()}</div>
          {hasActiveFilters && (
            <div className="text-xs text-muted-foreground mt-1">Showing {releases.length}</div>
          )}
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Total Tracks</div>
          <div className="text-2xl font-bold">{totalTracks.toLocaleString()}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Singles</div>
          <div className="text-2xl font-bold">{totalSingles.toLocaleString()}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Albums</div>
          <div className="text-2xl font-bold">{totalAlbums.toLocaleString()}</div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Uploaded</div>
          <div className="text-2xl font-bold">{totalUploaded.toLocaleString()}</div>
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
                  Track Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-4">
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

      {/* Table - Same as before but without client-side filtering */}
      {/* ... rest of table code remains the same ... */}
      {/* I'll continue with the table rendering in the next part due to length */}
    </div>
  )
}






