import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { UserRole, EmployeeStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ReleaseEditForm } from '@/components/release-edit-form'

export default async function EditReleasePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  // Allow A&R, Admin, and Manager to edit
  if (role !== UserRole.A_R && role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: true,
      releaseArtists: {
        include: {
          artist: true,
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' },
        ],
      },
      tracks: {
        include: {
          trackArtists: {
            include: {
              artist: true,
            },
            orderBy: [
              { isPrimary: 'desc' },
              { createdAt: 'asc' },
            ],
          },
        },
        orderBy: { trackNumber: 'asc' },
      },
      platformRequests: {
        include: {
          channel: true,
        },
      },
      assignedA_R: {
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
    },
  })

  if (!release) {
    notFound()
  }

  // Get all employees for A&R assignment
  const employees = await prisma.employee.findMany({
    where: {
      user: {
        role: {
          in: [UserRole.A_R, UserRole.ADMIN, UserRole.MANAGER],
        },
      },
      status: EmployeeStatus.ACTIVE,
    },
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
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })

  // Get all artists for selection
  const allArtists = await prisma.artist.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  })

  // Get channels for all platforms that support channels
  const [youtubeChannels, facebookChannels] = await Promise.all([
    prisma.platformChannel.findMany({
      where: {
        platform: 'youtube',
        active: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.platformChannel.findMany({
      where: {
        platform: 'facebook',
        active: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const channelsByPlatform = {
    youtube: youtubeChannels,
    facebook: facebookChannels,
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
          Edit Release
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          {release.title} by {release.artist.name}
        </p>
      </div>

      <ReleaseEditForm 
        release={release} 
        employees={employees}
        allArtists={allArtists}
        channelsByPlatform={channelsByPlatform}
      />
    </div>
  )
}

