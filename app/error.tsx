'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  // Check if we're on the import page - if so, show a message that import continues
  const isImportPage = typeof window !== 'undefined' && window.location.pathname.includes('/import-csv')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong!</CardTitle>
          </div>
          <CardDescription>
            {isImportPage ? (
              <>
                A page error occurred, but your CSV import continues in the background. 
                You can safely refresh this page or navigate away - the import will not be interrupted.
              </>
            ) : (
              'An unexpected error occurred. Please try again.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}
          {isImportPage && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                💡 Tip: Your import is running server-side and will continue even if this page has errors. 
                Check the releases page after a few minutes to see your imported data.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Go home
            </Button>
            {isImportPage && (
              <Button onClick={() => window.location.href = '/import-csv'} variant="outline">
                Return to Import
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



