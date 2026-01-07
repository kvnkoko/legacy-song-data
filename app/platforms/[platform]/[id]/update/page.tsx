import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { UserRole, PlatformRequestStatus } from '@prisma/client'
import { PlatformRequestUpdateForm } from '@/components/platform-request-update-form'
import { FocusedLayout } from '@/components/focused-layout'

const PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  flow: 'flow',
  ringtunes: 'ringtunes',
  'international-streaming': 'international_streaming',
  facebook: 'facebook',
  tiktok: 'tiktok',
}

export default async function PlatformRequestUpdatePage({
  params,
}: {
  params: { platform: string; id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const platformSlug = params.platform
  const platformName = PLATFORM_MAP[platformSlug]

  if (!platformName) {
    notFound()
  }

  const userRole = session.user.role as UserRole

  // Check access - platform team members, A&R, Admin, Manager can update
  const canUpdate = 
    userRole === UserRole.ADMIN ||
    userRole === UserRole.MANAGER ||
    userRole === UserRole.A_R ||
    (userRole === UserRole.PLATFORM_YOUTUBE && platformName === 'youtube') ||
    (userRole === UserRole.PLATFORM_FLOW && platformName === 'flow') ||
    (userRole === UserRole.PLATFORM_RINGTUNES && platformName === 'ringtunes') ||
    (userRole === UserRole.PLATFORM_INTERNATIONAL_STREAMING && platformName === 'international_streaming') ||
    (userRole === UserRole.PLATFORM_FACEBOOK && platformName === 'facebook') ||
    (userRole === UserRole.PLATFORM_TIKTOK && platformName === 'tiktok')

  if (!canUpdate) {
    redirect('/dashboard')
  }

  const request = await prisma.platformRequest.findUnique({
    where: { id: params.id },
    include: {
      release: {
        include: {
          artist: true,
          tracks: true,
        },
      },
      track: true,
      decisions: {
        orderBy: { createdAt: 'desc' },
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

  if (!request || request.platform !== platformName) {
    notFound()
  }

  // Get channels for this platform (if YouTube or Facebook)
  const channels = (platformName === 'youtube' || platformName === 'facebook')
    ? await prisma.platformChannel.findMany({
        where: {
          platform: platformName,
          active: true,
        },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <FocusedLayout
      title="Update Platform Request"
      description={`${request.release?.title} by ${request.release?.artist.name}`}
    >
      <div className="max-w-4xl mx-auto">
        <PlatformRequestUpdateForm 
          request={request} 
          platform={platformName}
          channels={channels}
        />
      </div>
    </FocusedLayout>
  )
}




