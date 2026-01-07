'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

interface DistributionDataPoint {
  date: string
  releases: number
  tracks: number
  uploaded: number
  pending: number
  rejected: number
}

interface DistributionChartProps {
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

export function DistributionChart({ filters = {} }: DistributionChartProps) {
  const [data, setData] = useState<DistributionDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
  const [chartType, setChartType] = useState<'releases' | 'platforms' | 'status'>('releases')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'distribution',
          granularity,
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch distribution data')
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
  }, [filters, granularity])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribution Performance</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
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
          <CardTitle>Distribution Performance</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const formatDate = (date: string) => {
    if (granularity === 'month') {
      return date
    }
    const d = new Date(date)
    return granularity === 'day' ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

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
              <CardTitle>Distribution Performance</CardTitle>
              <CardDescription>Releases and platform requests over time</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={granularity} onValueChange={(v) => setGranularity(v as 'day' | 'week' | 'month')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as typeof chartType)}>
            <TabsList className="mb-4">
              <TabsTrigger value="releases">Releases & Tracks</TabsTrigger>
              <TabsTrigger value="platforms">Platform Status</TabsTrigger>
              <TabsTrigger value="status">Status Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="releases" className="space-y-4">
              <ChartContainer config={{}}>
                <ResponsiveChartContainer>
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReleases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTracks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primaryLight} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.primaryLight} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="releases"
                      stroke={chartColors.primary}
                      fillOpacity={1}
                      fill="url(#colorReleases)"
                      name="Releases"
                    />
                    <Area
                      type="monotone"
                      dataKey="tracks"
                      stroke={chartColors.primaryLight}
                      fillOpacity={1}
                      fill="url(#colorTracks)"
                      name="Tracks"
                    />
                  </AreaChart>
                </ResponsiveChartContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="platforms" className="space-y-4">
              <ChartContainer config={{}}>
                <ResponsiveChartContainer>
                  <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="uploaded"
                      stroke={chartColors.uploaded}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Uploaded"
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke={chartColors.pending}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Pending"
                    />
                    <Line
                      type="monotone"
                      dataKey="rejected"
                      stroke={chartColors.rejected}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Rejected"
                    />
                  </LineChart>
                </ResponsiveChartContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <ChartContainer config={{}}>
                <ResponsiveChartContainer>
                  <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="uploaded" stackId="a" fill={chartColors.uploaded} name="Uploaded" />
                    <Bar dataKey="pending" stackId="a" fill={chartColors.pending} name="Pending" />
                    <Bar dataKey="rejected" stackId="a" fill={chartColors.rejected} name="Rejected" />
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

