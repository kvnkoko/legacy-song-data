'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArtistMergeDialog } from '@/components/artist-merge-dialog'
import { Merge } from 'lucide-react'

interface Artist {
  id: string
  name: string
  legalName: string | null
  releases?: { id: string }[]
  trackArtists?: { id: string }[]
  _count?: {
    releases?: number
    trackArtists?: number
  }
}

interface ArtistMergeButtonProps {
  artist: Artist
}

export function ArtistMergeButton({ artist }: ArtistMergeButtonProps) {
  const [open, setOpen] = useState(false)

  const releasesCount = artist._count?.releases || artist.releases?.length || 0
  const tracksCount = artist._count?.trackArtists || artist.trackArtists?.length || 0

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Merge className="w-4 h-4" />
        Merge
      </Button>
      <ArtistMergeDialog
        open={open}
        onOpenChange={setOpen}
        sourceArtist={{
          id: artist.id,
          name: artist.name,
          legalName: artist.legalName,
          releases: artist.releases || Array(releasesCount).fill({ id: '' }),
          trackArtists: artist.trackArtists || Array(tracksCount).fill({ id: '' }),
        }}
      />
    </>
  )
}



