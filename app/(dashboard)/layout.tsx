import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canAccessRoute } from '@/lib/permissions'
import { UserRole } from '@prisma/client'
import { DashboardSidebar } from '@/components/dashboard-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole

  return (
    <div className="min-h-screen flex bg-background transition-colors duration-300">
      <DashboardSidebar userRole={role} userEmail={session.user.email || ''} />
      <main className="flex-1 overflow-auto lg:ml-0 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}

