'use client'

import * as React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface GradientButtonProps extends ButtonProps {
  gradient?: 'purple' | 'primary' | 'subtle'
  glow?: boolean
}

export function GradientButton({ 
  className, 
  gradient = 'purple',
  glow = true,
  children,
  ...props 
}: GradientButtonProps) {
  const gradientClasses = {
    purple: "bg-gradient-to-r from-flow-purple-600 to-flow-purple-700 hover:from-flow-purple-700 hover:to-flow-purple-800",
    primary: "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
    subtle: "bg-gradient-to-r from-flow-purple-500 to-flow-purple-600 hover:from-flow-purple-600 hover:to-flow-purple-700",
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        className={cn(
          gradientClasses[gradient],
          glow && "shadow-purple hover:shadow-purple-lg",
          "text-white border-0",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  )
}

