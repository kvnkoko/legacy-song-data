'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ReleaseType } from '@prisma/client'
import { Music, User } from 'lucide-react'
import { memo } from 'react'

interface Release {
  id: string
  title: string
  type: ReleaseType | string
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

interface CalendarReleaseCardProps {
  release: Release
  displayFields: {
    showTitle: boolean
    showArtist: boolean
    showType: boolean
    showTrackCount: boolean
    showPlatformStatus: boolean
    showArtistsDate: boolean
    showCopyright: boolean
  }
  compact?: boolean
}

export const CalendarReleaseCard = memo(function CalendarReleaseCard({ 
  release, 
  displayFields, 
  compact = false 
}: CalendarReleaseCardProps) {
  const getTypeColor = (type: string) => {
    return type === 'ALBUM' 
      ? 'bg-purple-100/80 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200 border-purple-200 dark:border-purple-700'
      : 'bg-blue-100/80 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 border-blue-200 dark:border-blue-700'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700'
      case 'UPLOADED':
        return 'bg-green-100/80 text-green-800 dark:bg-green-900/80 dark:text-green-200 border-green-200 dark:border-green-700'
      case 'REJECTED':
        return 'bg-red-100/80 text-red-800 dark:bg-red-900/80 dark:text-red-200 border-red-200 dark:border-red-700'
      default:
        return 'bg-gray-100/80 text-gray-800 dark:bg-gray-900/80 dark:text-gray-200 border-gray-200 dark:border-gray-700'
    }
  }

  const formatPlatformTag = (platform: string, channelName: string | null | undefined): string => {
    const platformCodes: Record<string, string> = {
      youtube: 'yt',
      flow: 'flow',
      ringtunes: 'rt',
      international_streaming: 'is',
      facebook: 'fb',
      tiktok: 'tt',
    }
    
    const platformCode = platformCodes[platform.toLowerCase()] || platform.substring(0, 4)
    
    if (channelName && channelName.trim()) {
      const channelSlug = channelName
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
      return `${platformCode}-${channelSlug}`
    }
    
    return platformCode
  }

  return (
    <Link
      href={`/releases/${release.id}`}
      className={cn(
        "block rounded-lg p-2.5 transition-all duration-150 ease-out",
        "border border-border/40 bg-card/60",
        "hover:bg-gradient-to-br hover:from-primary/10 hover:to-primary/5",
        "hover:border-primary/40 hover:shadow-sm",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <div className="space-y-1.5">
        {displayFields.showTitle && (
          <div className="font-semibold truncate text-foreground hover:text-primary transition-colors duration-150 leading-relaxed pb-0.5">
            {release.title}
          </div>
        )}
        
        {displayFields.showArtist && (
          <div className="flex items-center gap-1.5 text-muted-foreground truncate leading-relaxed">
            <User className="w-3 h-3 flex-shrink-0 text-primary/60" />
            <span className="truncate text-xs font-medium leading-relaxed">{release.artist.name}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {displayFields.showType && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0.5 font-semibold border",
                getTypeColor(release.type)
              )}
            >
              {release.type}
            </Badge>
          )}
          
          {displayFields.showTrackCount && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0.5 font-semibold border-primary/30 bg-primary/5 text-primary"
            >
              <Music className="w-2.5 h-2.5 mr-1" />
              {release.tracks.length}
            </Badge>
          )}

          {displayFields.showPlatformStatus && release.platformRequests && release.platformRequests.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {release.platformRequests.slice(0, 3).map((pr, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1 py-0.5 font-semibold border",
                    getStatusColor(pr.status)
                  )}
                  title={`${pr.platform}: ${pr.status}`}
                >
                  {formatPlatformTag(pr.platform, pr.channelName)}
                </Badge>
              ))}
              {release.platformRequests.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0.5 font-semibold border-border/40">
                  +{release.platformRequests.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
})
