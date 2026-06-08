'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Eye, CalendarDays, CheckSquare,
  FolderKanban, Users, Settings, ChevronLeft, ChevronRight,
  LogOut
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/ui/Logo'
import { useUIStore } from '@/lib/stores/uiStore'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { Workspace } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vision', label: 'Vision', icon: Eye },
  { href: '/planner', label: 'Planner', icon: CalendarDays },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  workspace: Workspace | null
}

export default function Sidebar({ workspace }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, toggleSidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen } = useUIStore()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleNavClick() {
    setSidebarMobileOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] min-h-[var(--header-height)]',
        sidebarCollapsed && 'lg:justify-center lg:px-2'
      )}>
        {sidebarCollapsed ? (
          <LogoMark size={32} className="flex-shrink-0" />
        ) : (
          <Logo href="/dashboard" markSize={32} size="sm" />
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group relative min-h-[44px]',
                isActive
                  ? 'bg-hover text-primary border-l-[3px] border-gold pl-[9px]'
                  : 'text-secondary hover:bg-hover hover:text-primary border-l-[3px] border-transparent pl-[9px]',
                sidebarCollapsed && 'lg:justify-center lg:px-2 lg:pl-2'
              )}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
              {sidebarCollapsed && (
                <span className="
                  hidden lg:block absolute left-full ml-2 px-2 py-1 bg-card border border-[var(--border)]
                  rounded text-xs text-primary whitespace-nowrap opacity-0 pointer-events-none
                  group-hover:opacity-100 transition-opacity z-50
                ">
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: collapse toggle + logout */}
      <div className="px-2 py-3 border-t border-[var(--border)] space-y-0.5">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-secondary hover:bg-hover hover:text-red transition-colors min-h-[44px]',
            sidebarCollapsed && 'lg:justify-center lg:px-2'
          )}
          title={sidebarCollapsed ? 'Log out' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Log out</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleSidebarCollapsed}
          className={cn(
            'hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-muted hover:bg-hover hover:text-secondary transition-colors min-h-[44px]',
            sidebarCollapsed && 'justify-center px-2'
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-surface border-r border-[var(--border)] flex-shrink-0 overflow-hidden h-screen sticky top-0"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarMobileOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-[240px] bg-surface border-r border-[var(--border)] flex flex-col"
      >
        {sidebarContent}
      </motion.aside>
    </>
  )
}
