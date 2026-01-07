'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  config?: {
    [key: string]: {
      label?: string
      color?: string
    }
  }
  className?: string
}

export function ChartContainer({ children, config, className, ...props }: ChartContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('w-full', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number | string
    dataKey?: string
    color?: string
    payload?: any
  }>
  label?: string
  formatter?: (value: any, name: string) => [React.ReactNode, string]
  labelFormatter?: (label: string) => React.ReactNode
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm shadow-lg p-3 space-y-2 min-w-[150px]">
      {label && (
        <div className="font-semibold text-sm text-foreground border-b border-border/50 pb-1.5 mb-2">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const [displayValue, displayName] = formatter
            ? formatter(entry.value, entry.name || entry.dataKey || '')
            : [entry.value, entry.name || entry.dataKey || '']

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color || 'hsl(var(--primary))' }}
                />
                <span className="text-xs text-muted-foreground">{displayName}</span>
              </div>
              <span className="font-semibold text-sm text-foreground">{displayValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ChartLegendProps {
  payload?: Array<{
    value?: string
    type?: string
    color?: string
  }>
  formatter?: (value: string) => React.ReactNode
}

export function ChartLegend({ payload, formatter }: ChartLegendProps) {
  if (!payload || payload.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color || 'hsl(var(--primary))' }}
          />
          <span className="text-xs text-muted-foreground">
            {formatter ? formatter(entry.value || '') : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// Chart color palette using Flow brand colors
export const chartColors = {
  primary: 'hsl(var(--primary))',
  primaryLight: 'hsl(var(--flow-purple-400))',
  primaryDark: 'hsl(var(--flow-purple-700))',
  success: 'hsl(var(--flow-green))',
  muted: 'hsl(var(--muted-foreground))',
  // Multi-color palette for charts
  palette: [
    'hsl(var(--primary))',
    'hsl(var(--flow-purple-400))',
    'hsl(var(--flow-purple-700))',
    'hsl(var(--flow-green))',
    'hsl(var(--flow-purple-300))',
    'hsl(var(--flow-purple-500))',
    'hsl(var(--flow-purple-600))',
    'hsl(var(--flow-purple-800))',
  ],
  // Status colors
  uploaded: 'hsl(var(--flow-green))',
  approved: 'hsl(217 91% 60%)', // Blue
  pending: 'hsl(43 96% 56%)', // Yellow/Amber
  rejected: 'hsl(0 84% 60%)', // Red
}

// Common chart props for consistent styling
export const commonChartProps = {
  margin: { top: 10, right: 10, bottom: 10, left: 10 },
  style: {
    fontSize: '12px',
  },
}

// Responsive container wrapper
export function ResponsiveChartContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('w-full h-full min-h-[300px]', className)} {...props}>
      {children}
    </div>
  )
}



