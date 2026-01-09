'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { 
  Menu,
  X,
  Home,
  Database,
  Calendar,
  LineChart,
  Settings,
  Upload,
  LogOut,
  Users,
  User,
  FileText,
  GitBranch
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from './theme-toggle'

interface MobileSidebarProps {
  userRole: UserRole
  userEmail: string
}

export function MobileSidebar({ userRole, userEmail }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show based on theme
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')
  // #region agent log
  useEffect(() => {
    if (mounted) {
      const logData = {location:'mobile-sidebar.tsx:45',message:'Theme detection values',data:{mounted,theme,resolvedTheme,isDark},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
      console.log('[DEBUG] Mobile Sidebar Theme:', logData);
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
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
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-background/90 backdrop-blur-md border border-border/50 shadow-purple hover:bg-primary/10 hover:border-primary/30"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="mobile-sidebar fixed left-0 top-0 h-full w-64 bg-card border-r border-border/50 z-50 lg:hidden shadow-purple-lg"
            >
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <Link 
                      href="/dashboard" 
                      className="flex items-center group transition-opacity hover:opacity-80 flex-shrink-0 min-w-0"
                      onClick={() => setIsOpen(false)}
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
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onAnimationComplete={() => {
                          // #region agent log
                          const logData = {location:'mobile-sidebar.tsx:146',message:'Motion animation completed',data:{label:item.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
                          console.log('[DEBUG] Mobile Motion Complete:', logData);
                          fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
                          // #endregion
                        }}
                      >
                        <Link 
                          href={item.href} 
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "w-full justify-start gap-3 h-11 transition-all duration-300 relative group flex items-center px-3 rounded-md",
                            active 
                              ? "bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary" 
                              : "hover:bg-primary/5 hover:text-primary/80 text-foreground"
                          )}
                        >
                          {active && (
                            <motion.div
                              layoutId="activeIndicatorMobile"
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
                            className="sidebar-nav-text"
                            style={{
                              color: active 
                                ? '#5b5bff' 
                                : isDark 
                                  ? '#fafafa' 
                                  : '#000000',
                              opacity: 1,
                              visibility: 'visible',
                              display: 'inline-block',
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                              textRendering: 'optimizeLegibility',
                              zIndex: 9999,
                              position: 'relative',
                              fontWeight: 500,
                              fontSize: '1rem',
                              lineHeight: '1.5'
                            }}
                            ref={(el) => {
                              if (el) {
                                // Force style application for Windows - use requestAnimationFrame for better timing
                                requestAnimationFrame(() => {
                                  const color = active ? '#5b5bff' : (isDark ? '#fafafa' : '#000000');
                                  
                                  // Remove all conflicting classes that might override
                                  el.className = 'sidebar-nav-text';
                                  
                                  // Direct style assignment (highest priority)
                                  el.style.cssText = `
                                    color: ${color} !important;
                                    opacity: 1 !important;
                                    visibility: visible !important;
                                    display: inline-block !important;
                                    -webkit-font-smoothing: antialiased !important;
                                    -moz-osx-font-smoothing: grayscale !important;
                                    text-rendering: optimizeLegibility !important;
                                    z-index: 9999 !important;
                                    position: relative !important;
                                    font-weight: 500 !important;
                                    font-size: 1rem !important;
                                    line-height: 1.5 !important;
                                  `;
                                  
                                  // Also set via setProperty as backup
                                  el.style.setProperty('color', color, 'important');
                                  el.style.setProperty('opacity', '1', 'important');
                                  el.style.setProperty('visibility', 'visible', 'important');
                                  
                                  // Check parent and remove any conflicting styles
                                  const parent = el.parentElement;
                                  if (parent) {
                                    const parentComputed = window.getComputedStyle(parent);
                                    // If parent has a color that might interfere, override it
                                    if (parentComputed.color && parentComputed.color !== color) {
                                      parent.style.setProperty('color', 'transparent', 'important');
                                    }
                                  }
                                  
                                  const computed = window.getComputedStyle(el);
                                  // #region agent log
                                  const logData = {location:'mobile-sidebar.tsx:185',message:'Span computed styles after cssText fix',data:{label:item.label,active,isDark,inlineColor:color,computedColor:computed.color,computedOpacity:computed.opacity,computedVisibility:computed.visibility,computedDisplay:computed.display,zIndex:computed.zIndex,backgroundColor:computed.backgroundColor,parentColor:parent?window.getComputedStyle(parent).color:'none',fontSize:computed.fontSize,fontWeight:computed.fontWeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A,C,D,E'};
                                  console.log('[DEBUG] Mobile Sidebar Text Styles (cssText fix):', logData);
                                  fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
                                  // #endregion
                                });
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
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

