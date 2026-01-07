'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Combobox } from '@/components/ui/combobox'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchableFilterProps {
  field: 'performer' | 'composer' | 'band' | 'studio' | 'label' | 'genre'
  label: string
  value?: string
  onValueChange: (value: string | undefined) => void
  className?: string
}

export function SearchableFilter({
  field,
  label,
  value,
  onValueChange,
  className,
}: SearchableFilterProps) {
  const [options, setOptions] = useState<Array<{ value: string; label: string; count?: number }>>([])
  const [loading, setLoading] = useState(false)
  const [internalSearch, setInternalSearch] = useState('')
  const debouncedSearch = useDebounce(internalSearch, 300)
  const hasLoadedInitial = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchOptions = useCallback(async (searchTerm: string) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setLoading(true)
    try {
      const params = new URLSearchParams({
        field,
        search: searchTerm,
        limit: '50',
      })
      const response = await fetch(`/api/releases/filter-options?${params}`, {
        signal: abortController.signal,
      })
      
      if (abortController.signal.aborted) {
        return
      }

      const data = await response.json()
      if (data.options) {
        setOptions(data.options)
      } else {
        setOptions([])
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return
      }
      console.error('Failed to fetch filter options:', error)
      setOptions([])
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }, [field])

  // Load initial options on mount
  useEffect(() => {
    if (!hasLoadedInitial.current) {
      fetchOptions('')
      hasLoadedInitial.current = true
    }
  }, []) // Empty deps - only run once

  // Update options when search changes (debounced)
  useEffect(() => {
    if (hasLoadedInitial.current) {
      fetchOptions(debouncedSearch)
    }
  }, [debouncedSearch]) // Only depend on debouncedSearch

  // Ensure selected value is in options
  useEffect(() => {
    if (value && value !== 'all' && !options.find(opt => opt.value === value)) {
      setOptions(prev => {
        if (prev.find(opt => opt.value === value)) return prev
        return [{ value, label: value }, ...prev]
      })
    }
  }, [value, options])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleSearchChange = (searchValue: string) => {
    setInternalSearch(searchValue)
  }

  const handleValueChange = (newValue: string | undefined) => {
    onValueChange(newValue)
    // Reset search when value changes
    setInternalSearch('')
  }

  return (
    <div className={className}>
      <Combobox
        options={options}
        value={value && value !== 'all' ? value : undefined}
        onValueChange={handleValueChange}
        onSearchChange={handleSearchChange}
        placeholder={`All ${label}s`}
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        emptyMessage={loading ? 'Loading...' : `No ${label.toLowerCase()} found`}
        className="w-full"
        loading={loading}
      />
    </div>
  )
}


