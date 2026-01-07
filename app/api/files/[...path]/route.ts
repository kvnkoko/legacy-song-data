import { NextRequest, NextResponse } from 'next/server'
import { getFileUrl } from '@/lib/storage'

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const key = params.path.join('/')
    
    // Generate signed URL (valid for 1 hour)
    const url = await getFileUrl(key, 3600)
    
    // Redirect to the signed URL
    return NextResponse.redirect(url)
  } catch (error: any) {
    console.error('File serve error:', error)
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  }
}





