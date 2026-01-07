'use client'

import { useState, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { ArtistEditDialog } from './artist-edit-dialog'
import { Edit } from 'lucide-react'

interface ArtistProfileContextType {
  openEditDialog: () => void
}

const ArtistProfileContext = createContext<ArtistProfileContextType | null>(null)

export function useArtistProfile() {
  const context = useContext(ArtistProfileContext)
  if (!context) {
    throw new Error('useArtistProfile must be used within ArtistProfileClient')
  }
  return context
}

interface ArtistProfileClientProps {
  artist: {
    id: string
    name: string
    legalName: string | null
    contactEmail: string | null
    contactPhone: string | null
    internalNotes: string | null
  }
  canEdit: boolean
  children: React.ReactNode
}

export function ArtistProfileClient({ artist, canEdit, children }: ArtistProfileClientProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const openEditDialog = () => {
    setEditDialogOpen(true)
  }

  return (
    <ArtistProfileContext.Provider value={{ openEditDialog }}>
      {children}
      {canEdit && (
        <ArtistEditDialog
          artist={artist}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </ArtistProfileContext.Provider>
  )
}

// Export a button component that can be used in the profile page
export function ArtistEditButton({ 
  canEdit
}: { 
  canEdit: boolean
}) {
  const { openEditDialog } = useArtistProfile()
  
  if (!canEdit) return null
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openEditDialog}
      className="gap-2 transition-all hover:bg-primary/10 hover:border-primary/30 hover:shadow-sm"
    >
      <Edit className="w-4 h-4" />
      Edit Profile
    </Button>
  )
}
