'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  delay?: number
  hover?: boolean
  glow?: boolean
}

export function AnimatedCard({ 
  children, 
  className, 
  delay = 0, 
  hover = true,
  glow = false,
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0.3, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(delay, 0.1) }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "transition-all duration-300",
        glow && "hover:shadow-purple",
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedCardContentProps {
  children: React.ReactNode
  title?: string
  description?: string
  footer?: React.ReactNode
  className?: string
}

export function AnimatedCardContent({ 
  children, 
  title, 
  description, 
  footer,
  className 
}: AnimatedCardContentProps) {
  return (
    <Card className={cn("hover:border-primary/30", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}

