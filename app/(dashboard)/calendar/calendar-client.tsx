'use client'

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarMonthView } from '@/components/calendar-month-view'
import { CalendarDayDetailDialog } from '@/components/calendar-day-detail-dialog'
import { CalendarMonthPicker } from '@/components/calendar-month-picker'
import { CalendarDisplaySettings } from '@/components/calendar-display-settings'

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
  legacyReleaseDate?: Date | null
  copyrightStatus?: string | null
}

interface CalendarClientProps {
  month: number
  year: number
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
  releases: Release[]
  showSettingsOnly?: boolean
  showPickerOnly?: boolean
}

function CalendarClientInner({
  month: initialMonth,
  year: initialYear,
  dateField: initialDateField,
  displayFields: initialDisplayFields,
  releases: initialReleases,
  showSettingsOnly = false,
  showPickerOnly = false,
}: CalendarClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [dateField, setDateField] = useState<'legacyReleaseDate' | 'artistsChosenDate'>(initialDateField)
  const [displayFields, setDisplayFields] = useState(initialDisplayFields)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedReleases, setSelectedReleases] = useState<Release[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Use refs to track previous values and prevent unnecessary updates
  const prevMonthRef = useRef(month)
  const prevYearRef = useRef(year)
  const prevDateFieldRef = useRef(dateField)

  // Sync with URL params - only update when values actually change
  useEffect(() => {
    const urlMonth = searchParams.get('month')
    const urlYear = searchParams.get('year')
    const urlDateField = searchParams.get('dateField')
    
    if (urlMonth) {
      const monthNum = parseInt(urlMonth)
      if (monthNum !== prevMonthRef.current) {
        prevMonthRef.current = monthNum
        setMonth(monthNum)
      }
    }
    if (urlYear) {
      const yearNum = parseInt(urlYear)
      if (yearNum !== prevYearRef.current) {
        prevYearRef.current = yearNum
        setYear(yearNum)
      }
    }
    if (urlDateField && (urlDateField === 'legacyReleaseDate' || urlDateField === 'artistsChosenDate')) {
      if (urlDateField !== prevDateFieldRef.current) {
        prevDateFieldRef.current = urlDateField
        setDateField(urlDateField)
      }
    }
  }, [searchParams])

  // Filter releases based on selected date field - memoized for performance
  const filteredReleases = useMemo(() => {
    return initialReleases.filter((release) => {
      if (dateField === 'legacyReleaseDate') {
        return release.legacyReleaseDate !== null
      } else {
        return release.artistsChosenDate !== null
      }
    })
  }, [initialReleases, dateField])

  const handleMonthChange = useCallback((newMonth: number, newYear: number) => {
    if (newMonth === month && newYear === year) return
    
    setMonth(newMonth)
    setYear(newYear)
    prevMonthRef.current = newMonth
    prevYearRef.current = newYear
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', String(newMonth))
    params.set('year', String(newYear))
    router.push(`/calendar?${params.toString()}`)
    router.refresh()
  }, [router, searchParams, month, year])

  const handleDateFieldChange = useCallback((field: 'legacyReleaseDate' | 'artistsChosenDate') => {
    if (field === dateField) return
    
    setDateField(field)
    prevDateFieldRef.current = field
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('dateField', field)
    router.push(`/calendar?${params.toString()}`)
    router.refresh()
  }, [router, searchParams, dateField])

  const handleDisplayFieldsChange = useCallback((fields: typeof displayFields) => {
    setDisplayFields(fields)
  }, [])

  const handleDayClick = useCallback((date: Date, releases: Release[]) => {
    setSelectedDate(date)
    setSelectedReleases(releases)
    setIsDialogOpen(true)
  }, [])

  const handleNavigateDay = useCallback((direction: 'prev' | 'next') => {
    if (!selectedDate) return
    
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    
    // Find releases for the new date
    const dateKey = newDate.toISOString().split('T')[0]
    const newReleases = filteredReleases.filter((release) => {
      const releaseDate = dateField === 'legacyReleaseDate' 
        ? release.legacyReleaseDate 
        : release.artistsChosenDate
      if (!releaseDate) return false
      return releaseDate.toISOString().split('T')[0] === dateKey
    })
    
    setSelectedDate(newDate)
    setSelectedReleases(newReleases)
  }, [selectedDate, filteredReleases, dateField])

  if (showSettingsOnly) {
    return (
      <CalendarDisplaySettings
        dateField={dateField}
        onDateFieldChange={handleDateFieldChange}
        displayFields={displayFields}
        onDisplayFieldsChange={handleDisplayFieldsChange}
      />
    )
  }

  if (showPickerOnly) {
    return (
      <CalendarMonthPicker
        month={month}
        year={year}
        onMonthChange={handleMonthChange}
      />
    )
  }

  return (
    <>
      <CalendarMonthView
        month={month}
        year={year}
        releases={filteredReleases}
        dateField={dateField}
        displayFields={displayFields}
        onDayClick={handleDayClick}
      />
      
      <CalendarDayDetailDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        date={selectedDate}
        releases={selectedReleases}
        displayFields={displayFields}
        onNavigateDay={handleNavigateDay}
      />
    </>
  )
}

export function CalendarClient(props: CalendarClientProps) {
  return (
    <Suspense fallback={
      <div className="h-[600px] bg-muted/50 rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-medium">Loading calendar...</div>
      </div>
    }>
      <CalendarClientInner {...props} />
    </Suspense>
  )
}
