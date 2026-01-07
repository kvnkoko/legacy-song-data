import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:authorize',message:'Authorize called',data:{hasEmail:!!credentials?.email,hasDbUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (!credentials?.email || !credentials?.password) {
          console.log('Auth: Missing credentials')
          return null
        }

        // Trim email to handle whitespace
        const email = credentials.email.trim().toLowerCase()
        const password = credentials.password

        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:authorize-before-prisma',message:'Before Prisma query',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          const user = await prisma.user.findUnique({
            where: { email },
          })
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:authorize-after-prisma',message:'After Prisma query',data:{found:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'C'})}).catch(()=>{});
          // #endregion

          if (!user) {
            console.log(`Auth: User not found: ${email}`)
            return null
          }

          if (!user.passwordHash) {
            console.log(`Auth: User has no password hash: ${email}`)
            return null
          }

          const isValid = await bcrypt.compare(password, user.passwordHash)

          if (!isValid) {
            console.log(`Auth: Invalid password for: ${email}`)
            return null
          }

          console.log(`Auth: Success for: ${email}`)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          }
        } catch (error: any) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:authorize-error',message:'Error in authorize',data:{error:error?.message,stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.error('Auth error:', error)
          throw error
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (!existingUser) {
          // Create new user with Google OAuth
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
              role: UserRole.CLIENT, // Default role, can be updated by admin
            },
          })
        } else if (!existingUser.googleId) {
          // Link Google account to existing user
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { googleId: account.providerAccountId },
          })
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:session-callback',message:'Session callback called',data:{hasToken:!!token,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

