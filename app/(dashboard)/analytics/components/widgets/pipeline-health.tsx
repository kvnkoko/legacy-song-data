'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, chartColors, ResponsiveChartContainer } from '@/components/ui/chart'
import { AlertTriangle, Clock, CheckCircle2, XCircle, TrendingDown } from 'lucide-react'

interface PipelineHealth {
  pending: number
  uploaded: number
  rejected: number
  averageTimeInPending: number
  averageTimeInUploaded: number
  bottleneckPlatforms: { platform: string; pendingCount: number }[]
}

interface PipelineHealthProps {
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

export function PipelineHealth({ filters = {} }: PipelineHealthProps) {
  const [data, setData] = useState<PipelineHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'pipeline',
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch pipeline health')
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
          <CardTitle>Pipeline Health</CardTitle>
          <CardDescription>Loading pipeline data...</CardDescription>
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
          <CardTitle>Pipeline Health</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!data) return null

  const statusData = [
    { name: 'Pending', value: data.pending, color: chartColors.pending },
    { name: 'Uploaded', value: data.uploaded, color: chartColors.uploaded },
    { name: 'Rejected', value: data.rejected, color: chartColors.rejected },
  ]

  const bottleneckData = data.bottleneckPlatforms.map((bp) => ({
    name: bp.platform
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    value: bp.pendingCount,
  }))

  const total = data.pending + data.uploaded + data.rejected
  const healthScore = total > 0 ? ((data.uploaded / total) * 100).toFixed(1) : '0'

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
              <CardTitle>Pipeline Health</CardTitle>
              <CardDescription>Operational health and bottlenecks</CardDescription>
            </div>
            <Badge
              variant={parseFloat(healthScore) >= 70 ? 'default' : parseFloat(healthScore) >= 50 ? 'secondary' : 'destructive'}
              className="text-lg"
            >
              {healthScore}% Health
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <ChartContainer config={{}}>
              <ResponsiveChartContainer>
                <BarChart data={statusData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Count">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveChartContainer>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-border/50 rounded-lg bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Avg Time in Pending</span>
                </div>
                <div className="text-2xl font-bold">{data.averageTimeInPending.toFixed(1)}h</div>
              </div>
              <div className="p-4 border border-border/50 rounded-lg bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Avg Time in Uploaded</span>
                </div>
                <div className="text-2xl font-bold">{data.averageTimeInUploaded.toFixed(1)}h</div>
              </div>
            </div>

            {data.bottleneckPlatforms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <h4 className="font-semibold">Bottleneck Platforms</h4>
                </div>
                <ChartContainer config={{}}>
                  <ResponsiveChartContainer>
                    <BarChart data={bottleneckData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
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
                      <Bar dataKey="value" fill={chartColors.pending} name="Pending Requests">
                        {bottleneckData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveChartContainer>
                </ChartContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

