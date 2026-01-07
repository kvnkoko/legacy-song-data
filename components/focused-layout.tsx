'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface FocusedLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function FocusedLayout({ children, title, description }: FocusedLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
    })
    if (response.ok) {
      router.push('/auth/signin')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                <span className="truncate max-w-[200px]">{session.user.email}</span>
              </div>
            )}
            <ThemeToggle />
            <form action="/api/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={(e) => {
                  e.preventDefault()
                  handleLogout()
                }}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6">
        {children}
      </main>
    </div>
  )
}

