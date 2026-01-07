import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Connection pool configuration with retry logic
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    // During build time, return a mock client that throws helpful errors
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error('Prisma client not available during build. This is expected.')
      }
    })
  }
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

// Lazy Prisma client getter - only initializes when actually accessed
// This prevents initialization during build when DATABASE_URL is not available
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }
  
  if (!process.env.DATABASE_URL) {
    // During build, return a no-op client that throws on access
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        // Allow $disconnect to be called without error
        if (prop === '$disconnect') {
          return async () => {}
        }
        throw new Error(`Prisma client accessed during build. Property: ${String(prop)}. This route should use 'export const dynamic = "force-dynamic"'`)
      }
    })
  }
  
  const client = createPrismaClient()
  globalForPrisma.prisma = client
  return client
}

// Export as a getter property to ensure lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

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




