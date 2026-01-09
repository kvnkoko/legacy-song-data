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
                        ref={(motionEl) => {
                          if (motionEl) {
                            // Force motion.div to be visible - Windows might be stuck in initial state
                            requestAnimationFrame(() => {
                              const motionComputed = window.getComputedStyle(motionEl);
                              // #region agent log
                              const logData = {
                                location:'mobile-sidebar.tsx:151',
                                message:'Motion div visibility check',
                                data:{
                                  label:item.label,
                                  computedOpacity:motionComputed.opacity,
                                  computedVisibility:motionComputed.visibility,
                                  computedDisplay:motionComputed.display,
                                  computedTransform:motionComputed.transform
                                },
                                timestamp:Date.now(),
                                sessionId:'debug-session',
                                runId:'run8',
                                hypothesisId:'N'
                              };
                              console.log('[DEBUG] Mobile Motion Div Analysis:', logData);
                              fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
                              // #endregion
                              
                              // Force visibility on motion.div itself
                              (motionEl as HTMLElement).style.setProperty('opacity', '1', 'important');
                              (motionEl as HTMLElement).style.setProperty('visibility', 'visible', 'important');
                              (motionEl as HTMLElement).style.setProperty('transform', 'translateX(0)', 'important');
                              
                              // Also force after a delay to override any animation
                              setTimeout(() => {
                                (motionEl as HTMLElement).style.setProperty('opacity', '1', 'important');
                                (motionEl as HTMLElement).style.setProperty('visibility', 'visible', 'important');
                                (motionEl as HTMLElement).style.setProperty('transform', 'translateX(0)', 'important');
                              }, 500);
                            });
                          }
                        }}
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
                          className="sidebar-nav-link"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            gap: '0.75rem',
                            height: '2.75rem',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '0.75rem',
                            paddingRight: '0.75rem',
                            borderRadius: '0.375rem',
                            backgroundColor: active ? 'rgba(91, 91, 255, 0.1)' : 'transparent',
                            color: active ? '#5b5bff' : (isDark ? '#fafafa' : '#000000'),
                            textDecoration: 'none'
                          }}
                          ref={(linkEl) => {
                            if (linkEl) {
                              requestAnimationFrame(() => {
                                const linkColor = active ? '#5b5bff' : (isDark ? '#fafafa' : '#000000');
                                linkEl.style.setProperty('color', linkColor, 'important');
                                linkEl.style.setProperty('text-decoration', 'none', 'important');
                                // Remove any Tailwind classes that might interfere
                                linkEl.className = 'sidebar-nav-link';
                              });
                            }
                          }}
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
                            ref={(iconEl) => {
                              if (iconEl) {
                                requestAnimationFrame(() => {
                                  const iconComputed = window.getComputedStyle(iconEl);
                                  const iconRect = iconEl.getBoundingClientRect();
                                  const iconColor = active ? '#5b5bff' : (isDark ? '#a3a3a3' : '#737373');
                                  
                                  // Force icon styles
                                  iconEl.style.setProperty('color', iconColor, 'important');
                                  iconEl.style.setProperty('opacity', '1', 'important');
                                  iconEl.style.setProperty('visibility', 'visible', 'important');
                                  iconEl.style.setProperty('fill', iconColor, 'important');
                                  iconEl.style.setProperty('stroke', iconColor, 'important');
                                  
                                  // #region agent log
                                  const logData = {
                                    location:'mobile-sidebar.tsx:202',
                                    message:'Icon visibility analysis',
                                    data:{
                                      label:item.label,
                                      active,
                                      isDark,
                                      targetColor:iconColor,
                                      computedColor:iconComputed.color,
                                      computedOpacity:iconComputed.opacity,
                                      computedVisibility:iconComputed.visibility,
                                      computedFill:iconComputed.fill,
                                      computedStroke:iconComputed.stroke,
                                      width:iconRect.width,
                                      height:iconRect.height,
                                      offsetWidth:iconEl.offsetWidth,
                                      offsetHeight:iconEl.offsetHeight,
                                      viewBox:iconEl.getAttribute('viewBox'),
                                      hasChildren:iconEl.children.length > 0
                                    },
                                    timestamp:Date.now(),
                                    sessionId:'debug-session',
                                    runId:'run7',
                                    hypothesisId:'J'
                                  };
                                  console.log('[DEBUG] Mobile Icon Analysis:', logData);
                                  fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
                                  // #endregion
                                });
                              }
                            }}
                          />
                          {/* Render text directly without span wrapper to avoid CSS inheritance issues */}
                          <span 
                            ref={(el) => {
                              if (el) {
                                // Force style application immediately and repeatedly
                                const applyStyles = () => {
                                  const color = active ? '#5b5bff' : (isDark ? '#fafafa' : '#000000');
                                  
                                  // Completely replace all styles
                                  el.className = '';
                                  el.removeAttribute('class');
                                  
                                  // Use cssText to override everything
                                  el.style.cssText = `
                                    color: ${color} !important;
                                    opacity: 1 !important;
                                    visibility: visible !important;
                                    display: inline-block !important;
                                    position: relative !important;
                                    z-index: 99999 !important;
                                    font-weight: 500 !important;
                                    font-size: 16px !important;
                                    line-height: 1.5 !important;
                                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                                    -webkit-font-smoothing: antialiased !important;
                                    -moz-osx-font-smoothing: grayscale !important;
                                    text-rendering: optimizeLegibility !important;
                                    text-shadow: none !important;
                                    clip: auto !important;
                                    clip-path: none !important;
                                    transform: none !important;
                                    filter: none !important;
                                    mix-blend-mode: normal !important;
                                    overflow: visible !important;
                                    white-space: nowrap !important;
                                    text-indent: 0 !important;
                                    letter-spacing: normal !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    border: none !important;
                                    background: transparent !important;
                                  `;
                                  
                                  // Also set individually as backup
                                  el.style.setProperty('color', color, 'important');
                                  el.style.setProperty('opacity', '1', 'important');
                                  el.style.setProperty('visibility', 'visible', 'important');
                                  
                                  // Force on parent link
                                  const link = el.closest('a');
                                  if (link) {
                                    link.style.setProperty('color', color, 'important');
                                    link.style.setProperty('text-decoration', 'none', 'important');
                                  }
                                };
                                
                                // Apply immediately
                                applyStyles();
                                
                                // Apply again after a frame
                                requestAnimationFrame(() => {
                                  applyStyles();
                                  setTimeout(applyStyles, 100);
                                });
                                
                                // Log for debugging - comprehensive parent chain analysis
                                requestAnimationFrame(() => {
                                  const computed = window.getComputedStyle(el);
                                  const rect = el.getBoundingClientRect();
                                  const color = active ? '#5b5bff' : (isDark ? '#fafafa' : '#000000');
                                  
                                  // Analyze parent chain
                                  const parentChain: any[] = [];
                                  let current: HTMLElement | null = el.parentElement;
                                  let depth = 0;
                                  while (current && depth < 10) {
                                    const parentComputed = window.getComputedStyle(current);
                                    const parentRect = current.getBoundingClientRect();
                                    parentChain.push({
                                      tag: current.tagName,
                                      className: current.className,
                                      id: current.id,
                                      opacity: parentComputed.opacity,
                                      visibility: parentComputed.visibility,
                                      display: parentComputed.display,
                                      overflow: parentComputed.overflow,
                                      overflowX: parentComputed.overflowX,
                                      overflowY: parentComputed.overflowY,
                                      clipPath: parentComputed.clipPath,
                                      clip: parentComputed.clip,
                                      transform: parentComputed.transform,
                                      zIndex: parentComputed.zIndex,
                                      position: parentComputed.position,
                                      width: parentRect.width,
                                      height: parentRect.height,
                                      top: parentRect.top,
                                      left: parentRect.left,
                                      offsetWidth: current.offsetWidth,
                                      offsetHeight: current.offsetHeight
                                    });
                                    current = current.parentElement;
                                    depth++;
                                  }
                                  
                                  // Check for overlaying elements
                                  const centerX = rect.left + rect.width / 2;
                                  const centerY = rect.top + rect.height / 2;
                                  const overlayElements = document.elementsFromPoint(centerX, centerY);
                                  const overlays = overlayElements.slice(0, 5).map((overlay, idx) => {
                                    if (overlay === el) return null;
                                    const overlayComputed = window.getComputedStyle(overlay as HTMLElement);
                                    const overlayRect = (overlay as HTMLElement).getBoundingClientRect();
                                    return {
                                      index: idx,
                                      tag: overlay.tagName,
                                      className: (overlay as HTMLElement).className,
                                      zIndex: overlayComputed.zIndex,
                                      position: overlayComputed.position,
                                      backgroundColor: overlayComputed.backgroundColor,
                                      opacity: overlayComputed.opacity,
                                      pointerEvents: overlayComputed.pointerEvents,
                                      width: overlayRect.width,
                                      height: overlayRect.height,
                                      top: overlayRect.top,
                                      left: overlayRect.left
                                    };
                                  }).filter(Boolean);
                                  
                                  // Check font loading
                                  const fontCheck = document.fonts.check('16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
                                  
                                  // #region agent log
                                  const logData = {
                                    location:'mobile-sidebar.tsx:216',
                                    message:'Comprehensive parent chain and overlay analysis',
                                    data:{
                                      label:item.label,
                                      active,
                                      isDark,
                                      targetColor:color,
                                      element: {
                                        computedColor:computed.color,
                                        computedOpacity:computed.opacity,
                                        computedVisibility:computed.visibility,
                                        computedDisplay:computed.display,
                                        computedOverflow:computed.overflow,
                                        computedZIndex:computed.zIndex,
                                        computedPosition:computed.position,
                                        computedTransform:computed.transform,
                                        computedClipPath:computed.clipPath,
                                        width:rect.width,
                                        height:rect.height,
                                        top:rect.top,
                                        left:rect.left,
                                        offsetWidth:el.offsetWidth,
                                        offsetHeight:el.offsetHeight,
                                        hasText:!!el.textContent,
                                        textLength:el.textContent?.length || 0,
                                        fontSize:computed.fontSize,
                                        fontFamily:computed.fontFamily,
                                        fontLoaded: fontCheck
                                      },
                                      parentChain,
                                      overlays,
                                      viewport: {
                                        width: window.innerWidth,
                                        height: window.innerHeight
                                      }
                                    },
                                    timestamp:Date.now(),
                                    sessionId:'debug-session',
                                    runId:'run7',
                                    hypothesisId:'I'
                                  };
                                  console.log('[DEBUG] Mobile Parent Chain & Overlay Analysis:', logData);
                                  console.log('[DEBUG] FULL DATA (copy this):', JSON.stringify(logData, null, 2));
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

