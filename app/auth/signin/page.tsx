'use client'

import { signIn, useSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AnimatedCard } from '@/components/animated-card'
import { UserRole } from '@prisma/client'
import { getRoleRedirectPath } from '@/lib/role-redirect'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Wait a moment for session to be set, then get role and redirect
        setTimeout(async () => {
          try {
            const sessionResult = await fetch('/api/auth/session')
            const sessionData = await sessionResult.json()
            const userRole = sessionData?.user?.role as UserRole
            
            if (userRole) {
              const redirectPath = getRoleRedirectPath(userRole)
              router.push(redirectPath)
            } else {
              router.push('/')
            }
            router.refresh()
          } catch (err) {
            // Fallback to root page which will handle redirect
            router.push('/')
            router.refresh()
          }
        }, 100)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // Google signin will redirect to root, which will then redirect based on role
    signIn('google', { callbackUrl: '/' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AnimatedCard delay={0.1}>
        <Card className="w-full max-w-md shadow-purple-lg border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Sign In
            </CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full hover:border-primary/50"
                onClick={handleGoogleSignIn}
              >
                Sign in with Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    </div>
  )
}


