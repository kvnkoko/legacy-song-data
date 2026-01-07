'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Search, User, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Artist {
  id: string
  name: string
  legalName: string | null
}

interface ArtistMultiSelectProps {
  value: string[] // Array of artist IDs
  onChange: (artistIds: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowCreate?: boolean // Allow creating new artists
}

export function ArtistMultiSelect({
  value,
  onChange,
  placeholder = 'Search and select artists...',
  className,
  disabled = false,
  allowCreate = true, // Default to true to allow creating new artists
}: ArtistMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Artist[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateOption, setShowCreateOption] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Load selected artists by IDs
  useEffect(() => {
    const loadSelectedArtists = async () => {
      if (value.length === 0) {
        setSelectedArtists([])
        return
      }

      try {
        const response = await fetch(`/api/artists?ids=${value.join(',')}`)
        if (response.ok) {
          const data = await response.json()
          setSelectedArtists(data.artists || [])
        }
      } catch (error) {
        console.error('Failed to load selected artists:', error)
      }
    }

    loadSelectedArtists()
  }, [value])

  // Search for artists
  useEffect(() => {
    const searchArtists = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        setShowCreateOption(false)
        return
      }

      try {
        const response = await fetch(`/api/artists/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await response.json()
        // Filter out already selected artists
        const filtered = (data.artists || []).filter(
          (artist: Artist) => !value.includes(artist.id)
        )
        setSuggestions(filtered)
        
        // Show create option if:
        // 1. Allow create is enabled
        // 2. Search query is at least 2 characters
        // 3. No exact match found in suggestions
        const exactMatch = filtered.some(
          (artist: Artist) => artist.name.toLowerCase() === searchQuery.toLowerCase().trim()
        )
        setShowCreateOption(allowCreate && !exactMatch && searchQuery.trim().length >= 2)
        setShowSuggestions(filtered.length > 0 || (allowCreate && !exactMatch && searchQuery.trim().length >= 2))
      } catch (error) {
        console.error('Failed to search artists:', error)
        setSuggestions([])
        setShowCreateOption(allowCreate && searchQuery.trim().length >= 2)
        setShowSuggestions(allowCreate && searchQuery.trim().length >= 2)
      }
    }

    const timeoutId = setTimeout(searchArtists, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, value, allowCreate])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectArtist = (artist: Artist) => {
    const newValue = [...value, artist.id]
    onChange(newValue)
    setSearchQuery('')
    setShowSuggestions(false)
    setShowCreateOption(false)
    inputRef.current?.focus()
  }

  const handleCreateArtist = async () => {
    const artistName = searchQuery.trim()
    if (!artistName || artistName.length < 2) {
      toast({
        title: 'Invalid name',
        description: 'Artist name must be at least 2 characters',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: artistName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create artist')
      }

      // Add the newly created artist
      if (data.artist) {
        handleSelectArtist(data.artist)
        toast({
          title: 'Success',
          description: `Created artist "${data.artist.name}"`,
        })
      }
    } catch (error: any) {
      console.error('Failed to create artist:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create artist',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRemoveArtist = (artistId: string) => {
    const newValue = value.filter(id => id !== artistId)
    onChange(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && searchQuery === '' && value.length > 0) {
      // Remove last artist when backspace is pressed on empty input
      handleRemoveArtist(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setShowCreateOption(false)
    } else if (e.key === 'Enter' && showCreateOption && searchQuery.trim().length >= 2) {
      // Create new artist on Enter if create option is shown
      e.preventDefault()
      handleCreateArtist()
    }
  }

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="flex flex-wrap gap-2 min-h-[2.75rem] p-2 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {/* Selected Artists */}
        {selectedArtists.map((artist, index) => (
          <Badge
            key={artist.id}
            variant="secondary"
            className="flex items-center gap-1.5 px-2 py-1 pr-1 text-sm font-medium leading-relaxed"
          >
            <User className="w-3 h-3" />
            <span className={index === 0 ? 'font-semibold' : ''}>
              {artist.name}
              {index === 0 && (
                <span className="ml-1 text-xs text-muted-foreground">(Primary)</span>
              )}
            </span>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive rounded-full"
                onClick={() => handleRemoveArtist(artist.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </Badge>
        ))}

        {/* Search Input */}
        <div className="flex-1 min-w-[120px]">
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            placeholder={selectedArtists.length === 0 ? placeholder : 'Add another artist...'}
            disabled={disabled}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 min-w-[120px]"
          />
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || showCreateOption) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Existing Artists */}
          {suggestions.map((artist) => (
            <button
              key={artist.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between leading-relaxed"
              onClick={() => handleSelectArtist(artist)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate leading-relaxed pb-0.5">{artist.name}</div>
                {artist.legalName && (
                  <div className="text-xs text-muted-foreground truncate leading-relaxed pt-0.5">
                    {artist.legalName}
                  </div>
                )}
              </div>
              <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
            </button>
          ))}
          
          {/* Create New Artist Option */}
          {showCreateOption && (
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between leading-relaxed border-t border-border"
              onClick={handleCreateArtist}
              disabled={isCreating}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate leading-relaxed pb-0.5">
                    Create &quot;{searchQuery.trim()}&quot;
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                    {isCreating ? 'Creating...' : 'Press Enter or click to create new artist'}
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        {allowCreate 
          ? 'First artist is primary, others are secondary. Type to search or create new artist. Press Enter to create.'
          : 'First artist is primary, others are secondary. Press Backspace to remove last artist.'}
      </p>
    </div>
  )
}

