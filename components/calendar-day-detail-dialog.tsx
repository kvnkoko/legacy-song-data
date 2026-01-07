'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ExternalLink, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Release {
  id: string
  title: string
  type: string
  artist: {
    id: string
    name: string
  }
  tracks: Array<{ id: string }>
  platformRequests?: Array<{
    platform: string
    status: string
    channelName: string | null
  }>
  artistsChosenDate?: Date | null
  copyrightStatus?: string | null
}

interface CalendarDayDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  releases: Release[]
  displayFields: {
    showTitle: boolean
    showArtist: boolean
    showType: boolean
    showTrackCount: boolean
    showPlatformStatus: boolean
    showArtistsDate: boolean
    showCopyright: boolean
  }
  onNavigateDay?: (direction: 'prev' | 'next') => void
}

export function CalendarDayDetailDialog({
  open,
  onOpenChange,
  date,
  releases,
  displayFields,
  onNavigateDay,
}: CalendarDayDetailDialogProps) {
  if (!date) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {formatDate(date)}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm font-medium">
                  {releases.length} release{releases.length !== 1 ? 's' : ''} scheduled for this day
                </DialogDescription>
              </div>
            </div>
            {onNavigateDay && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onNavigateDay('prev')}
                  className="h-9 w-9 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onNavigateDay('next')}
                  className="h-9 w-9 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {releases.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium">No releases scheduled for this day</p>
              <p className="text-sm mt-1">Check other dates or add new releases</p>
            </div>
          ) : (
            releases.map((release) => (
              <div
                key={release.id}
                className="border border-border/50 rounded-xl p-5 bg-gradient-to-br from-card/50 to-card/30 hover:from-primary/5 hover:to-primary/10 hover:border-primary/40 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Link
                          href={`/releases/${release.id}`}
                          className="text-xl font-bold tracking-tight hover:text-primary transition-colors duration-200 block"
                        >
                          {release.title}
                        </Link>
                        <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
                          <Link
                            href={`/profiles/artist/${release.artist.id}`}
                            className="font-medium hover:text-primary transition-colors duration-200"
                          >
                            {release.artist.name}
                          </Link>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="font-semibold">{release.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-semibold px-2.5 py-1">
                          {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                        </Badge>
                        {release.artistsChosenDate && displayFields.showArtistsDate && (
                          <Badge variant="outline" className="border-primary/20 bg-muted/50 font-medium px-2.5 py-1">
                            Artist's Date: {formatDate(release.artistsChosenDate)}
                          </Badge>
                        )}
                        {release.copyrightStatus && displayFields.showCopyright && (
                          <Badge variant="outline" className="border-primary/20 bg-muted/50 font-medium px-2.5 py-1">
                            {release.copyrightStatus}
                          </Badge>
                        )}
                        {release.platformRequests && release.platformRequests.length > 0 && displayFields.showPlatformStatus && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {release.platformRequests.map((pr, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={cn(
                                  "font-semibold px-2.5 py-1 border",
                                  pr.status === 'PENDING' && "bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700",
                                  pr.status === 'UPLOADED' && "bg-green-100/80 text-green-800 dark:bg-green-900/80 dark:text-green-200 border-green-200 dark:border-green-700",
                                  pr.status === 'REJECTED' && "bg-red-100/80 text-red-800 dark:bg-red-900/80 dark:text-red-200 border-red-200 dark:border-red-700"
                                )}
                              >
                                {pr.platform}: {pr.status}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Link href={`/releases/${release.id}`}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
