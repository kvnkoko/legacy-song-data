'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarMonthPickerProps {
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export function CalendarMonthPicker({ month, year, onMonthChange }: CalendarMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [selectedYear, setSelectedYear] = useState(year)
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentDate = new Date()
  const isCurrentMonth = month === currentDate.getMonth() + 1 && year === currentDate.getFullYear()

  const handlePreviousMonth = () => {
    let newMonth = month - 1
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    onMonthChange(newMonth, newYear)
    updateURL(newMonth, newYear)
  }

  const handleNextMonth = () => {
    let newMonth = month + 1
    let newYear = year
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    onMonthChange(newMonth, newYear)
    updateURL(newMonth, newYear)
  }

  const handleToday = () => {
    const today = new Date()
    onMonthChange(today.getMonth() + 1, today.getFullYear())
    updateURL(today.getMonth() + 1, today.getFullYear())
    setIsOpen(false)
  }

  const handleMonthSelect = (selectedMonth: number) => {
    onMonthChange(selectedMonth, selectedYear)
    updateURL(selectedMonth, selectedYear)
    setIsOpen(false)
    setViewMode('month')
  }

  const handleYearSelect = (selectedYear: number) => {
    setSelectedYear(selectedYear)
    setViewMode('month')
  }

  const updateURL = (newMonth: number, newYear: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', String(newMonth))
    params.set('year', String(newYear))
    params.delete('startDate')
    params.delete('endDate')
    router.push(`/calendar?${params.toString()}`)
  }

  // Generate year range (current year ± 10 years)
  const yearRange = []
  const startYear = Math.max(2020, selectedYear - 10)
  const endYear = Math.min(2030, selectedYear + 10)
  for (let y = startYear; y <= endYear; y++) {
    yearRange.push(y)
  }

  // Generate decade range for year picker
  const decadeStart = Math.floor(selectedYear / 10) * 10
  const decadeYears = []
  for (let y = decadeStart - 10; y <= decadeStart + 20; y++) {
    decadeYears.push(y)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[200px] justify-start text-left font-normal h-9 px-3",
              "hover:bg-primary/10 hover:border-primary/40 transition-colors duration-200",
              "border-border/50"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">
              {MONTHS[month - 1]} {year}
            </span>
            {isCurrentMonth && (
              <span className="ml-1.5 text-[10px] text-muted-foreground/70 font-normal">•</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 shadow-xl border-border/50" align="start">
          <div>
            {viewMode === 'month' ? (
              <div className="space-y-3">
                {/* Year selector */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedYear(year)
                      setViewMode('year')
                    }}
                    className="text-base font-semibold hover:text-primary h-7 px-2"
                  >
                    {year}
                    <ChevronLeft className="ml-1.5 h-3.5 w-3.5 rotate-90" />
                  </Button>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviousMonth}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTHS_SHORT.map((monthName, index) => {
                    const monthNum = index + 1
                    const isSelected = monthNum === month
                    const isCurrent = monthNum === currentDate.getMonth() + 1 && selectedYear === currentDate.getFullYear()
                    
                    return (
                      <Button
                        key={monthNum}
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleMonthSelect(monthNum)}
                        className={cn(
                          "h-8 text-xs font-medium transition-colors",
                          isSelected && "bg-primary text-primary-foreground",
                          isCurrent && !isSelected && "bg-accent text-accent-foreground",
                          !isSelected && "hover:bg-primary/10"
                        )}
                      >
                        {monthName}
                      </Button>
                    )
                  })}
                </div>

                {/* Today button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="w-full h-8 text-xs"
                >
                  Go to Today
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Year navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedYear(selectedYear - 10)}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-base font-semibold">
                    {decadeStart - 10} - {decadeStart + 20}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedYear(selectedYear + 10)}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Year grid */}
                <div className="grid grid-cols-4 gap-1.5 max-h-[280px] overflow-y-auto">
                  {decadeYears.map((y) => {
                    const isSelected = y === selectedYear
                    const isCurrent = y === currentDate.getFullYear()
                    
                    return (
                      <Button
                        key={y}
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleYearSelect(y)}
                        className={cn(
                          "h-8 text-xs font-medium transition-colors",
                          isSelected && "bg-primary text-primary-foreground",
                          isCurrent && !isSelected && "bg-accent text-accent-foreground",
                          !isSelected && "hover:bg-primary/10"
                        )}
                      >
                        {y}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="w-full h-8 text-xs"
                >
                  Back to Months
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-9 w-9 hover:bg-primary/10 hover:border-primary/40 transition-colors duration-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-9 w-9 hover:bg-primary/10 hover:border-primary/40 transition-colors duration-200"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrentMonth && (
          <Button
            variant="outline"
            onClick={handleToday}
            className="h-9 px-3 text-xs font-medium hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors duration-200"
          >
            Today
          </Button>
        )}
      </div>
    </div>
  )
}

