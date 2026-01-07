export interface WidgetConfig {
  id: string
  title: string
  description: string
  component: string
  defaultSize: {
    w: number
    h: number
    minW?: number
    minH?: number
    maxW?: number
    maxH?: number
  }
  category: 'overview' | 'distribution' | 'performance' | 'content' | 'operations'
  icon?: string
  filters?: {
    dateRange?: boolean
    platform?: boolean
    releaseType?: boolean
    status?: boolean
    artist?: boolean
    assignedAR?: boolean
  }
}

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  kpi: {
    id: 'kpi',
    title: 'Key Performance Indicators',
    description: 'Overview of critical business metrics',
    component: 'KPIWidget',
    defaultSize: { w: 12, h: 2, minW: 6, minH: 2 },
    category: 'overview',
    icon: 'TrendingUp',
    filters: {
      dateRange: true,
    },
  },
  distribution: {
    id: 'distribution',
    title: 'Distribution Performance',
    description: 'Releases and platform requests over time',
    component: 'DistributionChart',
    defaultSize: { w: 12, h: 6, minW: 6, minH: 4 },
    category: 'distribution',
    icon: 'LineChart',
    filters: {
      dateRange: true,
      platform: true,
      releaseType: true,
    },
  },
  platform: {
    id: 'platform',
    title: 'Platform Analytics',
    description: 'Performance metrics by platform',
    component: 'PlatformPerformance',
    defaultSize: { w: 12, h: 6, minW: 6, minH: 4 },
    category: 'performance',
    icon: 'BarChart3',
    filters: {
      dateRange: true,
      platform: true,
      status: true,
    },
  },
  artist: {
    id: 'artist',
    title: 'Top Artists',
    description: 'Leaderboard of most active artists',
    component: 'ArtistLeaderboard',
    defaultSize: { w: 6, h: 8, minW: 4, minH: 6 },
    category: 'performance',
    icon: 'Users',
    filters: {
      dateRange: true,
      artist: true,
    },
  },
  'ar-efficiency': {
    id: 'ar-efficiency',
    title: 'A&R Efficiency',
    description: 'A&R team workload and processing metrics',
    component: 'AREfficiency',
    defaultSize: { w: 6, h: 8, minW: 4, minH: 6 },
    category: 'operations',
    icon: 'Clock',
    filters: {
      dateRange: true,
      assignedAR: true,
    },
  },
  content: {
    id: 'content',
    title: 'Content Breakdown',
    description: 'Distribution by type, copyright, and genre',
    component: 'ContentBreakdown',
    defaultSize: { w: 6, h: 6, minW: 4, minH: 4 },
    category: 'content',
    icon: 'PieChart',
    filters: {
      dateRange: true,
      releaseType: true,
    },
  },
  pipeline: {
    id: 'pipeline',
    title: 'Pipeline Health',
    description: 'Operational health and bottlenecks',
    component: 'PipelineHealth',
    defaultSize: { w: 6, h: 6, minW: 4, minH: 4 },
    category: 'operations',
    icon: 'Activity',
    filters: {
      dateRange: true,
      platform: true,
      status: true,
    },
  },
  trends: {
    id: 'trends',
    title: 'Time Trends',
    description: 'Growth patterns and forecasting',
    component: 'TimeTrends',
    defaultSize: { w: 12, h: 6, minW: 6, minH: 4 },
    category: 'overview',
    icon: 'TrendingUp',
    filters: {
      dateRange: true,
      releaseType: true,
    },
  },
}

export const DEFAULT_LAYOUT = [
  { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
  { i: 'distribution', x: 0, y: 2, w: 12, h: 6 },
  { i: 'platform', x: 0, y: 8, w: 12, h: 6 },
  { i: 'artist', x: 0, y: 14, w: 6, h: 8 },
  { i: 'ar-efficiency', x: 6, y: 14, w: 6, h: 8 },
  { i: 'content', x: 0, y: 22, w: 6, h: 6 },
  { i: 'pipeline', x: 6, y: 22, w: 6, h: 6 },
  { i: 'trends', x: 0, y: 28, w: 12, h: 6 },
]

export function getWidgetById(id: string): WidgetConfig | undefined {
  return WIDGET_REGISTRY[id]
}

export function getWidgetsByCategory(category: WidgetConfig['category']): WidgetConfig[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) => widget.category === category)
}

export function getAllWidgets(): WidgetConfig[] {
  return Object.values(WIDGET_REGISTRY)
}



