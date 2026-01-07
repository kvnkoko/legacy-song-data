import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default async function StatusPage({
  params,
}: {
  params: { id: string }
}) {
  // Status page is public - no auth required
  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      },
      tracks: {
        orderBy: { trackNumber: 'asc' },
      },
      platformRequests: true,
    },
  })

  if (!release) {
    return <div>Release not found</div>
  }

  // Status page is public - anyone with the link can view

  // Determine overall status
  const hasUploaded = release.platformRequests.some(p => p.status === 'UPLOADED')
  const allPending = release.platformRequests.every(p => p.status === 'PENDING')

  let status = 'In Review'
  if (hasUploaded) {
    status = 'Uploaded'
  } else if (allPending) {
    status = 'Pending Review'
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Submission Status</CardTitle>
            <CardDescription>Track the status of your release submission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className="text-2xl font-bold">{status}</div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Release Information</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Title:</strong> {release.title}</div>
                <div><strong>Artist:</strong> {release.artist.name}</div>
                <div><strong>Type:</strong> {release.type}</div>
                {release.artistsChosenDate && (
                  <div><strong>Your Chosen Date:</strong> {formatDate(release.artistsChosenDate)}</div>
                )}
                <div><strong>Submitted:</strong> {formatDate(release.submittedAt)}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Songs ({release.tracks.length})</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {release.tracks.map((track) => (
                  <li key={track.id}>{track.name}</li>
                ))}
              </ul>
            </div>

            {release.platformRequests.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Platform Status</h3>
                <div className="space-y-2">
                  {release.platformRequests.map((request) => (
                    <div key={request.id} className="flex justify-between items-center p-2 border rounded text-sm">
                      <span className="capitalize">{request.platform.replace('_', ' ')}</span>
                      <span className={`px-2 py-1 rounded ${
                        request.status === 'UPLOADED' ? 'bg-flow-green/20 text-flow-green-foreground dark:bg-flow-green/30 dark:text-flow-green' :
                        request.status === 'REJECTED' ? 'bg-destructive/20 text-destructive dark:bg-destructive/30 dark:text-destructive' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <a href="/submit" className="text-sm text-blue-600 hover:underline">
                Submit another release →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

