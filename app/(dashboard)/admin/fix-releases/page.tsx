'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function FixReleasesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [identifying, setIdentifying] = useState(false)
  const [problematicReleases, setProblematicReleases] = useState<any[]>([])
  const [selectedReleases, setSelectedReleases] = useState<Set<string>>(new Set())
  const [fixing, setFixing] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [sessionId, setSessionId] = useState('')

  const identifyProblems = async () => {
    setIdentifying(true)
    try {
      const response = await fetch('/api/admin/fix-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'identify' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to identify problems')
      }

      const data = await response.json()
      setProblematicReleases(data.releases || [])
      
      toast({
        title: 'Identification Complete',
        description: `Found ${data.count} releases with potential issues.`,
        variant: 'default',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to identify problematic releases',
        variant: 'destructive',
      })
    } finally {
      setIdentifying(false)
    }
  }

  const fixSelected = async () => {
    if (selectedReleases.size === 0) {
      toast({
        title: 'No Releases Selected',
        description: 'Please select releases to fix.',
        variant: 'default',
      })
      return
    }

    setFixing(true)
    try {
      const response = await fetch('/api/admin/fix-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fix',
          releaseIds: Array.from(selectedReleases),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fix releases')
      }

      const data = await response.json()
      
      toast({
        title: 'Fix Complete',
        description: `Fixed ${data.fixed} releases. ${data.errors} errors.`,
        variant: data.errors > 0 ? 'default' : 'default',
      })

      // Refresh the list
      await identifyProblems()
      setSelectedReleases(new Set())
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fix releases',
        variant: 'destructive',
      })
    } finally {
      setFixing(false)
    }
  }

  const reprocessFailed = async () => {
    if (!sessionId.trim()) {
      toast({
        title: 'Session ID Required',
        description: 'Please enter an import session ID.',
        variant: 'default',
      })
      return
    }

    setReprocessing(true)
    try {
      const response = await fetch('/api/admin/fix-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reprocess-failed',
          sessionId: sessionId.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reprocess failed rows')
      }

      const data = await response.json()
      
      toast({
        title: 'Reprocessing Complete',
        description: `Reprocessed ${data.reprocessed} rows. ${data.successCount} succeeded, ${data.errorCount} failed.`,
        variant: data.errorCount > 0 ? 'default' : 'default',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reprocess failed rows',
        variant: 'destructive',
      })
    } finally {
      setReprocessing(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fix Import Issues</h1>
        <p className="text-muted-foreground mt-2">
          Fix releases with incorrect data and reprocess failed import rows
        </p>
      </div>

      {/* Fix Releases with Notes-like Titles */}
      <Card>
        <CardHeader>
        <CardTitle>Fix Releases with Incorrect Titles</CardTitle>
        <CardDescription>
          Identify and fix releases where any CSV column (Notes, Payment Remarks, Platform Status, etc.) was incorrectly imported as the release title
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={identifyProblems} disabled={identifying}>
              {identifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Identifying...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Identify Problems
                </>
              )}
            </Button>
            {problematicReleases.length > 0 && (
              <Button
                onClick={fixSelected}
                disabled={fixing || selectedReleases.size === 0}
                variant="default"
              >
                {fixing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Fix Selected ({selectedReleases.size})
                  </>
                )}
              </Button>
            )}
          </div>

          {problematicReleases.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Found {problematicReleases.length} releases with potential issues:
              </p>
              <div className="max-h-96 overflow-y-auto border rounded-lg p-4 space-y-2">
                {problematicReleases.map((release) => (
                  <div
                    key={release.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedReleases.has(release.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedReleases)
                        if (e.target.checked) {
                          newSelected.add(release.id)
                        } else {
                          newSelected.delete(release.id)
                        }
                        setSelectedReleases(newSelected)
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        <div className="text-red-600 dark:text-red-400 line-through">
                          {release.title}
                        </div>
                        {release.potentialTitle && (
                          <div className="text-green-600 dark:text-green-400 mt-1">
                            → {release.potentialTitle}
                          </div>
                        )}
                      </div>
                      {release.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Current Notes: {release.notes.substring(0, 80)}...
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                        <span>ID: {release.id.substring(0, 8)}...</span>
                        {release.hasRawRow && (
                          <span className="text-green-600">Has raw data</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reprocess Failed Rows */}
      <Card>
        <CardHeader>
          <CardTitle>Reprocess Failed Import Rows</CardTitle>
          <CardDescription>
            Re-process rows that failed during CSV import using the improved validation logic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Import Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter import session ID"
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-muted-foreground">
              You can find the session ID from the import CSV page or from the import session list.
            </p>
          </div>
          <Button onClick={reprocessFailed} disabled={reprocessing || !sessionId.trim()}>
            {reprocessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reprocessing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reprocess Failed Rows
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

