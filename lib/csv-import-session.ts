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
    // Use Prisma update instead of raw SQL for better error handling and compatibility
    // This is more reliable on Vercel and handles errors better
    const updated = await prisma.importSession.update({
      where: { id: sessionId },
      data: { rowsProcessed },
      select: { totalRows: true, rowsProcessed: true },
    })
    
    // Log progress updates periodically (less frequent for large imports)
    // Only log every 500 rows or at completion to reduce console noise
    if (rowsProcessed % 500 === 0 || rowsProcessed === updated.totalRows) {
      const percentage = updated.totalRows > 0 
        ? Math.round((rowsProcessed / updated.totalRows) * 100) 
        : 0
      console.log(`Progress: ${rowsProcessed}/${updated.totalRows} rows (${percentage}%)`)
    }
    
    return { rowsProcessed: updated.rowsProcessed }
  } catch (error: any) {
    console.error(`Failed to update import progress for session ${sessionId}:`, error?.message || error)
    // Don't throw - allow import to continue even if progress update fails
    // But log it so we know there's an issue
    // #region agent log
    const logData = {
      location: 'lib/csv-import-session.ts:28',
      message: 'Progress update failed',
      data: {
        sessionId,
        rowsProcessed,
        error: error.message || 'Unknown error',
        stack: error.stack,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'D',
    };
    console.error('[DEBUG] Progress Update Failed:', logData);
    fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
    // #endregion
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

