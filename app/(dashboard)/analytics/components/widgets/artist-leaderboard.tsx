'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, chartColors, ResponsiveChartContainer } from '@/components/ui/chart'
import { Trophy, Music, Users, Globe, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ArtistMetrics {
  artistId: string
  artistName: string
  releaseCount: number
  trackCount: number
  platformCount: number
  recentActivity: string
}

interface ArtistLeaderboardProps {
  filters?: {
    startDate?: string
    endDate?: string
    platform?: string
    releaseType?: string
    status?: string
    artistId?: string
    assignedARId?: string
  }
}

export function ArtistLeaderboard({ filters = {} }: ArtistLeaderboardProps) {
  const [data, setData] = useState<ArtistMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'releases' | 'tracks' | 'platforms'>('releases')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'artist',
          limit: '10',
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch artist metrics')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Artists</CardTitle>
          <CardDescription>Loading artist data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Artists</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'releases') return b.releaseCount - a.releaseCount
    if (sortBy === 'tracks') return b.trackCount - a.trackCount
    return b.platformCount - a.platformCount
  })

  const chartData = sortedData.slice(0, 10).map((artist) => ({
    name: artist.artistName.length > 15 ? artist.artistName.substring(0, 15) + '...' : artist.artistName,
    releases: artist.releaseCount,
    tracks: artist.trackCount,
    platforms: artist.platformCount,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Artists</CardTitle>
              <CardDescription>Leaderboard of most active artists</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={sortBy === 'releases' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSortBy('releases')}
              >
                Releases
              </Badge>
              <Badge
                variant={sortBy === 'tracks' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSortBy('tracks')}
              >
                Tracks
              </Badge>
              <Badge
                variant={sortBy === 'platforms' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSortBy('platforms')}
              >
                Platforms
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}>
            <ResponsiveChartContainer>
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={70}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey={sortBy}
                  fill={chartColors.primary}
                  name={sortBy === 'releases' ? 'Releases' : sortBy === 'tracks' ? 'Tracks' : 'Platforms'}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors.palette[index % chartColors.palette.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveChartContainer>
          </ChartContainer>

          <div className="mt-6 space-y-2">
            {sortedData.slice(0, 5).map((artist, index) => (
              <motion.div
                key={artist.artistId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{artist.artistName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        {artist.releaseCount} releases
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {artist.trackCount} tracks
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {artist.platformCount} platforms
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(artist.recentActivity), { addSuffix: true })}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}



