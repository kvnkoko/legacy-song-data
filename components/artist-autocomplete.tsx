'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

interface Artist {
  id: string
  name: string
  legalName: string | null
}

interface ArtistAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onArtistSelect?: (artist: Artist | null) => void
  placeholder?: string
  className?: string
  excludeArtistIds?: string[]
}

export function ArtistAutocomplete({
  value,
  onChange,
  onArtistSelect,
  placeholder = 'Enter artist name...',
  className,
  excludeArtistIds = [],
}: ArtistAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Artist[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [displayValue, setDisplayValue] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Load artist name if value is an ID
  useEffect(() => {
    const loadArtistById = async () => {
      // Check if value looks like an ID (cuid format) or is a name
      if (value && value.length > 10 && !value.includes(' ')) {
        try {
          const response = await fetch(`/api/artists/search?q=${encodeURIComponent(value)}`)
          const data = await response.json()
          const artist = data.artists?.find((a: Artist) => a.id === value)
          if (artist) {
            setSelectedArtist(artist)
            setDisplayValue(artist.name)
            return
          }
        } catch (error) {
          console.error('Failed to load artist:', error)
        }
      }
      // If not an ID or artist not found, use value as display
      if (!selectedArtist) {
        setDisplayValue(value)
      }
    }
    loadArtistById()
  }, [value])

  useEffect(() => {
    const searchArtists = async () => {
      if (value.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      try {
        const response = await fetch(`/api/artists/search?q=${encodeURIComponent(value)}`)
        const data = await response.json()
        const filtered = (data.artists || []).filter(
          (artist: Artist) => !excludeArtistIds.includes(artist.id)
        )
        setSuggestions(filtered)
        setShowSuggestions(filtered.length > 0)
      } catch (error) {
        console.error('Failed to search artists:', error)
        setSuggestions([])
      }
    }

    const timeoutId = setTimeout(searchArtists, 300)
    return () => clearTimeout(timeoutId)
  }, [value])

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
    setSelectedArtist(artist)
    setDisplayValue(artist.name)
    onChange(artist.id)
    setShowSuggestions(false)
    if (onArtistSelect) {
      onArtistSelect(artist)
    }
  }

  const handleClear = () => {
    setSelectedArtist(null)
    setDisplayValue('')
    onChange('')
    setShowSuggestions(false)
    if (onArtistSelect) {
      onArtistSelect(null)
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          value={displayValue}
          onChange={(e) => {
            setDisplayValue(e.target.value)
            setSelectedArtist(null)
            onChange(e.target.value)
          }}
          placeholder={placeholder}
          className="pr-10"
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
        />
        {selectedArtist && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((artist) => (
            <button
              key={artist.id}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
              onClick={() => handleSelectArtist(artist)}
            >
              <div>
                <div className="font-medium">{artist.name}</div>
                {artist.legalName && (
                  <div className="text-xs text-muted-foreground">{artist.legalName}</div>
                )}
              </div>
              {selectedArtist?.id === artist.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}




