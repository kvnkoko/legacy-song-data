'use client'

import { useState } from 'react'
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onDateChange: (start: Date | undefined, end: Date | undefined) => void
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const applyPreset = (preset: string) => {
    const now = new Date()
    let start: Date | undefined
    let end: Date | undefined

    switch (preset) {
      case 'today':
        start = startOfDay(now)
        end = endOfDay(now)
        break
      case 'yesterday':
        const yesterday = subDays(now, 1)
        start = startOfDay(yesterday)
        end = endOfDay(yesterday)
        break
      case 'last7days':
        start = startOfDay(subDays(now, 6))
        end = endOfDay(now)
        break
      case 'last30days':
        start = startOfDay(subDays(now, 29))
        end = endOfDay(now)
        break
      case 'thisWeek':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 })
        const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 })
        start = startOfDay(lastWeekStart)
        end = endOfDay(lastWeekEnd)
        break
      case 'thisMonth':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'lastMonth':
        const lastMonth = subMonths(now, 1)
        start = startOfMonth(lastMonth)
        end = endOfMonth(lastMonth)
        break
      case 'thisYear':
        start = startOfYear(now)
        end = endOfYear(now)
        break
      case 'lastYear':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1)
        start = startOfYear(lastYear)
        end = endOfYear(lastYear)
        break
      default:
        return
    }

    onDateChange(start, end)
    setIsOpen(false)
  }

  const clearDates = () => {
    onDateChange(undefined, undefined)
    setIsOpen(false)
  }

  const hasSelection = startDate || endDate

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !hasSelection && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate && endDate ? (
              <>
                {format(startDate, 'LLL dd, y')} - {format(endDate, 'LLL dd, y')}
              </>
            ) : startDate ? (
              format(startDate, 'LLL dd, y')
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r">
              <div className="p-2 border-b">
                <div className="text-sm font-semibold mb-1.5">Quick Presets</div>
                <div className="grid grid-cols-2 gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-7"
                    onClick={() => applyPreset('today')}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('yesterday')}
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('last7days')}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('last30days')}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('thisWeek')}
                  >
                    This week
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('lastWeek')}
                  >
                    Last week
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('thisMonth')}
                  >
                    This month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('lastMonth')}
                  >
                    Last month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('thisYear')}
                  >
                    This year
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => applyPreset('lastYear')}
                  >
                    Last year
                  </Button>
                </div>
                {hasSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1.5 text-xs h-7 text-destructive hover:text-destructive"
                    onClick={clearDates}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear dates
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={startDate}
                selected={{
                  from: startDate,
                  to: endDate,
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onDateChange(range.from, range.to)
                    setIsOpen(false)
                  } else if (range?.from) {
                    onDateChange(range.from, undefined)
                  } else {
                    onDateChange(undefined, undefined)
                  }
                }}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {hasSelection && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={clearDates}
          title="Clear date range"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}


