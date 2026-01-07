'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import * as LucideIcons from 'lucide-react'

type IconName = keyof typeof LucideIcons

interface EmptyStateProps {
  icon?: IconName | React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  illustration?: React.ReactNode
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className,
  illustration 
}: EmptyStateProps) {
  const IconComponent = React.useMemo(() => {
    if (!icon) return null
    if (typeof icon === 'string') {
      return LucideIcons[icon] as React.ComponentType<{ className?: string }>
    }
    return icon
  }, [icon])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("flex flex-col items-center justify-center py-12 px-4", className)}
    >
      <Card className="border-dashed border-2 border-primary/20 bg-card/50 max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center pt-8 pb-8">
          {illustration ? (
            <div className="mb-6 text-primary/60">
              {illustration}
            </div>
          ) : IconComponent ? (
            <div className="mb-6 p-4 rounded-full bg-primary/10 text-primary">
              <IconComponent className="w-12 h-12" />
            </div>
          ) : (
            <div className="mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/30" />
            </div>
          )}
          
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {description}
            </p>
          )}
          {action && (
            <div className="mt-2">
              {action}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

