'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { TrendingUp, Music, Upload, Users, Globe, Zap, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPIMetrics {
  totalReleases: number
  totalTracks: number
  uploadSuccessRate: number
  activeArtists: number
  platformCoverage: number
  processingVelocity: number
  pendingReleases: number
  rejectedReleases: number
}

interface KPICardProps {
  title: string
  value: number | string
  description?: string
  icon: React.ReactNode
  trend?: number
  delay?: number
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

function KPICard({ title, value, description, icon, trend, delay = 0, color = 'primary' }: KPICardProps) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    success: 'from-flow-green/10 to-flow-green/5 border-flow-green/20',
    warning: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20',
    danger: 'from-red-500/10 to-red-500/5 border-red-500/20',
  }

  const iconColorClasses = {
    primary: 'text-primary',
    success: 'text-flow-green',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="h-full"
    >
      <Card className={cn('h-full bg-gradient-to-br border-2 transition-all duration-300 hover:shadow-lg', colorClasses[color])}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
                className="flex items-baseline gap-2"
              >
                <h3 className="text-3xl font-bold text-foreground">{value}</h3>
                {trend !== undefined && trend !== 0 && (
                  <span
                    className={cn(
                      'text-sm font-medium flex items-center gap-1',
                      trend > 0 ? 'text-flow-green' : 'text-red-500'
                    )}
                  >
                    <TrendingUp className={cn('h-4 w-4', trend < 0 && 'rotate-180')} />
                    {Math.abs(trend)}%
                  </span>
                )}
              </motion.div>
              {description && (
                <p className="text-xs text-muted-foreground mt-2">{description}</p>
              )}
            </div>
            <div className={cn('p-3 rounded-lg bg-background/50', iconColorClasses[color])}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface KPIWidgetProps {
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

export function KPIWidget({ filters = {} }: KPIWidgetProps) {
  const [data, setData] = useState<KPIMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          widget: 'kpi',
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
          ),
        })

        const response = await fetch(`/api/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch KPI metrics')
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
          <CardTitle>Key Performance Indicators</CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
        <p className="text-sm text-muted-foreground">Overview of critical business metrics</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Releases"
          value={data.totalReleases.toLocaleString()}
          description="All releases in period"
          icon={<Music className="h-6 w-6" />}
          delay={0}
          color="primary"
        />
        <KPICard
          title="Total Tracks"
          value={data.totalTracks.toLocaleString()}
          description="All songs in period"
          icon={<Music className="h-6 w-6" />}
          delay={0.05}
          color="primary"
        />
        <KPICard
          title="Success Rate"
          value={`${data.uploadSuccessRate.toFixed(1)}%`}
          description="Upload success rate"
          icon={<Upload className="h-6 w-6" />}
          delay={0.1}
          color="success"
        />
        <KPICard
          title="Active Artists"
          value={data.activeArtists.toLocaleString()}
          description="Unique artists"
          icon={<Users className="h-6 w-6" />}
          delay={0.15}
          color="primary"
        />
        <KPICard
          title="Platform Coverage"
          value={data.platformCoverage.toFixed(1)}
          description="Avg platforms per release"
          icon={<Globe className="h-6 w-6" />}
          delay={0.2}
          color="primary"
        />
        <KPICard
          title="Processing Velocity"
          value={data.processingVelocity.toFixed(1)}
          description="Releases per day"
          icon={<Zap className="h-6 w-6" />}
          delay={0.25}
          color="primary"
        />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <KPICard
          title="Pending"
          value={data.pendingReleases.toLocaleString()}
          description="Awaiting processing"
          icon={<Clock className="h-5 w-5" />}
          delay={0.3}
          color="warning"
        />
        <KPICard
          title="Rejected"
          value={data.rejectedReleases.toLocaleString()}
          description="Requires attention"
          icon={<XCircle className="h-5 w-5" />}
          delay={0.35}
          color="danger"
        />
      </div>
    </div>
  )
}

