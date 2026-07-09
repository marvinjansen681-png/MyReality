'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Loader2, History, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchProfilesByIds } from '@/lib/utils/profiles'
import { formatAuditEvent, collectAuditEventUserIds, type AuditCategory } from '@/lib/audit/formatAuditEvent'
import { cn } from '@/lib/utils/cn'
import EmptyState from '@/components/shared/EmptyState'
import type { AuditEvent } from '@/types'

const PAGE_SIZE = 50

const FILTERS: { key: AuditCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'members', label: 'Members' },
  { key: 'invites', label: 'Invites' },
  { key: 'requests', label: 'Access requests' },
  { key: 'project', label: 'Project changes' },
]

interface ProjectAuditTrailProps {
  projectId: string
}

export default function ProjectAuditTrail({ projectId }: ProjectAuditTrailProps) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<AuditCategory | 'all'>('all')
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null)
  const nameMapRef = useRef(nameMap)
  nameMapRef.current = nameMap

  const fetchPage = useCallback(async (offset: number) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('audit_events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    const rows = (data ?? []) as AuditEvent[]
    const ids = Array.from(new Set(rows.flatMap(collectAuditEventUserIds)))
    const profiles = await fetchProfilesByIds(supabase, ids)
    const names: Record<string, string> = {}
    for (const id of ids) {
      const p = profiles[id]
      names[id] = p?.full_name || p?.email || `User ${id.slice(0, 8)}`
    }
    return { rows, names, more: rows.length === PAGE_SIZE }
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPage(0).then(({ rows, names, more }) => {
      if (cancelled) return
      setEvents(rows)
      setNameMap(names)
      setHasMore(more)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchPage])

  // Realtime: prepend new activity as it happens, without touching the
  // separate task-focused useRealtime hook used elsewhere on this page.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${projectId}:audit`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_events', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const event = payload.new as AuditEvent
          const missingIds = collectAuditEventUserIds(event).filter(id => !nameMapRef.current[id])
          if (missingIds.length) {
            const profiles = await fetchProfilesByIds(supabase, missingIds)
            setNameMap(prev => {
              const next = { ...prev }
              for (const id of missingIds) {
                const p = profiles[id]
                next[id] = p?.full_name || p?.email || `User ${id.slice(0, 8)}`
              }
              return next
            })
          }
          setEvents(prev => prev.some(e => e.id === event.id) ? prev : [event, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  async function loadMore() {
    setLoadingMore(true)
    const { rows, names, more } = await fetchPage(events.length)
    setEvents(prev => [...prev, ...rows])
    setNameMap(prev => ({ ...prev, ...names }))
    setHasMore(more)
    setLoadingMore(false)
  }

  function getName(id: string | null | undefined): string {
    if (!id) return 'Unknown user'
    return nameMap[id] ?? `User ${id.slice(0, 8)}`
  }

  const visibleEvents = filter === 'all' ? events : events.filter(e => formatAuditEvent(e, getName).category === filter)

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="text-muted animate-spin" /></div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
              filter === f.key ? 'bg-gold text-black' : 'bg-hover text-secondary hover:text-primary'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibleEvents.length === 0 ? (
        <EmptyState icon={History} title="No activity yet" description="Actions on this project will show up here." />
      ) : (
        <div className="space-y-1.5">
          {visibleEvents.map(event => {
            const formatted = formatAuditEvent(event, getName)
            const hasDetails = event.old_data || event.new_data
            const detailsOpen = openDetailsId === event.id
            return (
              <div key={event.id} className="bg-hover/50 border border-[var(--border)] rounded-lg px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-primary">{formatted.title}</p>
                    {formatted.detail && <p className="text-xs text-secondary mt-0.5">{formatted.detail}</p>}
                  </div>
                  <span className="text-[11px] text-muted flex-shrink-0 whitespace-nowrap">
                    {format(new Date(event.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                {hasDetails && (
                  <button
                    onClick={() => setOpenDetailsId(detailsOpen ? null : event.id)}
                    className="flex items-center gap-1 text-[11px] text-muted hover:text-secondary transition-colors mt-1.5"
                  >
                    <ChevronDown size={11} className={cn('transition-transform', detailsOpen && 'rotate-180')} />
                    Details
                  </button>
                )}
                {detailsOpen && (
                  <pre className="mt-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md p-2 text-[10px] text-muted overflow-x-auto">
                    {JSON.stringify({ old: event.old_data, new: event.new_data }, null, 2)}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasMore && filter === 'all' && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2 rounded-md border border-[var(--border)] text-xs text-secondary hover:bg-hover transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loadingMore && <Loader2 size={12} className="animate-spin" />}
          Load more
        </button>
      )}
    </div>
  )
}
