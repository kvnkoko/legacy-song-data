'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Hash } from 'lucide-react'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface ArtistAlphabetNavProps {
  currentLetter?: string
  letterCounts?: Record<string, number>
  className?: string
}

export function ArtistAlphabetNav({ 
  currentLetter, 
  letterCounts = {},
  className 
}: ArtistAlphabetNavProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLetterClick = (letter: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (currentLetter === letter) {
      // If clicking the same letter, clear the filter
      params.delete('letter')
    } else {
      params.set('letter', letter)
      // Reset to first page when changing letter
      params.set('page', '1')
    }
    
    router.push(`/artists?${params.toString()}`, { scroll: false })
  }

  const handleAllClick = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('letter')
    params.set('page', '1')
    router.push(`/artists?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* All Button */}
      <div className="flex items-center gap-2">
        <Button
          variant={!currentLetter ? 'default' : 'outline'}
          size="sm"
          onClick={handleAllClick}
          className={cn(
            'h-9 px-4 text-sm font-semibold transition-all duration-200',
            !currentLetter && 'shadow-md'
          )}
        >
          All Artists
        </Button>
        {letterCounts && Object.values(letterCounts).reduce((a, b) => a + b, 0) > 0 && (
          <span className="text-sm text-muted-foreground font-medium">
            ({Object.values(letterCounts).reduce((a, b) => a + b, 0)} total)
          </span>
        )}
      </div>

      {/* Alphabet Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-13 gap-2">
        {ALPHABET.map((letter) => {
          const count = letterCounts[letter] || 0
          const isActive = currentLetter === letter
          const hasArtists = count > 0
          
          return (
            <button
              key={letter}
              onClick={() => hasArtists && handleLetterClick(letter)}
              disabled={!hasArtists && !isActive}
              className={cn(
                'group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 min-h-[64px]',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isActive 
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                  : hasArtists
                    ? 'bg-card hover:bg-accent border-border hover:border-primary/50 hover:shadow-sm cursor-pointer'
                    : 'bg-muted/30 border-border/50 opacity-50 cursor-not-allowed',
                hasArtists && !isActive && 'hover:scale-105'
              )}
              title={hasArtists ? `${count} artist${count !== 1 ? 's' : ''} starting with "${letter}"` : `No artists starting with "${letter}"`}
            >
              {/* Letter */}
              <span className={cn(
                'text-base sm:text-lg font-bold mb-0.5 sm:mb-1 transition-colors leading-none',
                isActive ? 'text-primary-foreground' : 'text-foreground'
              )}>
                {letter}
              </span>
              
              {/* Count */}
              {hasArtists && (
                <span className={cn(
                  'text-[10px] sm:text-xs font-semibold transition-colors leading-tight',
                  isActive 
                    ? 'text-primary-foreground/90' 
                    : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  {count > 999 ? '999+' : count.toLocaleString()}
                </span>
              )}
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg ring-2 ring-primary/20 pointer-events-none" />
              )}
            </button>
          )
        })}
      </div>

      {/* Numbers/Symbols Button */}
      {letterCounts['#'] !== undefined && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <button
            onClick={() => letterCounts['#'] > 0 && handleLetterClick('#')}
            disabled={!letterCounts['#'] && currentLetter !== '#'}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              currentLetter === '#'
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : letterCounts['#'] > 0
                  ? 'bg-card hover:bg-accent border-border hover:border-primary/50 hover:shadow-sm cursor-pointer'
                  : 'bg-muted/30 border-border/50 opacity-50 cursor-not-allowed',
              letterCounts['#'] > 0 && currentLetter !== '#' && 'hover:scale-105'
            )}
            title={letterCounts['#'] ? `${letterCounts['#']} artist${letterCounts['#'] !== 1 ? 's' : ''} starting with numbers/symbols` : 'No artists starting with numbers/symbols'}
          >
            <Hash className={cn(
              'w-4 h-4 transition-colors',
              currentLetter === '#' ? 'text-primary-foreground' : 'text-foreground'
            )} />
            <span className={cn(
              'text-sm font-semibold transition-colors',
              currentLetter === '#' ? 'text-primary-foreground' : 'text-foreground'
            )}>
              Numbers & Symbols
            </span>
            {letterCounts['#'] > 0 && (
              <span className={cn(
                'ml-auto text-xs font-semibold px-2 py-0.5 rounded-full transition-colors',
                currentLetter === '#'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}>
                {letterCounts['#'] > 999 ? '999+' : letterCounts['#'].toLocaleString()}
              </span>
            )}
            {currentLetter === '#' && (
              <div className="absolute inset-0 rounded-lg ring-2 ring-primary/20 pointer-events-none" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
