'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, X, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_LAYOUT, getWidgetById, type WidgetConfig } from '@/lib/analytics-widgets'
import { KPIWidget } from './widgets/kpi-widget'
import { DistributionChart } from './widgets/distribution-chart'
import { PlatformPerformance } from './widgets/platform-performance'
import { ArtistLeaderboard } from './widgets/artist-leaderboard'
import { AREfficiency } from './widgets/a-r-efficiency'
import { ContentBreakdown } from './widgets/content-breakdown'
import { PipelineHealth } from './widgets/pipeline-health'
import { TimeTrends } from './widgets/time-trends'

interface WidgetLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
}

interface WidgetGridProps {
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

const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  kpi: KPIWidget,
  distribution: DistributionChart,
  platform: PlatformPerformance,
  artist: ArtistLeaderboard,
  'ar-efficiency': AREfficiency,
  content: ContentBreakdown,
  pipeline: PipelineHealth,
  trends: TimeTrends,
}

export function WidgetGrid({ filters = {} }: WidgetGridProps) {
  const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_LAYOUT)
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(
    new Set(DEFAULT_LAYOUT.map((item) => item.i))
  )

  // Load saved layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('analytics-widget-layout')
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout)
        setLayout(parsed)
        setVisibleWidgets(new Set(parsed.map((item: WidgetLayout) => item.i)))
      } catch (e) {
        console.error('Failed to parse saved layout', e)
      }
    }
  }, [])

  // Save layout to localStorage
  useEffect(() => {
    if (layout.length > 0) {
      localStorage.setItem('analytics-widget-layout', JSON.stringify(layout))
    }
  }, [layout])

  const removeWidget = (widgetId: string) => {
    setLayout((prev) => prev.filter((item) => item.i !== widgetId))
    setVisibleWidgets((prev) => {
      const next = new Set(prev)
      next.delete(widgetId)
      return next
    })
  }

  const renderWidget = (widgetId: string) => {
    const widgetConfig = getWidgetById(widgetId)
    if (!widgetConfig) return null

    const WidgetComponent = WIDGET_COMPONENTS[widgetId]
    if (!WidgetComponent) return null

    return (
      <motion.div
        key={widgetId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative group"
      >
        <div className="h-full">
          <WidgetComponent filters={filters} />
        </div>
      </motion.div>
    )
  }

  // Calculate grid columns based on max width
  const maxCols = Math.max(...layout.map((item) => item.x + item.w), 12)
  const gridCols = `repeat(${maxCols}, minmax(0, 1fr))`

  // Calculate grid rows
  const maxRow = Math.max(...layout.map((item) => item.y + item.h), 0)
  const gridRows = `repeat(${maxRow + 1}, auto)`

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: gridCols,
        gridTemplateRows: gridRows,
      }}
    >
      {layout
        .filter((item) => visibleWidgets.has(item.i))
        .map((item) => (
          <div
            key={item.i}
            style={{
              gridColumn: `span ${item.w}`,
              gridRow: `span ${item.h}`,
            }}
          >
            {renderWidget(item.i)}
          </div>
        ))}
    </div>
  )
}

