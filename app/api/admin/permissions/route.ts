import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')

    const permissions = await prisma.fieldPermission.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: [
        { entityType: 'asc' },
        { fieldName: 'asc' },
        { role: 'asc' },
      ],
    })

    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { entityType, permissions } = body

    // Upsert each permission
    for (const perm of permissions) {
      await prisma.fieldPermission.upsert({
        where: {
          fieldName_entityType_role: {
            fieldName: perm.fieldName,
            entityType: perm.entityType,
            role: perm.role,
          },
        },
        update: {
          canView: perm.canView,
          canEdit: perm.canEdit,
          isRequired: perm.isRequired,
        },
        create: {
          fieldName: perm.fieldName,
          entityType: perm.entityType,
          role: perm.role,
          canView: perm.canView,
          canEdit: perm.canEdit,
          isRequired: perm.isRequired,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving permissions:', error)
    return NextResponse.json(
      { error: 'Failed to save permissions' },
      { status: 500 }
    )
  }
}



