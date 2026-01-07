import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Connection pool configuration with retry logic
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Retry function with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Don't retry on certain errors
      if (
        error?.code === 'P2002' || // Unique constraint
        error?.code === 'P2025' || // Record not found
        error?.code === 'P2014'    // Required relation missing
      ) {
        throw error
      }
      
      // Check if it's a connection error
      const isConnectionError = 
        error?.message?.includes('Can\'t reach database server') ||
        error?.message?.includes('Connection') ||
        error?.code === 'P1001' ||
        error?.code === 'P1017'
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`Database connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error('Database operation failed after retries')
}

// Wrapper for Prisma client with retry logic
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await withRetry(async () => {
      await prisma.$queryRaw`SELECT 1`
    }, 2, 500)
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}

// Graceful shutdown
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // In production, handle graceful shutdown
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}




