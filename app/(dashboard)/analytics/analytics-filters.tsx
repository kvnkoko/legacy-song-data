'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DateRangePicker } from '@/components/date-range-picker'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Filter, X } from 'lucide-react'
import { useState } from 'react'
import { subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns'

export function AnalyticsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)

  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
  const platform = searchParams.get('platform') || 'all'
  const releaseType = searchParams.get('releaseType') || 'all'
  const status = searchParams.get('status') || 'all'

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.push(`/analytics?${params.toString()}`)
  }

  const handleDateChange = (start: Date | undefined, end: Date | undefined) => {
    updateParams({
      startDate: start ? start.toISOString().split('T')[0] : null,
      endDate: end ? end.toISOString().split('T')[0] : null,
    })
  }

  const handlePreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const now = endOfDay(new Date())
    let start: Date

    switch (preset) {
      case 'today':
        start = startOfDay(new Date())
        break
      case 'week':
        start = startOfDay(subDays(now, 7))
        break
      case 'month':
        start = startOfDay(subDays(now, 30))
        break
      case 'quarter':
        start = startOfDay(subDays(now, 90))
        break
      case 'year':
        start = startOfDay(subDays(now, 365))
        break
      default:
        return
    }

    handleDateChange(start, now)
  }

  const activeFiltersCount =
    (platform !== 'all' ? 1 : 0) +
    (releaseType !== 'all' ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (startDate || endDate ? 1 : 0)

  const clearFilters = () => {
    updateParams({
      startDate: null,
      endDate: null,
      platform: null,
      releaseType: null,
      status: null,
    })
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
      />

      <Select value={platform} onValueChange={(v) => updateParams({ platform: v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Platforms" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="flow">Flow</SelectItem>
          <SelectItem value="ringtunes">Ringtunes</SelectItem>
          <SelectItem value="international_streaming">International Streaming</SelectItem>
          <SelectItem value="facebook">Facebook</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filters</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Presets</label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePreset('today')}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreset('week')}>
                  Last Week
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreset('month')}>
                  Last Month
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreset('quarter')}>
                  Last Quarter
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreset('year')}>
                  Last Year
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Release Type</label>
              <Select value={releaseType} onValueChange={(v) => updateParams({ releaseType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="ALBUM">Album</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v) => updateParams({ status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="UPLOADED">Uploaded</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

