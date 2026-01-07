'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { ArtistProfileImage } from './artist-profile-image'
import { EmployeeProfileImage } from './employee-profile-image'
import { Badge } from '@/components/ui/badge'
import * as LucideIcons from 'lucide-react'

type IconName = keyof typeof LucideIcons

interface ProfileCardProps {
  type: 'artist' | 'employee'
  name: string
  subtitle?: string
  photo?: string | null
  email?: string
  stats?: Array<{
    label: string
    value: string | number
    icon?: IconName
  }>
  badges?: (string | React.ReactNode)[]
  actions?: React.ReactNode
  className?: string
  href?: string
  onClick?: () => void
}

export function ProfileCard({
  type,
  name,
  subtitle,
  photo,
  email,
  stats,
  badges,
  actions,
  className,
  href,
  onClick
}: ProfileCardProps) {
  const ProfileImage = type === 'artist' ? ArtistProfileImage : EmployeeProfileImage

  const content = (
    <div
      className={cn("cursor-pointer", (onClick || href) && "cursor-pointer", className)}
      onClick={onClick}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-purple-lg",
        (onClick || href) && "hover:scale-[1.02]"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <ProfileImage
              name={name}
              photo={photo}
              email={email}
              size="xl"
              showGlow
            />
            
            <div className="mt-6 space-y-2">
              <h3 className="text-xl font-bold">{name}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground font-medium">Legal: {subtitle}</p>
              )}
              {email && (
                <p className="text-xs text-muted-foreground">{email}</p>
              )}
            </div>

            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {badges.map((badge, i) => (
                  typeof badge === 'string' ? (
                    <Badge key={i} variant="outline" className="text-xs">
                      {badge}
                    </Badge>
                  ) : (
                    <React.Fragment key={i}>{badge}</React.Fragment>
                  )
                ))}
              </div>
            )}

            {stats && stats.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-6 w-full">
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                    className="text-center p-3 bg-muted/50 rounded-lg"
                  >
                    {stat.icon && (() => {
                      const Icon = LucideIcons[stat.icon] as React.ComponentType<{ className?: string }>
                      return Icon ? <Icon className="w-4 h-4 mx-auto mb-1 text-primary" /> : null
                    })()}
                    <div className="text-lg font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {actions && (
              <div className="mt-6 w-full">
                {actions}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

