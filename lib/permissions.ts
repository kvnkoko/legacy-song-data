import { UserRole } from '@prisma/client'
import { prisma } from './db'

export type EntityType = 'release' | 'track' | 'platform_request'

export interface FieldPermission {
  canView: boolean
  canEdit: boolean
  isRequired: boolean
}

export async function getFieldPermission(
  fieldName: string,
  entityType: EntityType,
  role: UserRole
): Promise<FieldPermission> {
  const permission = await prisma.fieldPermission.findUnique({
    where: {
      fieldName_entityType_role: {
        fieldName,
        entityType,
        role,
      },
    },
  })

  if (permission) {
    return {
      canView: permission.canView,
      canEdit: permission.canEdit,
      isRequired: permission.isRequired,
    }
  }

  // Default permissions based on role
  return getDefaultPermissions(role, entityType, fieldName)
}

function getDefaultPermissions(
  role: UserRole,
  entityType: EntityType,
  fieldName: string
): FieldPermission {
  // Admin and Manager have full access
  if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
    return { canView: true, canEdit: true, isRequired: false }
  }

  // Client/Artist can only view their own submissions
  if (role === UserRole.CLIENT) {
    const clientViewableFields = [
      'title',
      'artistsChosenDate',
      'name',
      'performer',
      'composer',
      'band',
      'musicProducer',
      'studio',
      'recordLabel',
      'genre',
    ]
    return {
      canView: clientViewableFields.includes(fieldName),
      canEdit: false,
      isRequired: false,
    }
  }

  // Platform teams can view and edit their platform-specific fields
  const platformFields: Record<string, string[]> = {
    [UserRole.PLATFORM_YOUTUBE]: ['youtube', 'channelName', 'channelId', 'uploadLink'],
    [UserRole.PLATFORM_FLOW]: ['flow'],
    [UserRole.PLATFORM_RINGTUNES]: ['ringtunes'],
    [UserRole.PLATFORM_INTERNATIONAL_STREAMING]: ['international_streaming'],
    [UserRole.PLATFORM_FACEBOOK]: ['facebook'],
    [UserRole.PLATFORM_TIKTOK]: ['tiktok'],
  }

  if (platformFields[role]?.some(pf => fieldName.toLowerCase().includes(pf))) {
    return { canView: true, canEdit: true, isRequired: false }
  }

  // A&R and Data Team have broader access
  if (role === UserRole.A_R || role === UserRole.DATA_TEAM) {
    return { canView: true, canEdit: true, isRequired: false }
  }

  // Default: view only
  return { canView: true, canEdit: false, isRequired: false }
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  // All authenticated roles can access internal routes
  // Submit and status pages are public (no auth required)
  return true
}

