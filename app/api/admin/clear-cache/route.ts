import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

/**
 * Clear Cache API Endpoint
 * Clears Next.js cache for import-related pages
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow ADMIN users
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Revalidate import-related pages
    try {
      revalidatePath('/import-csv')
      revalidatePath('/dashboard')
      revalidatePath('/releases')
    } catch (e) {
      console.warn('Failed to revalidate some paths:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      revalidated: [
        '/import-csv',
        '/dashboard',
        '/releases',
      ],
    })
  } catch (error: any) {
    console.error('❌ Error clearing cache:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
