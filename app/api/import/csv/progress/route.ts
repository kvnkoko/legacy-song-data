import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Server-Sent Events endpoint for progress updates
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('sessionId required', { status: 400 })
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      // Poll for progress updates
      const interval = setInterval(async () => {
        try {
          const importSession = await prisma.importSession.findUnique({
            where: { id: sessionId },
          })

          if (!importSession) {
            controller.enqueue(encoder.encode('data: {"type":"error","message":"Session not found"}\n\n'))
            clearInterval(interval)
            controller.close()
            return
          }

          const progress = {
            type: 'progress',
            sessionId: importSession.id,
            totalRows: importSession.totalRows,
            rowsProcessed: importSession.rowsProcessed,
            percentage: importSession.totalRows > 0
              ? Math.round((importSession.rowsProcessed / importSession.totalRows) * 100)
              : 0,
            status: importSession.status,
            error: importSession.error,
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))

          // Close stream if completed, failed, or cancelled
          if (['completed', 'failed', 'cancelled'].includes(importSession.status)) {
            clearInterval(interval)
            controller.close()
          }
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
          )
          clearInterval(interval)
          controller.close()
        }
      }, 500) // Poll every 500ms

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}



