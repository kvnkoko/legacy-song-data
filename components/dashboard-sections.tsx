'use client'

import { useState } from 'react'
import { StatsCard } from '@/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Database, Users, Music, Calendar, Youtube, Facebook, Music2, Globe, Radio, CheckCircle2, Clock, Filter } from 'lucide-react'
import Link from 'next/link'

interface PlatformStats {
  platform: string
  displayName: string
  icon: string
  pending: number
  approved: number
}

interface DashboardSectionsProps {
  totalReleases: number
  totalArtists: number
  totalTracks: number
  recentReleasesCount: number
  platformStats: PlatformStats[]
}

export function DashboardSections({
  totalReleases,
  totalArtists,
  totalTracks,
  recentReleasesCount,
  platformStats,
}: DashboardSectionsProps) {
  const [showOverview, setShowOverview] = useState(true)
  const [showPlatformRequests, setShowPlatformRequests] = useState(true)

  const iconMap: Record<string, any> = {
    Database,
    Users,
    Music,
    Calendar,
    Youtube,
    Facebook,
    Music2,
    Globe,
    Radio,
    CheckCircle2,
    Clock,
  }

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      {showOverview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Overview</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Sections
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Show Sections</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showOverview}
                  onCheckedChange={setShowOverview}
                >
                  Overview
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showPlatformRequests}
                  onCheckedChange={setShowPlatformRequests}
                >
                  Platform Requests
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Releases"
              value={totalReleases.toLocaleString()}
              description="All releases in the system"
              icon="Database"
              gradient
              delay={0}
            />
            <StatsCard
              title="Total Artists"
              value={totalArtists.toLocaleString()}
              description="Registered artists"
              icon="Users"
              gradient
              delay={0.1}
            />
            <StatsCard
              title="Total Tracks"
              value={totalTracks.toLocaleString()}
              description="All tracks across releases"
              icon="Music"
              gradient
              delay={0.2}
            />
            <StatsCard
              title="Recent Releases"
              value={recentReleasesCount.toLocaleString()}
              description="Latest additions"
              icon="Calendar"
              gradient
              delay={0.3}
            />
          </div>
        </div>
      )}

      {/* Platform Requests Section */}
      {showPlatformRequests && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Platform Requests</h2>
            {!showOverview && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Sections
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Show Sections</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={showOverview}
                    onCheckedChange={setShowOverview}
                  >
                    Overview
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showPlatformRequests}
                    onCheckedChange={setShowPlatformRequests}
                  >
                    Platform Requests
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {platformStats.map((platform, index) => {
              const Icon = iconMap[platform.icon] || Youtube
              const platformSlug = platform.platform === 'international_streaming' 
                ? 'international-streaming' 
                : platform.platform
              return (
                <Link 
                  key={platform.platform} 
                  href={`/platforms/${platformSlug}`}
                  className="block"
                >
                  <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-medium">{platform.displayName}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </div>
                        <div className="text-2xl font-bold">{platform.pending.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{platform.approved.toLocaleString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

