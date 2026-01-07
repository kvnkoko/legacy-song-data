'use client'

import { useMemo, memo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CalendarReleaseCard } from './calendar-release-card'

interface Release {
  id: string
  title: string
  type: string
  artist: {
    id: string
    name: string
  }
  tracks: Array<{ id: string }>
  platformRequests?: Array<{
    platform: string
    status: string
    channelName: string | null
  }>
  artistsChosenDate?: Date | null
  copyrightStatus?: Date | null
}

interface CalendarMonthViewProps {
  month: number
  year: number
  releases: Release[]
  dateField: 'legacyReleaseDate' | 'artistsChosenDate'
  displayFields: {
    showTitle: boolean
    showArtist: boolean
    showType: boolean
    showTrackCount: boolean
    showPlatformStatus: boolean
    showArtistsDate: boolean
    showCopyright: boolean
  }
  onDayClick?: (date: Date, releases: Release[]) => void
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Memoized day cell component to prevent unnecessary re-renders
const CalendarDayCell = memo(({
  date,
  isCurrentMonth,
  releases,
  isTodayDate,
  displayFields,
  onDayClick,
}: {
  date: Date
  isCurrentMonth: boolean
  releases: Release[]
  isTodayDate: boolean
  displayFields: CalendarMonthViewProps['displayFields']
  onDayClick?: (date: Date, releases: Release[]) => void
}) => {
  const dayReleases = releases || []
  const hasReleases = dayReleases.length > 0
  const dateKey = date.toISOString().split('T')[0]

  return (
    <div
      className={cn(
        "bg-background min-h-[140px] p-3 flex flex-col relative",
        "hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10",
        "transition-colors duration-150 ease-out",
        !isCurrentMonth && "opacity-35",
        isTodayDate && "ring-2 ring-primary/50 ring-offset-0 bg-primary/5",
        hasReleases && "cursor-pointer"
      )}
      onClick={() => onDayClick?.(date, dayReleases)}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <span
          className={cn(
            "text-sm font-semibold tracking-tight",
            isTodayDate && "text-primary font-bold text-base",
            !isCurrentMonth && "text-muted-foreground/50",
            isCurrentMonth && !isTodayDate && "text-foreground/80"
          )}
        >
          {date.getDate()}
        </span>
        {hasReleases && (
          <Badge
            variant="secondary"
            className="h-5 px-2 text-xs font-semibold bg-primary/15 text-primary border-primary/30"
          >
            {dayReleases.length}
          </Badge>
        )}
      </div>

      {/* Releases */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 relative z-10">
        {dayReleases.slice(0, 3).map((release) => (
          <CalendarReleaseCard
            key={release.id}
            release={release}
            displayFields={displayFields}
            compact={true}
          />
        ))}
        {dayReleases.length > 3 && (
          <div className="text-xs font-medium text-muted-foreground/70 text-center py-1.5 px-2 rounded-md bg-muted/30">
            +{dayReleases.length - 3} more
          </div>
        )}
      </div>
    </div>
  )
})

CalendarDayCell.displayName = 'CalendarDayCell'

export const CalendarMonthView = memo(function CalendarMonthView({
  month,
  year,
  releases,
  dateField,
  displayFields,
  onDayClick,
}: CalendarMonthViewProps) {
  // Group releases by date - memoized for performance
  const releasesByDate = useMemo(() => {
    const map = new Map<string, Release[]>()
    
    releases.forEach((release) => {
      let date: Date | null = null
      
      if (dateField === 'legacyReleaseDate') {
        date = (release as any).legacyReleaseDate || null
      } else {
        date = (release as any).artistsChosenDate || null
      }
      
      if (date) {
        const dateObj = date instanceof Date ? date : new Date(date)
        const dateKey = dateObj.toISOString().split('T')[0]
        if (!map.has(dateKey)) {
          map.set(dateKey, [])
        }
        map.get(dateKey)!.push(release)
      }
    })
    
    return map
  }, [releases, dateField])

  // Generate calendar grid - memoized for performance
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    
    const days: Array<{
      date: Date
      dateKey: string
      isCurrentMonth: boolean
      releases: Release[]
    }> = []
    
    // Add days from previous month
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 2, prevMonthLastDay - i)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString().split('T')[0]
      days.push({
        date,
        dateKey,
        isCurrentMonth: false,
        releases: releasesByDate.get(dateKey) || [],
      })
    }
    
    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString().split('T')[0]
      days.push({
        date,
        dateKey,
        isCurrentMonth: true,
        releases: releasesByDate.get(dateKey) || [],
      })
    }
    
    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month, day)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString().split('T')[0]
      days.push({
        date,
        dateKey,
        isCurrentMonth: false,
        releases: releasesByDate.get(dateKey) || [],
      })
    }
    
    return days
  }, [year, month, releasesByDate])

  // Memoize today check
  const today = useMemo(() => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      date: now.getDate(),
    }
  }, [])

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.date &&
      date.getMonth() === today.month &&
      date.getFullYear() === today.year
    )
  }

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px bg-border/50 mb-2 rounded-t-lg overflow-hidden">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="bg-gradient-to-b from-background to-muted/30 p-3 text-center"
          >
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/50 rounded-b-lg overflow-hidden">
        {calendarDays.map((dayData) => {
          const { date, dateKey, isCurrentMonth, releases } = dayData
          const isTodayDate = isToday(date)

          return (
            <CalendarDayCell
              key={dateKey}
              date={date}
              isCurrentMonth={isCurrentMonth}
              releases={releases}
              isTodayDate={isTodayDate}
              displayFields={displayFields}
              onDayClick={onDayClick}
            />
          )
        })}
      </div>
    </div>
  )
})
