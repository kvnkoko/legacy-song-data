'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function DeleteReleasesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!confirm('Are you absolutely sure you want to delete ALL releases? This action cannot be undone!')) {
      return
    }

    if (!confirm('This will delete ALL releases, tracks, platform requests, and all related data. Type "DELETE ALL" to confirm.')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/delete-all-releases', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete releases')
      }

      setResult(data)
      toast({
        title: 'Success',
        description: `Successfully deleted ${data.deleted.releases} releases and all related data.`,
      })
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete releases',
        variant: 'destructive',
      })
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Delete All Releases</h1>
        <p className="text-muted-foreground mt-2">
          Permanently delete all releases and related data from the database.
        </p>
      </div>

      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">Warning</h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                This action will permanently delete ALL releases, tracks, platform requests, comments, audit logs, and all related data.
                This action cannot be undone. Make sure you have a backup if needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete All Releases</CardTitle>
          <CardDescription>
            Click the button below to delete all releases and related data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Releases
              </>
            )}
          </Button>

          {result && !result.error && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Deletion Complete</h3>
              <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <li>Releases: {result.deleted.releases}</li>
                <li>Tracks: {result.deleted.tracks}</li>
                <li>Track Artists: {result.deleted.trackArtists}</li>
                <li>Release Artists: {result.deleted.releaseArtists}</li>
                <li>Platform Requests: {result.deleted.platformRequests}</li>
                <li>Comments: {result.deleted.comments}</li>
                <li>Audit Logs: {result.deleted.auditLogs}</li>
                <li>Import Attachments: {result.deleted.importAttachments}</li>
              </ul>
            </div>
          )}

          {result && result.error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Error</h3>
              <p className="text-sm text-red-800 dark:text-red-200">{result.error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

