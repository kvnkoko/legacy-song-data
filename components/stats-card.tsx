'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { AnimatedCard } from './animated-card'

type IconName = keyof typeof LucideIcons

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: IconName
  trend?: {
    value: string
    isPositive: boolean
  }
  gradient?: boolean
  delay?: number
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: iconName,
  trend,
  gradient = false,
  delay = 0,
  className 
}: StatsCardProps) {
  const Icon = iconName ? (LucideIcons[iconName] as React.ComponentType<{ className?: string }>) : null

  return (
    <AnimatedCard delay={delay} hover glow={gradient}>
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        gradient && "bg-gradient-to-br from-card via-card to-primary/5 border-primary/10 shadow-sm",
        className
      )}>
        {gradient && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        )}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground/80">
            {title}
          </CardTitle>
          {Icon && (
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              gradient ? "bg-primary/20 text-primary" : "bg-muted text-foreground/70"
            )}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: delay + 0.1 }}
              className="text-2xl font-bold text-foreground"
            >
              {value}
            </motion.div>
            {trend && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.2 }}
                className={cn(
                  "text-xs font-semibold",
                  trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}
              </motion.span>
            )}
          </div>
          {description && (
            <p className="text-xs text-foreground/70 font-medium mt-1">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    </AnimatedCard>
  )
}

