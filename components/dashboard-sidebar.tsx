'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { motion, useReducedMotion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { 
  LogOut,
  Home,
  Database,
  Calendar,
  LineChart,
  Settings,
  Upload,
  Users,
  User,
  FileText,
  GitBranch,
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { cn } from '@/lib/utils'
import { MobileSidebar } from './mobile-sidebar'
import { ThemeToggle } from './theme-toggle'

interface SidebarProps {
  userRole: UserRole
  userEmail: string
}

export function DashboardSidebar({ userRole, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion() ?? false
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show based on theme
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')
  // #region agent log
  React.useEffect(() => {
    if (mounted) {
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard-sidebar.tsx:44',message:'Theme detection values',data:{mounted,theme,resolvedTheme,isDark},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    }
  }, [mounted, theme, resolvedTheme, isDark]);
  // #endregion
  const logoSrc = isDark 
    ? '/Horizontal Logo, White 2.png' 
    : '/Horizontal Logo Black.png'

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/releases', label: 'Releases', icon: Database },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/analytics', label: 'Analytics', icon: LineChart },
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/org-chart', label: 'Org Chart', icon: GitBranch },
    { href: '/artists', label: 'Artists', icon: User },
  ]

  if (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) {
    navItems.push({ href: '/admin', label: 'Admin', icon: Settings })
    navItems.push({ href: '/audit-logs', label: 'Audit Logs', icon: FileText })
  }

  if (userRole === UserRole.DATA_TEAM || userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) {
    navItems.push({ href: '/import-csv', label: 'Import', icon: Upload })
  }

  return (
    <>
      {/* Mobile Sidebar */}
      <MobileSidebar userRole={userRole} userEmail={userEmail} />

      {/* Desktop Sidebar */}
      <aside className="dashboard-sidebar hidden lg:flex w-64 border-r border-border/50 bg-card flex-col h-screen sticky top-0 shadow-purple">
        <div className="p-6 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between mb-4 gap-3">
            <Link 
              href="/dashboard" 
              className="flex items-center group transition-opacity hover:opacity-80 flex-shrink-0 min-w-0"
            >
              {mounted ? (
                <Image
                  src={logoSrc}
                  alt="Legacy"
                  width={220}
                  height={60}
                  className="h-14 w-auto max-w-[220px] object-contain object-left transition-all duration-300"
                  priority
                  quality={95}
                />
              ) : (
                <div className="h-14 w-[180px] bg-muted animate-pulse rounded" />
              )}
            </Link>
            <ThemeToggle />
          </div>
          <p className="text-xs text-muted-foreground truncate pl-1">{userEmail}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <motion.div
                key={item.href}
                initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                transition={shouldReduceMotion ? {} : { delay: index * 0.03, duration: 0.2 }}
                onAnimationComplete={() => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard-sidebar.tsx:116',message:'Motion animation completed',data:{label:item.label,shouldReduceMotion},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                  // #endregion
                }}
              >
                <Link 
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "w-full justify-start gap-3 h-11 transition-all duration-200 relative group flex items-center px-3 rounded-md",
                    active 
                      ? "bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary" 
                      : "hover:bg-primary/5 hover:text-primary/80 text-foreground"
                  )}
                  onMouseEnter={(e) => {
                    // Prefetch on hover for faster navigation
                    const link = e.currentTarget
                    if (link.href) {
                      // Next.js will handle prefetching automatically
                    }
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b from-primary via-primary to-primary/80 rounded-r-full shadow-purple"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-colors flex-shrink-0",
                      active ? "text-primary group-hover:!text-primary" : "text-muted-foreground group-hover:text-primary/80"
                    )}
                    style={{
                      color: active 
                        ? '#5b5bff' 
                        : isDark 
                          ? '#a3a3a3' 
                          : '#737373'
                    }}
                  />
                  <span 
                    className={cn(
                      "transition-colors font-medium text-base sidebar-nav-text",
                      active 
                        ? "text-primary group-hover:!text-primary font-semibold" 
                        : "text-foreground group-hover:text-primary/80"
                    )}
                    style={{
                      color: active 
                        ? '#5b5bff' 
                        : isDark 
                          ? '#fafafa' 
                          : '#000000'
                    }}
                    ref={(el) => {
                      if (el) {
                        const computed = window.getComputedStyle(el);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard-sidebar.tsx:162',message:'Span computed styles',data:{label:item.label,active,isDark,inlineColor:active?'#5b5bff':isDark?'#fafafa':'#000000',computedColor:computed.color,computedOpacity:computed.opacity,computedVisibility:computed.visibility,computedDisplay:computed.display,zIndex:computed.zIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D,E'})}).catch(()=>{});
                        // #endregion
                      }
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <form action="/api/auth/signout" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </Button>
          </form>
        </div>
      </aside>
    </>
  )
}

