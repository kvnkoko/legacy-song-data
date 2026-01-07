'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, chartColors, ResponsiveChartContainer } from '@/components/ui/chart'
import { Clock, Upload, Users, TrendingUp } from 'lucide-react'

interface AREfficiencyMetrics {
  employeeId: string
  employeeName: string
  releaseCount: number
  averageProcessingTime: number
  uploadedCount: number
  pendingCount: number
}

interface AREfficiencyProps {
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

export function AREfficiency({ filters = {} }: AREfficiencyProps) {
  const [data, setData] = useState<AREfficiencyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'workload' | 'time' | 'throughput'>('workload')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'ar-efficiency',
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch A&R efficiency data')
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
          <CardTitle>A&R Efficiency</CardTitle>
          <CardDescription>Loading A&R metrics...</CardDescription>
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
          <CardTitle>A&R Efficiency</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const workloadData = data.map((ar) => ({
    name: ar.employeeName.length > 15 ? ar.employeeName.substring(0, 15) + '...' : ar.employeeName,
    releases: ar.releaseCount,
  }))

  const timeData = data.map((ar) => ({
    name: ar.employeeName.length > 15 ? ar.employeeName.substring(0, 15) + '...' : ar.employeeName,
    hours: ar.averageProcessingTime,
  }))

  const throughputData = data.map((ar) => ({
    name: ar.employeeName.length > 15 ? ar.employeeName.substring(0, 15) + '...' : ar.employeeName,
    uploaded: ar.uploadedCount,
    pending: ar.pendingCount,
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
              <CardTitle>A&R Efficiency</CardTitle>
              <CardDescription>A&R team workload and processing metrics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={view === 'workload' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setView('workload')}
              >
                Workload
              </Badge>
              <Badge
                variant={view === 'time' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setView('time')}
              >
                Processing Time
              </Badge>
              <Badge
                variant={view === 'throughput' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setView('throughput')}
              >
                Throughput
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === 'workload' && (
            <ChartContainer config={{}}>
              <ResponsiveChartContainer>
                <BarChart data={workloadData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
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
                  <Bar dataKey="releases" fill={chartColors.primary} name="Releases">
                    {workloadData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors.palette[index % chartColors.palette.length]}
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
                <BarChart data={timeData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
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
                  <Tooltip
                    content={<ChartTooltip formatter={(value) => [`${value.toFixed(1)}h`, 'Avg Time']} />}
                  />
                  <Bar dataKey="hours" fill={chartColors.primary} name="Avg Processing Time (hours)">
                    {timeData.map((entry, index) => (
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

          {view === 'throughput' && (
            <ChartContainer config={{}}>
              <ResponsiveChartContainer>
                <BarChart data={throughputData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
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
                  <Bar dataKey="uploaded" stackId="a" fill={chartColors.uploaded} name="Uploaded" />
                  <Bar dataKey="pending" stackId="a" fill={chartColors.pending} name="Pending" />
                </BarChart>
              </ResponsiveChartContainer>
            </ChartContainer>
          )}

          <div className="mt-6 space-y-2">
            {data.map((ar, index) => (
              <motion.div
                key={ar.employeeId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 border border-border/50 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{ar.employeeName}</div>
                  <Badge variant="secondary">{ar.releaseCount} releases</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {ar.averageProcessingTime.toFixed(1)}h avg
                  </div>
                  <div className="flex items-center gap-1 text-flow-green">
                    <Upload className="h-3 w-3" />
                    {ar.uploadedCount} uploaded
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Clock className="h-3 w-3" />
                    {ar.pendingCount} pending
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



