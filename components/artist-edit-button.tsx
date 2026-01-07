'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'

interface ArtistEditButtonProps {
  artistId: string
}

export function ArtistEditButton({ artistId }: ArtistEditButtonProps) {
  return (
    <Link href={`/admin/artists/${artistId}/edit`}>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Pencil className="w-4 h-4" />
      </Button>
    </Link>
  )
}


