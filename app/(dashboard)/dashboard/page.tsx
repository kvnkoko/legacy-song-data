import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Database, Users, Music, Calendar, Youtube, Facebook, Music2, Globe, Radio } from 'lucide-react'
import { ReloadButton } from '@/components/reload-button'
import { DashboardSections } from '@/components/dashboard-sections'
import { DashboardAutoRefresh } from '@/components/dashboard-auto-refresh'
import { PlatformRequestStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Force no caching for dashboard data
export const fetchCache = 'force-no-store'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch statistics with error handling
  let totalReleases = 0
  let totalArtists = 0
  let totalTracks = 0
  let recentReleases: any[] = []
  let platformStats: Array<{
    platform: string
    displayName: string
    icon: string
    pending: number
    approved: number
  }> = []
  let dbError: string | null = null

  const platforms = [
    { key: 'youtube', displayName: 'YouTube', icon: 'Youtube' },
    { key: 'facebook', displayName: 'Facebook', icon: 'Facebook' },
    { key: 'tiktok', displayName: 'TikTok', icon: 'Music2' },
    { key: 'flow', displayName: 'Flow', icon: 'Radio' },
    { key: 'ringtunes', displayName: 'Ringtunes', icon: 'Music' },
    { key: 'international_streaming', displayName: 'Intl Streaming', icon: 'Globe' },
  ]

  try {
    // Simplified queries with timeout protection
    const queryTimeout = 10000 // 10 seconds
    
    const queries = Promise.race([
      Promise.all([
        prisma.release.count().catch(() => 0),
        prisma.artist.count().catch(() => 0),
        prisma.track.count().catch(() => 0),
        prisma.release.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            artist: {
              select: {
                name: true,
              },
            },
            tracks: {
              select: {
                id: true,
              },
            },
          },
        }).catch(() => []),
        ...platforms.map(platform =>
          Promise.all([
            prisma.platformRequest.count({
              where: {
                platform: platform.key,
                status: PlatformRequestStatus.PENDING,
              },
            }).catch(() => 0),
            prisma.platformRequest.count({
              where: {
                platform: platform.key,
                status: PlatformRequestStatus.UPLOADED,
              },
            }).catch(() => 0),
          ])
        ),
      ]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), queryTimeout)
      ),
    ]) as Promise<[number, number, number, any[], ...Array<[number, number]>]>

    const [releasesCount, artistsCount, tracksCount, recentData, ...platformCountsData] = await queries

    totalReleases = releasesCount
    totalArtists = artistsCount
    totalTracks = tracksCount
    recentReleases = recentData || []

    // Map platform counts to stats
    platformStats = platforms.map((platform, index) => {
      const counts = platformCountsData[index] as [number, number] || [0, 0]
      const [pending, approved] = counts
      return {
        platform: platform.key,
        displayName: platform.displayName,
        icon: platform.icon,
        pending: pending || 0,
        approved: approved || 0,
      }
    })
  } catch (error: any) {
    console.error('Database error:', error)
    console.error('Error stack:', error.stack)
    dbError = error.message || 'Unable to connect to database'
    
    // If it's a database connection error, provide more details
    if (error.code === 'P1001' || error.code === 'P1000') {
      dbError = 'Failed to connect to the database. Please check your DATABASE_URL and ensure the database server is running.'
    } else if (error.message?.includes('Can\'t reach database server') || error.message === 'Query timeout') {
      dbError = 'Database connection timeout. Please check your connection settings and try again.'
    }
  }

  // Ensure we have valid data even if queries fail
  if (totalReleases === undefined) totalReleases = 0
  if (totalArtists === undefined) totalArtists = 0
  if (totalTracks === undefined) totalTracks = 0
  if (!recentReleases) recentReleases = []
  if (!platformStats || platformStats.length === 0) {
    platformStats = platforms.map(platform => ({
      platform: platform.key,
      displayName: platform.displayName,
      icon: platform.icon,
      pending: 0,
      approved: 0,
    }))
  }

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <DashboardAutoRefresh />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Overview of your music release management system
          </p>
        </div>
      </div>

      {/* Database Error Message */}
      {dbError && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-yellow-600 dark:text-yellow-400">
              Database Connection Issue
            </CardTitle>
            <CardDescription>
              Unable to connect to the database. Some features may be unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {dbError.includes('Can\'t reach database server') 
                ? 'Please check your database connection settings and ensure the database server is running.'
                : dbError}
            </p>
            <div className="flex gap-2">
              <ReloadButton />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Sections with Filters */}
      {!dbError && (
        <DashboardSections
          totalReleases={totalReleases}
          totalArtists={totalArtists}
          totalTracks={totalTracks}
          recentReleasesCount={recentReleases.length}
          platformStats={platformStats}
        />
      )}

      {/* Quick Actions and Platform Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/releases">
              <Button variant="outline" className="w-full justify-start">
                <Database className="w-4 h-4 mr-2" />
                View All Releases
              </Button>
            </Link>
            <Link href="/artists">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Manage Artists
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Platform Management */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Management</CardTitle>
            <CardDescription>Manage releases by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/platforms/youtube">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube
                </Button>
              </Link>
              <Link href="/platforms/facebook">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
              </Link>
              <Link href="/platforms/tiktok">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Music2 className="w-4 h-4 mr-2" />
                  TikTok
                </Button>
              </Link>
              <Link href="/platforms/flow">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Radio className="w-4 h-4 mr-2" />
                  Flow
                </Button>
              </Link>
              <Link href="/platforms/ringtunes">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Music className="w-4 h-4 mr-2" />
                  Ringtunes
                </Button>
              </Link>
              <Link href="/platforms/international-streaming">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Globe className="w-4 h-4 mr-2" />
                  Intl Streaming
                </Button>
              </Link>
              <Link href="/ar/releases">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  A&R Releases
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Releases */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Releases</CardTitle>
            <CardDescription>Latest releases added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReleases.length > 0 ? (
              <div className="space-y-3">
                {recentReleases.map((release) => (
                  <Link
                    key={release.id}
                    href={`/releases/${release.id}`}
                    className="block p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{release.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {release.artist.name} • {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(release.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No releases yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
