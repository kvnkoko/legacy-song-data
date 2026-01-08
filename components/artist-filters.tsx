'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { ArtistAlphabetNav } from './artist-alphabet-nav'

interface ArtistFiltersProps {
  currentLetter?: string
  letterCounts?: Record<string, number>
}

export function ArtistFilters({ currentLetter, letterCounts }: ArtistFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  
  // Debounce search input
  const debouncedSearch = useDebounce(search, 300)

  // Auto-apply search when debounced value changes
  useEffect(() => {
    // Only update if the value actually changed from the URL
    const currentSearch = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearch) {
      const params = new URLSearchParams(searchParams.toString())
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      } else {
        params.delete('search')
      }
      // Reset to first page when searching
      params.set('page', '1')
      // Use replace instead of push to avoid adding to history on every keystroke
      router.replace(`/artists?${params.toString()}`, { scroll: false })
    }
    // Only depend on debouncedSearch - searchParams and router are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const clearFilters = () => {
    setSearch('')
    router.push('/artists')
  }

  const hasActiveFilters = search || currentLetter

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search artists by name, legal name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      {/* Alphabet Navigation */}
      <div className="pt-4 border-t border-border/50">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground mb-1">Browse by Letter</h3>
          <p className="text-xs text-muted-foreground">Click a letter to filter artists</p>
        </div>
        <ArtistAlphabetNav 
          currentLetter={currentLetter} 
          letterCounts={letterCounts}
        />
      </div>
    </div>
  )
}



