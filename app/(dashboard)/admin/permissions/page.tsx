import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { FieldPermissionManager } from '@/components/field-permission-manager'

export default async function PermissionsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
          Field Permissions
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-2xl">
          Control which roles can view, edit, and require specific fields across releases, tracks, and platform requests. 
          Changes affect form visibility and validation rules.
        </p>
      </div>

      <FieldPermissionManager />
    </div>
  )
}

