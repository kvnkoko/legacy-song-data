import { UserRole } from '@prisma/client'

export const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  [UserRole.A_R]: '/ar/releases',
  [UserRole.PLATFORM_YOUTUBE]: '/platforms/youtube',
  [UserRole.PLATFORM_FLOW]: '/platforms/flow',
  [UserRole.PLATFORM_RINGTUNES]: '/platforms/ringtunes',
  [UserRole.PLATFORM_INTERNATIONAL_STREAMING]: '/platforms/international-streaming',
  [UserRole.PLATFORM_FACEBOOK]: '/platforms/facebook',
  [UserRole.PLATFORM_TIKTOK]: '/platforms/tiktok',
  [UserRole.ADMIN]: '/dashboard',
  [UserRole.MANAGER]: '/dashboard',
  [UserRole.DATA_TEAM]: '/dashboard',
  [UserRole.CLIENT]: '/submit',
}

export function getRoleRedirectPath(role: UserRole): string {
  return ROLE_REDIRECT_MAP[role] || '/dashboard'
}



