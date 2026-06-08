'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Search, Bell, LogOut, Settings, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/lib/stores/uiStore'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vision': 'Vision Board',
  '/planner': 'Weekly Planner',
  '/tasks': 'My Tasks',
  '/projects': 'Projects',
  '/team': 'Team',
  '/settings': 'Settings',
}

interface HeaderProps {
  profile: Profile | null
}

export default function Header({ profile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { setSidebarMobileOpen } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'MyReality'

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  useEffect(() => {
    async function fetchUnread() {
      const supabase = createClient()
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
      setUnreadCount(count ?? 0)
    }
    fetchUnread()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-[var(--header-height)] bg-surface border-b border-[var(--border)] flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30 safe-top">
      {/* Left: hamburger (mobile) + page title (desktop) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => setSidebarMobileOpen(true)}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors -ml-2"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo — mobile only (centre slot) */}
        <span className="lg:hidden font-display font-bold text-gold text-lg absolute left-1/2 -translate-x-1/2">
          MyReality
        </span>

        {/* Page title — desktop */}
        <h1 className="hidden lg:block text-xl font-semibold text-primary truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right: search + bell + avatar */}
      <div className="flex items-center gap-1">
        <button
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors rounded-md hover:bg-hover"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        <button
          className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors rounded-md hover:bg-hover"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 min-w-[16px] h-4 px-0.5 bg-gold text-[#0a0a0a] text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center ml-1"
            aria-label="Account menu"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--gold-muted)] border border-[var(--border)] flex items-center justify-center text-gold text-xs font-bold overflow-hidden">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="w-full h-full object-cover" />
              ) : initials}
            </div>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-52 bg-card border border-[var(--border)] rounded-md shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-medium text-primary truncate">{profile?.full_name ?? 'User'}</p>
                    <p className="text-xs text-muted truncate">{profile?.email ?? ''}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { router.push('/settings'); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors min-h-[44px]"
                    >
                      <User size={15} />
                      Profile
                    </button>
                    <button
                      onClick={() => { router.push('/settings'); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors min-h-[44px]"
                    >
                      <Settings size={15} />
                      Settings
                    </button>
                    <div className="my-1 border-t border-[var(--border)]" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-hover hover:text-red transition-colors min-h-[44px]"
                    >
                      <LogOut size={15} />
                      Log out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
