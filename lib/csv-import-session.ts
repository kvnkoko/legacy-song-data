// Session management utilities for CSV imports

import { prisma } from './db'
import crypto from 'crypto'

export interface ImportSessionData {
  userId: string
  fileHash: string
  fileName: string
  totalRows: number
  mappingConfig: any
}

export async function createImportSession(data: ImportSessionData) {
  return await prisma.importSession.create({
    data: {
      userId: data.userId,
      fileHash: data.fileHash,
      fileName: data.fileName,
      totalRows: data.totalRows,
      mappingConfig: data.mappingConfig,
      status: 'in_progress',
      rowsProcessed: 0,
    },
  })
}

export async function updateImportSessionProgress(
  sessionId: string,
  rowsProcessed: number
) {
  try {
    // Optimized: Direct update without fetching first (faster)
    // Use raw SQL for maximum performance on large imports
    // Note: ImportSession doesn't have updatedAt field, so we only update rowsProcessed
    await prisma.$executeRaw`
      UPDATE "ImportSession"
      SET "rowsProcessed" = ${rowsProcessed}
      WHERE "id" = ${sessionId}
    `
    
    // Log progress updates periodically (less frequent for large imports)
    // Only log every 500 rows or at completion to reduce console noise
    if (rowsProcessed % 500 === 0) {
      const session = await prisma.importSession.findUnique({
        where: { id: sessionId },
        select: { totalRows: true },
      })
      if (session) {
        const percentage = session.totalRows > 0 
          ? Math.round((rowsProcessed / session.totalRows) * 100) 
          : 0
        console.log(`Progress: ${rowsProcessed}/${session.totalRows} rows (${percentage}%)`)
      }
    }
    
    return { rowsProcessed }
  } catch (error: any) {
    console.error(`Failed to update import progress for session ${sessionId}:`, error?.message || error)
    // Don't throw - allow import to continue even if progress update fails
    // But log it so we know there's an issue
    return null
  }
}

export async function completeImportSession(sessionId: string, result?: {
  submissionsCreated?: number
  submissionsUpdated?: number
  songsCreated?: number
  rowsSkipped?: number
  errors?: Array<{ row: number; message: string }>
}) {
  // Store results in mappingConfig as JSON (temporary solution until schema is updated)
  const updateData: any = {
    status: 'completed',
    completedAt: new Date(),
  }
  
  if (result) {
    // Store results in mappingConfig field (we'll add a proper result field later)
    // For now, we'll append to the existing mappingConfig
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      select: { mappingConfig: true },
    })
    
    if (session) {
      updateData.mappingConfig = {
        ...(typeof session.mappingConfig === 'object' ? session.mappingConfig : {}),
        _importResult: result,
      }
    }
  }
  
  return await prisma.importSession.update({
    where: { id: sessionId },
    data: updateData,
  })
}

export async function failImportSession(sessionId: string, error: string) {
  return await prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status: 'failed',
      error,
      completedAt: new Date(),
    },
  })
}

export async function cancelImportSession(sessionId: string) {
  return await prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status: 'cancelled',
      completedAt: new Date(),
    },
  })
}

export async function pauseImportSession(sessionId: string) {
  return await prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status: 'paused',
    },
  })
}

export async function resumeImportSession(sessionId: string) {
  return await prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status: 'in_progress',
    },
  })
}

export async function findExistingSession(userId: string, fileHash: string) {
  return await prisma.importSession.findFirst({
    where: {
      userId,
      fileHash,
      status: {
        in: ['in_progress', 'failed', 'paused'],
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
  })
}

export function calculateFileHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

