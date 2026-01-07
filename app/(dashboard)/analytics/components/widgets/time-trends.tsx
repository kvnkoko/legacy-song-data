'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltip, chartColors, ResponsiveChartContainer } from '@/components/ui/chart'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TimeTrend {
  period: string
  releases: number
  tracks: number
  growthRate: number
}

interface TimeTrendsProps {
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

export function TimeTrends({ filters = {} }: TimeTrendsProps) {
  const [data, setData] = useState<TimeTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'trends',
          period,
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch time trends')
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
  }, [filters, period])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time Trends</CardTitle>
          <CardDescription>Loading trend data...</CardDescription>
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
          <CardTitle>Time Trends</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const formatPeriod = (period: string) => {
    if (period.includes('-')) {
      const [year, month, day] = period.split('-')
      if (day) {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      }
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    }
    return period
  }

  const averageGrowthRate =
    data.length > 1
      ? data.slice(1).reduce((sum, d) => sum + d.growthRate, 0) / (data.length - 1)
      : 0

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
              <CardTitle>Time Trends</CardTitle>
              <CardDescription>Growth patterns and forecasting</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {averageGrowthRate !== 0 && (
                <Badge
                  variant={averageGrowthRate > 0 ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {averageGrowthRate > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(averageGrowthRate).toFixed(1)}% avg growth
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                  dataKey="period"
                  tickFormatter={formatPeriod}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormatter={formatPeriod}
                      formatter={(value, name) => {
                        const numValue = typeof value === 'number' ? value : parseFloat(value as string)
                        return [numValue.toLocaleString(), name === 'releases' ? 'Releases' : 'Tracks']
                      }}
                    />
                  }
                />
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

          <div className="mt-6 grid grid-cols-3 gap-4">
            {data.slice(-3).map((trend, index) => (
              <motion.div
                key={trend.period}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border border-border/50 rounded-lg bg-card/50"
              >
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {formatPeriod(trend.period)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Releases</span>
                    <span className="font-semibold">{trend.releases}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tracks</span>
                    <span className="font-semibold">{trend.tracks}</span>
                  </div>
                  {trend.growthRate !== 0 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">Growth</span>
                      <Badge
                        variant={trend.growthRate > 0 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {trend.growthRate > 0 ? '+' : ''}
                        {trend.growthRate.toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}



