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
import { StopCircle, Loader2, CheckCircle2 } from 'lucide-react'

export function CancelImportsButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    cancelled?: number
  } | null>(null)

  const handleCancel = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/cancel-all-imports', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel imports')
      }

      setResult({
        success: true,
        message: data.message,
        cancelled: data.cancelled,
      })

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to cancel imports',
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
              Stopping...
            </>
          ) : (
            <>
              <StopCircle className="w-4 h-4 mr-2" />
              Stop All Imports
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🛑 Stop All Active Imports</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>This will immediately cancel all currently running CSV imports.</p>
            <p className="font-semibold text-destructive">
              Any progress on active imports will be lost.
            </p>
            {result && (
              <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <StopCircle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className={`font-semibold ${result.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                      {result.success ? '✅ Imports Stopped' : '❌ Error'}
                    </p>
                    {result.message && <p className="text-sm mt-1">{result.message}</p>}
                    {result.cancelled !== undefined && (
                      <p className="text-sm mt-1">
                        Cancelled {result.cancelled} import(s)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Stopping...
              </>
            ) : (
              'Yes, Stop All Imports'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

