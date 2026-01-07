import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { 
  Calendar, 
  User, 
  Music, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ExternalLink,
  Edit
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { InlineReleaseEditor } from '@/components/inline-release-editor'
import { InlineTrackEditor } from '@/components/inline-track-editor'
import { ReleaseDetailClient, TrackEditButton, TrackArtistsDisplay } from '@/components/release-detail-client'

export default async function ReleaseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: true,
      tracks: {
        orderBy: { trackNumber: 'asc' },
        include: {
          trackArtists: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  legalName: true,
                },
              },
            },
          },
        },
      },
      releaseArtists: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              legalName: true,
            },
          },
        },
      },
      platformRequests: {
        include: {
          track: true,
          decisions: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: true,
            },
          },
        },
      },
      comments: {
        include: {
          user: true,
          replies: {
            include: {
              user: true,
            },
          },
        },
        where: { parentId: null },
        orderBy: { createdAt: 'desc' },
      },
      assignedA_R: {
        include: {
          user: true,
        },
      },
    },
  })

  // Get employees for A&R assignment dropdown
  const employees = await prisma.employee.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!release) {
    return <div>Release not found</div>
  }

  const userRole = session.user.role as UserRole
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER || userRole === UserRole.A_R || userRole === UserRole.DATA_TEAM

  // Get primary and secondary artists for release
  const primaryReleaseArtist = release.artist
  const secondaryReleaseArtists = release.releaseArtists
    .filter(ra => !ra.isPrimary && ra.artistId !== release.artistId)
    .map(ra => ra.artist)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/releases">
              <Button variant="ghost" size="sm">← Back</Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{release.title}</h1>
          <div className="mt-1">
            <div className="flex flex-wrap gap-1 items-center">
              {/* All artists together: first highlighted (primary), rest normal (secondary) */}
              <Badge variant="default" className="font-bold">{primaryReleaseArtist.name}</Badge>
              {secondaryReleaseArtists.map((artist) => (
                <Badge key={artist.id} variant="outline">{artist.name}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ReleaseDetailClient release={release} userRole={userRole} employees={employees} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Release Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Release Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Type</div>
                <Badge variant="outline">{release.type}</Badge>
              </div>
              
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Artist
                </div>
                <div className="font-medium">{release.artist.name}</div>
                {release.artist.legalName && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Legal: {release.artist.legalName}
                  </div>
                )}
              </div>

              {release.artistsChosenDate && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Artist's Chosen Date
                  </div>
                  <div className="font-medium">{formatDate(release.artistsChosenDate)}</div>
                </div>
              )}

              {release.legacyReleaseDate && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Legacy Release Date
                  </div>
                  <div className="font-medium">{formatDate(release.legacyReleaseDate)}</div>
                </div>
              )}

              {release.assignedA_R && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Assigned A&R</div>
                  <div className="font-medium">{release.assignedA_R.user.name}</div>
                </div>
              )}

              {release.copyrightStatus && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Copyright</div>
                  <Badge variant="secondary">{release.copyrightStatus}</Badge>
                </div>
              )}

              {release.videoType && release.videoType !== 'NONE' && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Video Type</div>
                  <Badge variant="secondary">{release.videoType}</Badge>
                </div>
              )}
            </div>

            {release.paymentRemarks && (
              <div className="pt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">Payment Remarks</div>
                <p className="text-sm">{release.paymentRemarks}</p>
              </div>
            )}

            {release.notes && (
              <div className="pt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">Notes</div>
                <p className="text-sm whitespace-pre-wrap">{release.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Requests</CardTitle>
            <CardDescription>Status across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {release.platformRequests.length > 0 ? (
                release.platformRequests.map((request) => (
                  <div key={request.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {request.status === 'UPLOADED' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {request.status === 'APPROVED' && <Clock className="h-4 w-4 text-blue-600" />}
                        {request.status === 'REJECTED' && <XCircle className="h-4 w-4 text-red-600" />}
                        {request.status === 'PENDING' && <Clock className="h-4 w-4 text-yellow-600" />}
                        <div className="font-medium capitalize">{request.platform.replace('_', ' ')}</div>
                      </div>
                      <Badge 
                        variant={
                          request.status === 'UPLOADED' ? 'default' :
                          request.status === 'APPROVED' ? 'secondary' :
                          request.status === 'REJECTED' ? 'destructive' :
                          'outline'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    {request.channelName && (
                      <div className="text-sm text-muted-foreground">
                        Channel: {request.channelName}
                      </div>
                    )}
                    {request.uploadLink && (
                      <a
                        href={request.uploadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                      >
                        View Upload <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No platform requests
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Music className="h-3 w-3" />
                Total Tracks
              </div>
              <div className="text-2xl font-bold">{release.tracks.length}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Platform Requests</div>
              <div className="text-2xl font-bold">{release.platformRequests.length}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Uploaded Platforms</div>
              <div className="text-2xl font-bold">
                {release.platformRequests.filter(p => p.status === 'UPLOADED').length}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Submitted</div>
              <div className="text-sm font-medium">{formatDate(release.submittedAt)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Tracks ({release.tracks.length})
          </CardTitle>
          <CardDescription>All songs in this release</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {release.tracks.map((track, index) => (
              <div key={track.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{track.name}</h3>
                      {track.genre && (
                        <Badge variant="outline" className="mt-1">{track.genre}</Badge>
                      )}
                      <TrackArtistsDisplay track={track} releaseArtist={release.artist} />
                    </div>
                  </div>
                  {canEdit && (
                    <TrackEditButton track={track} />
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                  {track.performer && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Artist</div>
                      <div className="font-medium">{track.performer}</div>
                    </div>
                  )}
                  {track.composer && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Composer</div>
                      <div className="font-medium">{track.composer}</div>
                    </div>
                  )}
                  {track.band && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Band/Producer</div>
                      <div className="font-medium">{track.band}</div>
                    </div>
                  )}
                  {track.musicProducer && track.musicProducer !== track.band && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Music Producer</div>
                      <div className="font-medium">{track.musicProducer}</div>
                    </div>
                  )}
                  {track.studio && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Studio</div>
                      <div className="font-medium">{track.studio}</div>
                    </div>
                  )}
                  {track.recordLabel && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Record Label</div>
                      <div className="font-medium">{track.recordLabel}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {release.tracks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tracks in this release
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {release.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comments & Notes</CardTitle>
            <CardDescription>Team discussions and notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {release.comments.map((comment) => (
                <div key={comment.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {(comment.user.name || comment.user.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{comment.user.name || comment.user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  {comment.replies.length > 0 && (
                    <div className="mt-3 ml-12 space-y-2 border-l-2 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                              <span className="text-xs font-semibold">
                                {(reply.user.name || reply.user.email)[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-xs">{reply.user.name || reply.user.email}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(reply.createdAt)}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

