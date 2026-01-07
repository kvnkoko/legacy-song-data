'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltip, chartColors, ResponsiveChartContainer } from '@/components/ui/chart'
import { ReleaseType, CopyrightStatus, VideoType } from '@prisma/client'

interface ContentBreakdown {
  releaseTypes: { type: ReleaseType; count: number }[]
  copyrightStatus: { status: CopyrightStatus | null; count: number }[]
  videoTypes: { type: VideoType; count: number }[]
  genres: { genre: string; count: number }[]
}

interface ContentBreakdownProps {
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

const RADIAN = Math.PI / 180

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function ContentBreakdown({ filters = {} }: ContentBreakdownProps) {
  const [data, setData] = useState<ContentBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'content',
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch content breakdown')
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
          <CardTitle>Content Breakdown</CardTitle>
          <CardDescription>Loading content data...</CardDescription>
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
          <CardTitle>Content Breakdown</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!data) return null

  const releaseTypeData = data.releaseTypes.map((rt) => ({
    name: rt.type === 'SINGLE' ? 'Single' : 'Album',
    value: rt.count,
  }))

  const copyrightData = data.copyrightStatus.map((cs) => ({
    name: cs.status || 'Unknown',
    value: cs.count,
  }))

  const videoTypeData = data.videoTypes.map((vt) => ({
    name:
      vt.type === 'NONE'
        ? 'None'
        : vt.type === 'MUSIC_VIDEO'
        ? 'Music Video'
        : 'Lyrics Video',
    value: vt.count,
  }))

  const genreData = data.genres.slice(0, 10).map((g) => ({
    name: g.genre,
    value: g.count,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/10">
        <CardHeader>
          <CardTitle>Content Breakdown</CardTitle>
          <CardDescription>Distribution by type, copyright, and genre</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="releaseType" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="releaseType">Type</TabsTrigger>
              <TabsTrigger value="copyright">Copyright</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="genre">Genre</TabsTrigger>
            </TabsList>

            <TabsContent value="releaseType" className="space-y-4">
              <ChartContainer config={{}}>
                <ResponsiveChartContainer>
                  <PieChart>
                    <Pie
                      data={releaseTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {releaseTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors.palette[index % chartColors.palette.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveChartContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="copyright" className="space-y-4">
              <ChartContainer config={{}}>
                <ResponsiveChartContainer>
                  <PieChart>
                    <Pie
                      data={copyrightData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {copyrightData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors.palette[index % chartColors.palette.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveChartContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="video" className="space-y-4">
              <ChartContainer config={{}}>
                <ResponsiveChartContainer>
                  <PieChart>
                    <Pie
                      data={videoTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {videoTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors.palette[index % chartColors.palette.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveChartContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="genre" className="space-y-4">
              <ChartContainer config={{}}>
                <ResponsiveChartContainer>
                  <BarChart data={genreData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill={chartColors.primary} name="Tracks">
                      {genreData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors.palette[index % chartColors.palette.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveChartContainer>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}



