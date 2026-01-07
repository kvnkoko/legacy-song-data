'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { ChartContainer, ChartTooltip, chartColors, ResponsiveChartContainer } from '@/components/ui/chart'
import { CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react'

interface PlatformMetrics {
  platform: string
  totalRequests: number
  uploaded: number
  pending: number
  rejected: number
  successRate: number
  averageProcessingTime: number
}

interface PlatformPerformanceProps {
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

export function PlatformPerformance({ filters = {} }: PlatformPerformanceProps) {
  const [data, setData] = useState<PlatformMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'comparison' | 'success' | 'time'>('comparison')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'platform',
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch platform analytics')
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
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>Loading platform data...</CardDescription>
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
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const formatPlatformName = (platform: string) => {
    return platform
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const comparisonData = data.map((p) => ({
    platform: formatPlatformName(p.platform),
    uploaded: p.uploaded,
    pending: p.pending,
    rejected: p.rejected,
  }))

  const successRateData = data.map((p) => ({
    platform: formatPlatformName(p.platform),
    successRate: p.successRate,
  }))

  const processingTimeData = data.map((p) => ({
    platform: formatPlatformName(p.platform),
    hours: p.averageProcessingTime,
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
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>Performance metrics by platform</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={view === 'comparison' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setView('comparison')}
              >
                Comparison
              </Badge>
              <Badge
                variant={view === 'success' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setView('success')}
              >
                Success Rate
              </Badge>
              <Badge
                variant={view === 'time' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setView('time')}
              >
                Processing Time
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === 'comparison' && (
            <ChartContainer config={{}}>
              <ResponsiveChartContainer>
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="platform"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
          )}

          {view === 'success' && (
            <ChartContainer config={{}}>
              <ResponsiveChartContainer>
                <BarChart data={successRateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="platform"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    content={<ChartTooltip formatter={(value) => [`${value}%`, 'Success Rate']} />}
                  />
                  <Bar dataKey="successRate" fill={chartColors.success} name="Success Rate">
                    {successRateData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.successRate >= 80
                            ? chartColors.uploaded
                            : entry.successRate >= 60
                            ? chartColors.approved
                            : chartColors.pending
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveChartContainer>
            </ChartContainer>
          )}

          {view === 'time' && (
            <ChartContainer config={{}}>
              <ResponsiveChartContainer>
                <BarChart data={processingTimeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="platform"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    content={<ChartTooltip formatter={(value) => [`${value.toFixed(1)}h`, 'Avg Time']} />}
                  />
                  <Bar dataKey="hours" fill={chartColors.primary} name="Avg Processing Time (hours)">
                    {processingTimeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.hours <= 24
                            ? chartColors.uploaded
                            : entry.hours <= 72
                            ? chartColors.approved
                            : chartColors.pending
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveChartContainer>
            </ChartContainer>
          )}

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.map((platform, index) => (
              <motion.div
                key={platform.platform}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border border-border/50 rounded-lg bg-card/50"
              >
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {formatPlatformName(platform.platform)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{platform.totalRequests}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-flow-green" />
                      Uploaded
                    </span>
                    <span className="font-semibold">{platform.uploaded}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-500" />
                      Pending
                    </span>
                    <span className="font-semibold">{platform.pending}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      Success Rate
                    </span>
                    <span className="font-semibold">{platform.successRate.toFixed(1)}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

