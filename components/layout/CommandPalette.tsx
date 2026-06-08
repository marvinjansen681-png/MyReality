'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckSquare, FolderOpen, Sparkles, Clock, ArrowRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { Task, Project, Vision } from '@/types'

type ResultType = 'task' | 'project' | 'vision'

interface Result {
  id: string
  type: ResultType
  title: string
  subtitle?: string
  href: string
}

const RECENT_KEY = 'myreality-recent-nav'
const MAX_RECENT = 5

function getRecent(): Result[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function pushRecent(item: Result) {
  const recent = getRecent().filter(r => r.id !== item.id).slice(0, MAX_RECENT - 1)
  localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...recent]))
}

const TYPE_ICON: Record<ResultType, React.ReactNode> = {
  task: <CheckSquare size={14} className="text-blue" />,
  project: <FolderOpen size={14} className="text-gold" />,
  vision: <Sparkles size={14} className="text-purple" />,
}

const TYPE_LABEL: Record<ResultType, string> = {
  task: 'Task',
  project: 'Project',
  vision: 'Vision',
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [recent, setRecent] = useState<Result[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      setRecent(getRecent())
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const supabase = createClient()
    const term = `%${q}%`

    const [tasksRes, projectsRes, visionsRes] = await Promise.all([
      supabase.from('tasks').select('id, title, project_id').ilike('title', term).limit(5),
      supabase.from('projects').select('id, name, description').ilike('name', term).limit(5),
      supabase.from('visions').select('id, title, category').ilike('title', term).limit(5),
    ])

    const taskResults: Result[] = (tasksRes.data ?? []).map((t: Pick<Task, 'id' | 'title' | 'project_id'>) => ({
      id: t.id,
      type: 'task',
      title: t.title,
      subtitle: t.project_id ? 'Project task' : 'Personal task',
      href: t.project_id ? `/projects/${t.project_id}` : '/tasks',
    }))

    const projectResults: Result[] = (projectsRes.data ?? []).map((p: Pick<Project, 'id' | 'name' | 'description'>) => ({
      id: p.id,
      type: 'project',
      title: p.name,
      subtitle: p.description ?? undefined,
      href: `/projects/${p.id}`,
    }))

    const visionResults: Result[] = (visionsRes.data ?? []).map((v: Pick<Vision, 'id' | 'title' | 'category'>) => ({
      id: v.id,
      type: 'vision',
      title: v.title,
      subtitle: v.category,
      href: '/vision',
    }))

    setResults([...taskResults, ...projectResults, ...visionResults])
    setSearching(false)
    setActiveIndex(0)
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (query.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    searchTimer.current = setTimeout(() => search(query), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [query, search])

  function navigate(item: Result) {
    pushRecent(item)
    setRecent(getRecent())
    router.push(item.href)
    onClose()
  }

  const displayList = query.length >= 2 ? results : recent
  const isEmpty = displayList.length === 0
  const isShowingRecent = query.length < 2

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, displayList.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && displayList[activeIndex]) {
      navigate(displayList[activeIndex])
    }
  }

  // Group results by type
  const grouped: Record<string, Result[]> = {}
  displayList.forEach(r => {
    const key = isShowingRecent ? 'recent' : r.type
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })

  let flatIndex = 0

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="fixed z-50 top-[10vh] left-1/2 -translate-x-1/2 w-full max-w-xl px-4"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-card border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <Search size={16} className="text-muted flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search tasks, projects, visions..."
                  className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
                />
                {searching && (
                  <div className="w-4 h-4 border-2 border-muted border-t-gold rounded-full animate-spin flex-shrink-0" />
                )}
                {query && (
                  <button onClick={() => setQuery('')} className="text-muted hover:text-secondary transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
                <kbd className="hidden sm:flex items-center text-[10px] text-muted bg-hover px-1.5 py-0.5 rounded border border-[var(--border)]">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto py-2">
                {isEmpty && !searching && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Search size={22} className="text-muted mb-2" />
                    <p className="text-sm text-secondary">
                      {query.length >= 2 ? `No results for "${query}"` : 'Type to search across your workspace'}
                    </p>
                    {query.length > 0 && query.length < 2 && (
                      <p className="text-xs text-muted mt-1">Enter at least 2 characters</p>
                    )}
                  </div>
                )}

                {Object.entries(grouped).map(([groupKey, items]) => {
                  return (
                    <div key={groupKey}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 px-4 py-1.5">
                        {isShowingRecent
                          ? <><Clock size={11} className="text-muted" /><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Recent</span></>
                          : <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{TYPE_LABEL[groupKey as ResultType]}s</span>
                        }
                      </div>

                      {items.map(item => {
                        const idx = flatIndex++
                        const isActive = idx === activeIndex
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              isActive ? 'bg-[var(--gold-muted)]' : 'hover:bg-hover'
                            )}
                          >
                            <div className="w-7 h-7 rounded-md bg-hover flex items-center justify-center flex-shrink-0">
                              {isShowingRecent
                                ? TYPE_ICON[item.type]
                                : TYPE_ICON[item.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-primary truncate">{item.title}</p>
                              {item.subtitle && (
                                <p className="text-xs text-muted truncate">{item.subtitle}</p>
                              )}
                            </div>
                            <ArrowRight size={13} className={cn('flex-shrink-0 transition-opacity', isActive ? 'text-gold opacity-100' : 'text-muted opacity-0')} />
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-4 text-[10px] text-muted">
                <span className="flex items-center gap-1"><kbd className="bg-hover px-1.5 py-0.5 rounded border border-[var(--border)]">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-hover px-1.5 py-0.5 rounded border border-[var(--border)]">↵</kbd> open</span>
                <span className="flex items-center gap-1"><kbd className="bg-hover px-1.5 py-0.5 rounded border border-[var(--border)]">Esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
