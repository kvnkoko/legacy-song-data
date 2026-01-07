'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Merge, X } from 'lucide-react'
import { ArtistMergeDialog } from '@/components/artist-merge-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ArtistDuplicate {
  artist1: {
    id: string
    name: string
    legalName: string | null
  }
  artist2: {
    id: string
    name: string
    legalName: string | null
  }
  similarity: number
  reason: 'name_match' | 'legal_name_match' | 'similar_name' | 'similar_legal_name'
}

interface ArtistDuplicatesViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicates: ArtistDuplicate[]
  onMergeSuccess?: () => void
}

export function ArtistDuplicatesView({
  open,
  onOpenChange,
  duplicates,
  onMergeSuccess,
}: ArtistDuplicatesViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [filterReason, setFilterReason] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [selectedSourceArtist, setSelectedSourceArtist] = useState<{
    id: string
    name: string
    legalName: string | null
    releases?: { id: string }[]
    trackArtists?: { id: string }[]
  } | null>(null)

  const filteredDuplicates = duplicates.filter(dup => {
    if (filterReason !== 'all' && dup.reason !== filterReason) return false
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        dup.artist1.name.toLowerCase().includes(searchLower) ||
        dup.artist2.name.toLowerCase().includes(searchLower) ||
        dup.artist1.legalName?.toLowerCase().includes(searchLower) ||
        dup.artist2.legalName?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const handleMerge = async (duplicate: ArtistDuplicate) => {
    // Fetch artist data for merge preview
    try {
      const response = await fetch(`/api/artists/${duplicate.artist1.id}/merge-preview`)
      if (response.ok) {
        const data = await response.json()
        setSelectedSourceArtist({
          id: duplicate.artist1.id,
          name: duplicate.artist1.name,
          legalName: duplicate.artist1.legalName,
          releases: data.releases || [],
          trackArtists: [],
        })
      } else {
        // Fallback if preview fails
        setSelectedSourceArtist({
          id: duplicate.artist1.id,
          name: duplicate.artist1.name,
          legalName: duplicate.artist1.legalName,
          releases: [],
          trackArtists: [],
        })
      }
    } catch (error) {
      // Fallback on error
      setSelectedSourceArtist({
        id: duplicate.artist1.id,
        name: duplicate.artist1.name,
        legalName: duplicate.artist1.legalName,
        releases: [],
        trackArtists: [],
      })
    }
    setMergeDialogOpen(true)
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'name_match':
        return 'Exact Name Match'
      case 'legal_name_match':
        return 'Legal Name Match'
      case 'similar_name':
        return 'Similar Name'
      case 'similar_legal_name':
        return 'Similar Legal Name'
      default:
        return reason
    }
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity === 1.0) return 'destructive'
    if (similarity >= 0.9) return 'default'
    if (similarity >= 0.85) return 'secondary'
    return 'outline'
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Potential Duplicate Artists
            </DialogTitle>
            <DialogDescription>
              Found {duplicates.length} potential duplicate pair{duplicates.length !== 1 ? 's' : ''}. 
              Review and merge duplicate artists to keep your database clean.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search duplicates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterReason} onValueChange={setFilterReason}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="name_match">Exact Name Match</SelectItem>
                  <SelectItem value="legal_name_match">Legal Name Match</SelectItem>
                  <SelectItem value="similar_name">Similar Name</SelectItem>
                  <SelectItem value="similar_legal_name">Similar Legal Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duplicates Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist 1</TableHead>
                    <TableHead>Artist 2</TableHead>
                    <TableHead>Similarity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDuplicates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No duplicates found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDuplicates.map((dup, index) => (
                      <TableRow key={`${dup.artist1.id}-${dup.artist2.id}-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{dup.artist1.name}</div>
                            {dup.artist1.legalName && (
                              <div className="text-xs text-muted-foreground">
                                {dup.artist1.legalName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{dup.artist2.name}</div>
                            {dup.artist2.legalName && (
                              <div className="text-xs text-muted-foreground">
                                {dup.artist2.legalName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSimilarityColor(dup.similarity) as any}>
                            {Math.round(dup.similarity * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getReasonLabel(dup.reason)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMerge(dup)}
                            className="gap-2"
                          >
                            <Merge className="w-4 h-4" />
                            Merge
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredDuplicates.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Showing {filteredDuplicates.length} of {duplicates.length} duplicate pairs
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      {selectedSourceArtist && (
        <ArtistMergeDialog
          open={mergeDialogOpen}
          onOpenChange={(open) => {
            setMergeDialogOpen(open)
            if (!open) {
              setSelectedSourceArtist(null)
            }
          }}
          sourceArtist={selectedSourceArtist}
          onSuccess={() => {
            setMergeDialogOpen(false)
            setSelectedSourceArtist(null)
            router.refresh()
            onMergeSuccess?.()
          }}
        />
      )}
    </>
  )
}

