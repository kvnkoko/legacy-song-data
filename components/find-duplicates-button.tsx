'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { ArtistDuplicatesView } from '@/components/artist-duplicates-view'
import { ArtistDuplicate } from '@/lib/artist-duplicate-detection'

interface FindDuplicatesButtonProps {
  duplicates: ArtistDuplicate[]
}

export function FindDuplicatesButton({ duplicates }: FindDuplicatesButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <Search className="w-4 h-4" />
        Find Duplicates ({duplicates.length})
      </Button>
      <ArtistDuplicatesView
        open={open}
        onOpenChange={setOpen}
        duplicates={duplicates}
      />
    </>
  )
}



