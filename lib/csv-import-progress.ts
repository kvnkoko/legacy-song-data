// Progress tracking utilities for CSV imports

export interface ImportProgress {
  sessionId: string
  totalRows: number
  rowsProcessed: number
  currentRow: number
  percentage: number
  rowsPerSecond: number
  estimatedTimeRemaining: number // in seconds
  currentOperation: string
  errors: Array<{ row: number; message: string }>
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled'
}

export function calculateProgress(
  rowsProcessed: number,
  totalRows: number,
  startTime: Date,
  currentOperation: string
): Omit<ImportProgress, 'sessionId' | 'errors' | 'status'> {
  const percentage = totalRows > 0 ? Math.round((rowsProcessed / totalRows) * 100) : 0
  const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000
  const rowsPerSecond = elapsedSeconds > 0 ? rowsProcessed / elapsedSeconds : 0
  const remainingRows = totalRows - rowsProcessed
  const estimatedTimeRemaining = rowsPerSecond > 0 ? remainingRows / rowsPerSecond : 0

  return {
    totalRows,
    rowsProcessed,
    currentRow: rowsProcessed + 1,
    percentage,
    rowsPerSecond: Math.round(rowsPerSecond * 10) / 10,
    estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
    currentOperation,
  }
}

export function formatTimeRemaining(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return 'Calculating...'
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${minutes}m ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

// Client-side file hash calculation
export async function calculateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

