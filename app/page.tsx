import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessRoute } from '@/lib/permissions'
import { UserRole } from '@prisma/client'
import { getRoleRedirectPath } from '@/lib/role-redirect'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const userRole = session.user.role as UserRole
  const redirectPath = getRoleRedirectPath(userRole)
  redirect(redirectPath)
}

