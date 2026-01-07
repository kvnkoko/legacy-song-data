import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ArtistEditForm } from '@/components/artist-edit-form'

export default async function EditArtistPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const artist = await prisma.artist.findUnique({
    where: { id: params.id },
    include: {
      releases: {
        include: {
          tracks: true,
        },
      },
    },
  })

  if (!artist) {
    notFound()
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Artist</h1>
        <p className="text-muted-foreground mt-1">
          Update artist information
        </p>
      </div>

      <ArtistEditForm artist={artist} />
    </div>
  )
}






