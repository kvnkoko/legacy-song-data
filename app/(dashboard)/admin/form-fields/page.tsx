import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldManager } from '@/components/form-field-manager'

export default async function FormFieldsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const role = session.user.role as UserRole
  
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    redirect('/dashboard')
  }

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Form Field Management</h1>
        <p className="text-muted-foreground mt-1.5">
          Configure the artist submission form fields, set required/optional status, and add new fields
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Artist Submission Form Fields</CardTitle>
          <CardDescription>
            Manage fields that artists see when submitting releases. New fields will automatically create corresponding database columns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormFieldManager />
        </CardContent>
      </Card>
    </div>
  )
}


