import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { CalendarClient } from './calendar-client'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; startDate?: string; endDate?: string; dateField?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  // Get user preferences - handle gracefully if field doesn't exist
  let calendarPrefs = {}
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    // Safely access preferences field
    if (user && 'preferences' in user) {
      const preferences = (user as any).preferences as any
      calendarPrefs = preferences?.calendar || {}
    }
  } catch (error: any) {
    // If preferences field doesn't exist, use defaults
    console.warn('Could not fetch user preferences, using defaults:', error.message)
    calendarPrefs = {}
  }
  
  // Determine date field to use
  const dateField = (searchParams.dateField || calendarPrefs.dateField || 'legacyReleaseDate') as 'legacyReleaseDate' | 'artistsChosenDate'
  
  // Default display fields
  const defaultDisplayFields = {
    showTitle: true,
    showArtist: true,
    showType: true,
    showTrackCount: true,
    showPlatformStatus: false,
    showArtistsDate: false,
    showCopyright: false,
  }
  
  const displayFields = calendarPrefs.displayFields || defaultDisplayFields

  const now = new Date()
  let startDate: Date
  let endDate: Date
  let displayMonth = now.getMonth() + 1
  let displayYear = now.getFullYear()

  if (searchParams.startDate && searchParams.endDate) {
    startDate = new Date(searchParams.startDate)
    endDate = new Date(searchParams.endDate)
    displayMonth = startDate.getMonth() + 1
    displayYear = startDate.getFullYear()
  } else {
    const month = parseInt(searchParams.month || String(now.getMonth() + 1))
    const year = parseInt(searchParams.year || String(now.getFullYear()))
    displayMonth = month
    displayYear = year
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0)
  }

  // Fetch releases for the month based on selected date field
  const whereClause: any = {}
  
  if (dateField === 'legacyReleaseDate') {
    whereClause.legacyReleaseDate = {
      gte: startDate,
      lte: endDate,
    }
  } else {
    whereClause.artistsChosenDate = {
      gte: startDate,
      lte: endDate,
    }
  }

  const releases = await prisma.release.findMany({
    where: whereClause,
    include: {
      artist: true,
      tracks: true,
      platformRequests: {
        select: {
          platform: true,
          status: true,
          channelName: true,
        },
      },
    },
    orderBy: {
      [dateField]: 'asc',
    },
  })

  // Transform releases to include the date field for grouping
  const releasesWithDate = releases.map((release) => ({
    ...release,
    legacyReleaseDate: release.legacyReleaseDate,
    artistsChosenDate: release.artistsChosenDate,
  }))

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent flex items-center gap-4">
            <Calendar className="w-9 h-9 md:w-10 md:h-10 text-primary" />
            Calendar View
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed font-medium">
            View releases by {dateField === 'legacyReleaseDate' ? 'legacy release date' : "artist's chosen date"}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <CalendarClient
            month={displayMonth}
            year={displayYear}
            dateField={dateField}
            displayFields={displayFields}
            releases={releasesWithDate as any}
            showSettingsOnly={true}
          />
        </div>
      </div>

      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/10 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">
                {new Date(displayYear, displayMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <CardDescription className="text-sm md:text-base font-medium">
                {releases.length} release{releases.length !== 1 ? 's' : ''} scheduled for this month
              </CardDescription>
            </div>
            <CalendarClient
              month={displayMonth}
              year={displayYear}
              dateField={dateField}
              displayFields={displayFields}
              releases={releasesWithDate as any}
              showPickerOnly={true}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <CalendarClient
            month={displayMonth}
            year={displayYear}
            dateField={dateField}
            displayFields={displayFields}
            releases={releasesWithDate as any}
          />
        </CardContent>
      </Card>
    </div>
  )
}
