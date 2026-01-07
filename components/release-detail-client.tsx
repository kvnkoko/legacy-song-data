'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InlineReleaseEditor } from '@/components/inline-release-editor'
import { InlineTrackEditor } from '@/components/inline-track-editor'
import { Edit, X } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

interface ReleaseDetailClientProps {
  release: any
  userRole: UserRole
  employees?: Array<{ id: string; user: { name: string | null; email: string } }>
}

export function ReleaseDetailClient({ release, userRole, employees = [] }: ReleaseDetailClientProps) {
  const [editingRelease, setEditingRelease] = useState(false)

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER || userRole === UserRole.A_R || userRole === UserRole.DATA_TEAM

  return (
    <>
      {/* Release Edit Button */}
      {canEdit && (
        <div className="mb-4">
          {!editingRelease ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRelease(true)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Release
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Editing Release</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingRelease(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <InlineReleaseEditor
                release={release}
                employees={employees}
                onSave={() => {
                  setEditingRelease(false)
                  window.location.reload()
                }}
                onCancel={() => setEditingRelease(false)}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}

// Client component for track editing
export function TrackEditButton({ track }: { track: any }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="mt-4">
        <InlineTrackEditor
          track={track}
          onSave={() => {
            setEditing(false)
            window.location.reload()
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setEditing(true)}
      className="gap-2"
    >
      <Edit className="w-4 h-4" />
      Edit
    </Button>
  )
}

// Export a function to display artists for a track
export function TrackArtistsDisplay({ track, releaseArtist }: { track: any; releaseArtist?: any }) {
  const allArtists: any[] = []

  if (track.trackArtists && track.trackArtists.length > 0) {
    // Use TrackArtist relationships - primary first, then secondary
    const primaryArtists = track.trackArtists
      .filter((ta: any) => ta.isPrimary)
      .map((ta: any) => ta.artist)
    const secondaryArtists = track.trackArtists
      .filter((ta: any) => !ta.isPrimary)
      .map((ta: any) => ta.artist)
    allArtists.push(...primaryArtists, ...secondaryArtists)
  } else if (releaseArtist) {
    // Fallback to release artist if no TrackArtist entries
    allArtists.push(releaseArtist)
  }

  if (allArtists.length === 0) {
    return null
  }

  // Display primary artist always, secondary artists only when they exist
  const primaryArtist = allArtists[0]
  const secondaryArtists = allArtists.slice(1)
  
  if (!primaryArtist) {
    return null
  }
  
  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-muted-foreground mb-1">Artist{secondaryArtists.length > 0 ? 's' : ''}</div>
      <div className="flex flex-wrap gap-1">
        <Badge 
          key={primaryArtist.id} 
          variant="default"
          className="font-bold"
        >
          {primaryArtist.name}
        </Badge>
        {/* Only show secondary artists if they exist */}
        {secondaryArtists.length > 0 && secondaryArtists.map((artist) => (
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
}
