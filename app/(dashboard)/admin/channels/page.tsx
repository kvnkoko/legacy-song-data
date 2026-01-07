import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ChannelManager } from '@/components/channel-manager'

export default async function ChannelsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  const channels = await prisma.platformChannel.findMany({
    orderBy: [
      { platform: 'asc' },
      { name: 'asc' },
    ],
  })

  const platforms = ['youtube', 'flow', 'ringtunes', 'international_streaming', 'facebook', 'tiktok']

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Channels</h1>
        <p className="text-muted-foreground mt-1.5">
          Manage channels for each platform (e.g., YouTube channels)
        </p>
      </div>

      <ChannelManager channels={channels} platforms={platforms} />
    </div>
  )
}


