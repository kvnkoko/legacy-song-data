import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Safely create an audit log entry, verifying the user exists first
 * Returns true if created, false if skipped (user doesn't exist or no userId provided)
 */
export async function createAuditLog(
  prisma: any,
  data: {
    userId: string | null | undefined
    releaseId?: string | null
    entityType: string
    entityId: string
    action: string
    fieldName?: string | null
    oldValue?: string | null
    newValue?: string | null
  }
): Promise<boolean> {
  // If no userId provided, skip audit log
  if (!data.userId) {
    return false
  }

  try {
    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    })

    if (!userExists) {
      console.warn(`Audit log skipped: User ${data.userId} does not exist in database`)
      return false
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        releaseId: data.releaseId || null,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        fieldName: data.fieldName || null,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
      },
    })

    return true
  } catch (error: any) {
    // Log error but don't throw - audit logs shouldn't break the main operation
    console.error('Failed to create audit log:', error)
    return false
  }
}




