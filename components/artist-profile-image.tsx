'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface ArtistProfileImageProps {
  name: string
  photo?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showBorder?: boolean
  showGlow?: boolean
}

const sizeClasses = {
  sm: 'h-16 w-16 text-lg',
  md: 'h-24 w-24 text-2xl',
  lg: 'h-32 w-32 text-4xl',
  xl: 'h-40 w-40 text-5xl',
}

export function ArtistProfileImage({ 
  name, 
  photo, 
  size = 'lg',
  className,
  showBorder = true,
  showGlow = true
}: ArtistProfileImageProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const gradientId = `gradient-${name.replace(/\s+/g, '-')}`

  return (
    <motion.div
      className={cn("relative flex-shrink-0", className)}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        "relative rounded-full overflow-hidden",
        sizeClasses[size],
        showBorder && "border-4 border-background shadow-purple",
        showGlow && "shadow-purple-glow"
      )}>
        {photo ? (
          <Image
            src={photo.startsWith('http') ? photo : `/api/files/${photo}`}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 128px, 160px"
          />
        ) : (
          <div 
            className="w-full h-full bg-gradient-to-br from-flow-purple-600 via-flow-purple-500 to-flow-purple-700 flex items-center justify-center text-white font-bold"
            style={{
              background: `linear-gradient(135deg, hsl(240, 100%, 67%) 0%, hsl(234, 100%, 74%) 50%, hsl(250, 100%, 50%) 100%)`
            }}
          >
            {initials}
          </div>
        )}
        {showGlow && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-flow-purple-600/20 to-transparent pointer-events-none" />
        )}
      </div>
    </motion.div>
  )
}

