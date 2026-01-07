import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { UserPlus, User } from 'lucide-react'
import { ArtistForm } from '@/components/artist-form'

export default async function ArtistsAdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const artists = await prisma.artist.findMany({
    include: {
      releases: {
        include: {
          tracks: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Artists</h1>
          <p className="text-muted-foreground mt-1.5">Add and manage artists in the system</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">Back to Admin</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Artists</CardTitle>
              <CardDescription>Artists in the database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {artists.map((artist) => {
                  const totalReleases = artist.releases.length
                  const totalTracks = artist.releases.reduce((sum, r) => sum + r.tracks.length, 0)
                  
                  return (
                    <div
                      key={artist.id}
                      className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 hover:border-border/80 transition-all duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" title={artist.name}>{artist.name}</div>
                        {artist.legalName && (
                          <div className="text-sm text-muted-foreground truncate" title={`Legal: ${artist.legalName}`}>Legal: {artist.legalName}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {totalReleases} releases • {totalTracks} tracks
                          {artist.contactEmail && ` • ${artist.contactEmail}`}
                          {artist.contactPhone && ` • ${artist.contactPhone}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/profiles/artist/${artist.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                        <Link href={`/admin/artists/${artist.id}/edit`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
                {artists.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No artists yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add Artist</CardTitle>
              <CardDescription>Create a new artist record</CardDescription>
            </CardHeader>
            <CardContent>
              <ArtistForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


