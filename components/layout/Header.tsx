'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Search, Bell, LogOut, Settings, User, CheckCheck, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useUIStore } from '@/lib/stores/uiStore'
import { Logo } from '@/components/ui/Logo'
import { useNotifications } from '@/lib/hooks/useNotifications'
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

const NOTIF_ICONS: Record<string, string> = {
  task_assigned: '📋',
  task_commented: '💬',
  task_due: '⏰',
  mention: '@',
  vision_due: '✨',
  access_request_approved: '✅',
  access_request_rejected: '⛔',
  access_request_received: '📨',
}

interface HeaderProps {
  profile: Profile | null
}

export default function Header({ profile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { setSidebarMobileOpen } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(userId)

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'MyReality'

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleNotifClick(id: string, link: string | null) {
    await markRead(id)
    setNotifOpen(false)
    if (link) router.push(link)
  }

  return (
    <header className="h-[var(--header-height)] bg-surface border-b border-[var(--border)] flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30 safe-top">
      {/* Left */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => setSidebarMobileOpen(true)}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors -ml-2"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="lg:hidden absolute left-1/2 -translate-x-1/2">
          <Logo href="/dashboard" markSize={28} size="sm" />
        </div>

        <h1 className="hidden lg:block text-xl font-semibold text-primary truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => (window as Window & { __openCommandPalette?: () => void }).__openCommandPalette?.()}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors rounded-md hover:bg-hover"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* Bell + notification panel */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(v => !v); setDropdownOpen(false) }}
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

          <AnimatePresence>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-80 bg-card border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <h3 className="text-sm font-semibold text-primary">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-[380px] overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-4 h-4 border-2 border-muted border-t-gold rounded-full animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <Bell size={24} className="text-muted mb-2" />
                        <p className="text-sm text-secondary">No notifications yet</p>
                        <p className="text-xs text-muted mt-1">You&apos;re all caught up!</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotifClick(notif.id, notif.link)}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-hover transition-colors border-b border-[var(--border)] last:border-0',
                            !notif.read && 'bg-[var(--gold-muted)]'
                          )}
                        >
                          {/* Icon */}
                          <div className="w-8 h-8 rounded-full bg-hover flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                            {NOTIF_ICONS[notif.type] ?? '🔔'}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary leading-snug line-clamp-1">{notif.title}</p>
                            <p className="text-xs text-secondary mt-0.5 line-clamp-2">{notif.body}</p>
                            <p className="text-[10px] text-muted mt-1">
                              {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true })}
                            </p>
                          </div>

                          {/* Unread dot + link icon */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-gold mt-1" />
                            )}
                            {notif.link && (
                              <ExternalLink size={11} className="text-muted" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => { setDropdownOpen(v => !v); setNotifOpen(false) }}
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
                      <User size={15} /> Profile
                    </button>
                    <button
                      onClick={() => { router.push('/settings'); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors min-h-[44px]"
                    >
                      <Settings size={15} /> Settings
                    </button>
                    <div className="my-1 border-t border-[var(--border)]" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-hover hover:text-red transition-colors min-h-[44px]"
                    >
                      <LogOut size={15} /> Log out
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
