'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DatabaseCleanupButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    deleted?: Record<string, number>
    remaining?: Record<string, number>
  } | null>(null)
  const router = useRouter()

  const handleCleanup = async () => {
    setLoading(true)
    setResult(null)

    try {
      // First, cancel ALL active imports
      try {
        const cancelResponse = await fetch('/api/admin/cancel-all-imports', {
          method: 'POST',
        })
        if (cancelResponse.ok) {
          const cancelData = await cancelResponse.json()
          console.log(`✅ Cancelled ${cancelData.cancelled} active import(s)`)
          if (cancelData.failed > 0) {
            console.warn(`⚠️  Failed to cancel ${cancelData.failed} import(s)`)
          }
        }
      } catch (e) {
        console.warn('Failed to cancel imports:', e)
        // Continue with cleanup anyway
      }

      // Then run the cleanup
      const response = await fetch('/api/admin/cleanup-database', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup database')
      }

      setResult({
        success: true,
        message: data.message,
        deleted: data.deleted,
        remaining: data.remaining,
      })

      // Clear all import-related cache
      try {
        // Clear localStorage
        const localStorageKeys = [
          'csv-import-file',
          'csv-import-preview',
          'csv-import-mappings',
          'csv-import-progress',
        ]
        localStorageKeys.forEach((key: string) => {
          localStorage.removeItem(key)
        })
        
        // Clear any other import-related localStorage keys
        Object.keys(localStorage).forEach((key: string) => {
          if (key.startsWith('csv-import') || key.startsWith('import-')) {
            localStorage.removeItem(key)
          }
        })
        
        // Clear sessionStorage
        const sessionStorageKeys = [
          'csv-import-file',
          'csv-import-preview',
          'csv-import-mappings',
          'csv-import-progress',
        ]
        sessionStorageKeys.forEach((key: string) => {
          sessionStorage.removeItem(key)
        })
        
        // Clear any other import-related sessionStorage keys
        Object.keys(sessionStorage).forEach((key: string) => {
          if (key.startsWith('csv-import') || key.startsWith('import-')) {
            sessionStorage.removeItem(key)
          }
        })
        
        // Also clear Next.js cache
        try {
          await fetch('/api/admin/clear-cache', { method: 'POST' })
        } catch (e) {
          // Ignore cache clearing errors
        }
        
        console.log('✅ All cache cleared')
      } catch (e) {
        console.warn('Failed to clear cache:', e)
      }

      // Clear Next.js cache and force hard refresh
      try {
        // Clear Next.js router cache
        router.refresh()
        
        // Clear all caches
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name))
          })
        }
        
        // Force hard reload after a delay to ensure cleanup is complete
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      } catch (e) {
        // If refresh fails, just reload
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to cleanup database',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={loading} className="w-full justify-start px-4 py-2">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Cleaning...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup Database
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Database Cleanup</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p className="font-semibold text-destructive">
              This will DELETE ALL DATA except your admin user profile!
            </p>
            <p>This action will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All releases and tracks</li>
              <li>All artists</li>
              <li>All employees and users (except admin)</li>
              <li>All platform requests</li>
              <li>All audit logs and comments</li>
              <li>All import sessions</li>
            </ul>
            <p className="font-semibold mt-4">
              This action CANNOT be undone. Are you absolutely sure?
            </p>
            {result && (
              <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                <p className={`font-semibold ${result.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {result.success ? '✅ Cleanup Completed!' : '❌ Error'}
                </p>
                {result.message && <p className="text-sm mt-1">{result.message}</p>}
                {result.deleted && (
                  <div className="mt-2 text-sm">
                    <p className="font-semibold">Deleted:</p>
                    <ul className="list-disc list-inside ml-4">
                      {Object.entries(result.deleted).map(([key, value]) => (
                        <li key={key}>
                          {key}: {value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.remaining && (
                  <div className="mt-2 text-sm">
                    <p className="font-semibold">Remaining:</p>
                    <ul className="list-disc list-inside ml-4">
                      {Object.entries(result.remaining).map(([key, value]) => (
                        <li key={key}>
                          {key}: {value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCleanup}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cleaning...
              </>
            ) : (
              'Yes, Delete Everything'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

