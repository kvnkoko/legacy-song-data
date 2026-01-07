'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlatformRequestStatus } from '@prisma/client'

interface PlatformRequestListItemProps {
  request: any
  platformSlug: string
  platformName: string
}

export function PlatformRequestListItem({ request, platformSlug, platformName }: PlatformRequestListItemProps) {
  return (
    <Link
      href={`/platforms/${platformSlug}/${request.id}/update`}
      className="block"
    >
      <div className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer group">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {request.release?.title || 'Untitled'}
            </h3>
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                request.status === PlatformRequestStatus.PENDING
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : request.status === PlatformRequestStatus.UPLOADED
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              {request.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {request.release?.artist.name}
            {request.track && ` • ${request.track.name}`}
          </p>
          {platformName === 'youtube' && request.channelName && (
            <p className="text-sm text-muted-foreground mt-1">
              📺 Channel: {request.channelName}
            </p>
          )}
          {request.uploadLink && (
            <a
              href={request.uploadLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
            >
              View Upload ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
            Click to update →
          </span>
        </div>
      </div>
    </Link>
  )
}




