'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Settings2,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  FileEdit
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { UserRole } from '@prisma/client'
import { ReleaseQuickEditDialog } from '@/components/release-quick-edit-dialog'

// Helper function to format platform tag
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
    artist: {
      id: string
      name: string
      legalName: string | null
    }
  }>
  assignedA_R?: {
    id: string
    user: {
      id: string
      name: string | null
      email: string
    }
  } | null
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

interface Stats {
  totalReleases: number
  totalTracks: number
  totalSingles: number
  totalAlbums: number
  totalUploaded: number
}

interface ArReleasesTableProps {
  releases: Release[]
  total: number
  currentPage: number
  totalPages: number
  stats: Stats
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
    assignedAR?: string
    copyrightStatus?: string
    videoType?: string
    artist?: string
    sortField?: string
    sortDirection?: 'asc' | 'desc'
  }
  userRole?: UserRole
}

const COLUMNS = [
  { id: 'title', label: 'Release Title', defaultVisible: true },
  { id: 'artist', label: 'Artist', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'artistsDate', label: "Artist's Date", defaultVisible: true, sortable: true },
  { id: 'legacyDate', label: 'Legacy Date', defaultVisible: true, sortable: true },
  { id: 'assignedAR', label: 'Assigned A&R', defaultVisible: true },
  { id: 'platforms', label: 'Platforms', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
] as const

export function ArReleasesTable({ 
  releases, 
  total, 
  currentPage, 
  totalPages,
  stats,
  searchParams,
  userRole
}: ArReleasesTableProps) {
  const router = useRouter()
  const params = useSearchParams()
  const [search, setSearch] = useState(searchParams.search || '')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.id))
  )
  const [quickEditRelease, setQuickEditRelease] = useState<Release | null>(null)
  const [employees, setEmployees] = useState<any[]>([])

  // Fetch A&R employees for quick edit
  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (data.employees) {
          // Filter to only A&R, Admin, and Manager roles
          setEmployees(data.employees.filter((e: any) => {
            const role = e.user?.role
            return role === 'A_R' || role === 'ADMIN' || role === 'MANAGER'
          }))
        }
      })
      .catch(err => console.error('Failed to fetch employees:', err))
  }, [])

  const handleSort = (field: string) => {
    const currentSort = searchParams.sortField
    const currentDir = searchParams.sortDirection || 'asc'
    
    const newParams = new URLSearchParams(params.toString())
    if (currentSort === field) {
      newParams.set('sortDirection', currentDir === 'asc' ? 'desc' : 'asc')
    } else {
      newParams.set('sortField', field)
      newParams.set('sortDirection', 'asc')
    }
    router.push(`/ar/releases?${newParams.toString()}`)
  }

  const getSortIcon = (field: string) => {
    if (searchParams.sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
    return searchParams.sortDirection === 'desc'
      ? <ArrowDown className="w-3 h-3 ml-1" />
      : <ArrowUp className="w-3 h-3 ml-1" />
  }

  const updateURLParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(params.toString())
    if (value && value !== 'all') {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    newParams.set('page', '1') // Reset to first page
    router.push(`/ar/releases?${newParams.toString()}`)
  }

  const handleSearch = () => {
    const newParams = new URLSearchParams(params.toString())
    if (search) {
      newParams.set('search', search)
    } else {
      newParams.delete('search')
    }
    newParams.set('page', '1')
    router.push(`/ar/releases?${newParams.toString()}`)
  }

  const visibleColumnsArray = COLUMNS.filter(c => visibleColumns.has(c.id))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search releases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2">
          <Button
            variant={searchParams.startDate && searchParams.endDate ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const tomorrow = new Date(today)
              tomorrow.setDate(tomorrow.getDate() + 1)
              const newParams = new URLSearchParams(params.toString())
              newParams.set('startDate', today.toISOString().split('T')[0])
              newParams.set('endDate', tomorrow.toISOString().split('T')[0])
              newParams.set('page', '1')
              router.push(`/ar/releases?${newParams.toString()}`)
            }}
          >
            Today
          </Button>
          <Button
            variant={searchParams.startDate && !searchParams.endDate ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const weekAgo = new Date(today)
              weekAgo.setDate(weekAgo.getDate() - 7)
              const newParams = new URLSearchParams(params.toString())
              newParams.set('startDate', weekAgo.toISOString().split('T')[0])
              newParams.set('endDate', today.toISOString().split('T')[0])
              newParams.set('page', '1')
              router.push(`/ar/releases?${newParams.toString()}`)
            }}
          >
            This Week
          </Button>
          <Button
            variant={searchParams.assignedAR === 'unassigned' ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const newParams = new URLSearchParams(params.toString())
              newParams.set('assignedAR', 'unassigned')
              newParams.set('page', '1')
              router.push(`/ar/releases?${newParams.toString()}`)
            }}
          >
            Unassigned
          </Button>
        </div>

        {/* Quick Sort Buttons for Dates */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('artistsDate')}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Artist&apos;s Date
            {getSortIcon('artistsDate')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('legacyDate')}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Legacy Date
            {getSortIcon('legacyDate')}
          </Button>
        </div>

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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Releases</div>
          <div className="text-2xl font-bold">{stats.totalReleases}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Tracks</div>
          <div className="text-2xl font-bold">{stats.totalTracks}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Singles</div>
          <div className="text-2xl font-bold">{stats.totalSingles}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Albums</div>
          <div className="text-2xl font-bold">{stats.totalAlbums}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Uploaded</div>
          <div className="text-2xl font-bold">{stats.totalUploaded}</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumnsArray.map((column) => (
                <TableHead key={column.id}>
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.id === 'artistsDate' ? 'artistsDate' : column.id === 'legacyDate' ? 'legacyDate' : '')}
                      className="flex items-center hover:text-primary transition-colors"
                    >
                      {column.label}
                      {getSortIcon(column.id === 'artistsDate' ? 'artistsDate' : column.id === 'legacyDate' ? 'legacyDate' : '')}
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {releases.map((release) => (
              <TableRow key={release.id}>
                {visibleColumnsArray.map((column) => {
                  switch (column.id) {
                    case 'title':
                      return (
                        <TableCell key={column.id} className="py-3">
                          <Link
                            href={`/releases/${release.id}`}
                            className="font-medium hover:text-primary transition-colors leading-relaxed"
                          >
                            {release.title}
                          </Link>
                        </TableCell>
                      )
                    case 'artist':
                      return (
                        <TableCell key={column.id} className="py-3 leading-relaxed">
                          {release.artist.name}
                          {release.releaseArtists && release.releaseArtists.length > 0 && (
                            <span className="text-muted-foreground ml-1">
                              +{release.releaseArtists.length}
                            </span>
                          )}
                        </TableCell>
                      )
                    case 'type':
                      return (
                        <TableCell key={column.id} className="py-3">
                          <Badge variant="outline" className="leading-relaxed">
                            {release.type}
                          </Badge>
                        </TableCell>
                      )
                    case 'artistsDate':
                      return (
                        <TableCell key={column.id} className="py-3 leading-relaxed">
                          {release.artistsChosenDate 
                            ? formatDate(release.artistsChosenDate)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      )
                    case 'legacyDate':
                      return (
                        <TableCell key={column.id} className="py-3 leading-relaxed">
                          {release.legacyReleaseDate 
                            ? formatDate(release.legacyReleaseDate)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      )
                    case 'assignedAR':
                      return (
                        <TableCell key={column.id} className="py-3 leading-relaxed">
                          {release.assignedA_R?.user.name || 
                           release.assignedA_R?.user.email || 
                           <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                      )
                    case 'platforms':
                      return (
                        <TableCell key={column.id} className="py-3">
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
                                className="text-xs leading-relaxed"
                              >
                                {formatPlatformTag(pr.platform, pr.channelName)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      )
                    case 'actions':
                      return (
                        <TableCell key={column.id}>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setQuickEditRelease(release)}
                              className="gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Quick Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="gap-1"
                            >
                              <Link href={`/releases/${release.id}/edit`}>
                                <FileEdit className="w-3 h-3" />
                                Full Edit
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      )
                    default:
                      return <TableCell key={column.id}>—</TableCell>
                  }
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, total)} of {total} releases
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newParams = new URLSearchParams(params.toString())
              newParams.set('page', String(Math.max(1, currentPage - 1)))
              router.push(`/ar/releases?${newParams.toString()}`)
            }}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newParams = new URLSearchParams(params.toString())
              newParams.set('page', String(Math.min(totalPages, currentPage + 1)))
              router.push(`/ar/releases?${newParams.toString()}`)
            }}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Edit Dialog */}
      {quickEditRelease && (
        <ReleaseQuickEditDialog
          open={!!quickEditRelease}
          onOpenChange={(open) => !open && setQuickEditRelease(null)}
          release={quickEditRelease}
          employees={employees}
          onSuccess={() => {
            setQuickEditRelease(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

