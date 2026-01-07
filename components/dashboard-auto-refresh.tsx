'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Silent background auto-refresh component
 * Refreshes dashboard every 10 seconds when imports are active
 * No visual indicators - runs completely in background
 */

export function DashboardAutoRefresh() {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  useEffect(() => {
    const checkActiveImport = async () => {
      try {
        const response = await fetch('/api/import/csv/session?status=in_progress', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.session && data.session.status === 'in_progress') {
            // Active import detected - refresh the dashboard silently in background
            router.refresh()
            
            // Start continuous polling if not already polling
            if (!isPollingRef.current) {
              isPollingRef.current = true
              
              // Clear any existing interval
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
              }
              
              // Set up polling every 30 seconds while import is active (silent background refresh)
              // Increased from 10s to reduce server load
              intervalRef.current = setInterval(async () => {
                try {
                  const checkResponse = await fetch('/api/import/csv/session?status=in_progress', {
                    cache: 'no-store',
                    headers: {
                      'Cache-Control': 'no-cache',
                    },
                  })
                  
                  if (checkResponse.ok) {
                    const checkData = await checkResponse.json()
                    
                    if (checkData.session && checkData.session.status === 'in_progress') {
                      // Still importing - refresh dashboard silently in background
                      router.refresh()
                    } else {
                      // Import completed or no longer active
                      if (intervalRef.current) {
                        clearInterval(intervalRef.current)
                        intervalRef.current = null
                        isPollingRef.current = false
                      }
                      // Final refresh to get latest data
                      router.refresh()
                    }
                  } else {
                    // If check fails, stop polling to avoid excessive requests
                    if (intervalRef.current) {
                      clearInterval(intervalRef.current)
                      intervalRef.current = null
                      isPollingRef.current = false
                    }
                  }
                } catch (err) {
                  // On error, stop polling to avoid excessive requests
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                    isPollingRef.current = false
                  }
                }
              }, 30000) // Refresh every 30 seconds during active import (reduced frequency)
            }
          } else {
            // No active import found
            if (isPollingRef.current) {
              // Stop polling if we were polling
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
                isPollingRef.current = false
              }
            }
            
            // Continue checking periodically for new imports (every 30 seconds)
            setTimeout(checkActiveImport, 30000)
          }
        } else {
          // Response not ok, check again (every 30 seconds)
          setTimeout(checkActiveImport, 30000)
        }
      } catch (err) {
        // On error, continue checking (every 30 seconds)
        setTimeout(checkActiveImport, 30000)
      }
    }

    // Start checking after initial delay
    const initialTimeout = setTimeout(checkActiveImport, 5000) // Increased from 2s to 5s

    // Set up a periodic check every 60 seconds as a fallback (reduced frequency)
    const fallbackInterval = setInterval(checkActiveImport, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearInterval(fallbackInterval)
      clearTimeout(initialTimeout)
    }
  }, [router])

  // Silent background refresh - no visual indicator
  return null
}

