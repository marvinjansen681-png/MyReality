'use client'

import { useState, useRef, useEffect } from 'react'
import { UserPlus, X } from 'lucide-react'
import type { Profile } from '@/types'

interface TaskAssigneesPanelProps {
  assigneeIds: string[]
  profileMap: Record<string, Profile>
  activeMemberIds: Set<string>
  canAssign: boolean
  onAssign: (userId: string) => void
  onUnassign: (userId: string) => void
}

function initialsOf(p: Profile | undefined, fallbackId: string): string {
  const label = p?.full_name ?? p?.email ?? fallbackId
  return label.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function TaskAssigneesPanel({
  assigneeIds, profileMap, activeMemberIds, canAssign, onAssign, onUnassign,
}: TaskAssigneesPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const candidates = Array.from(activeMemberIds).filter(id => !assigneeIds.includes(id))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {assigneeIds.map(uid => {
        const p = profileMap[uid]
        const isRemoved = !activeMemberIds.has(uid)
        return (
          <div
            key={uid}
            className="flex items-center gap-1.5 bg-hover rounded-full pl-1 pr-2 py-1"
            title={isRemoved ? 'No longer an active project member' : undefined}
          >
            <div className="w-5 h-5 rounded-full bg-[var(--gold-muted)] flex items-center justify-center text-[9px] font-bold text-gold overflow-hidden flex-shrink-0">
              {p?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : initialsOf(p, uid)}
            </div>
            <span className={isRemoved ? 'text-xs text-muted line-through' : 'text-xs text-secondary'}>
              {p?.full_name ?? p?.email ?? 'Unknown user'}
              {isRemoved && ' (removed)'}
            </span>
            {canAssign && (
              <button onClick={() => onUnassign(uid)} className="text-muted hover:text-red transition-colors">
                <X size={11} />
              </button>
            )}
          </div>
        )
      })}

      {assigneeIds.length === 0 && <span className="text-xs text-muted">Unassigned</span>}

      {canAssign && (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-muted hover:text-secondary transition-colors py-1"
          >
            <UserPlus size={12} /> Assign
          </button>
          {pickerOpen && (
            <div className="absolute z-10 top-full mt-1 left-0 bg-card border border-[var(--border)] rounded-md shadow-xl min-w-[180px] max-h-56 overflow-y-auto py-1">
              {candidates.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">No other active members</p>
              ) : (
                candidates.map(uid => {
                  const p = profileMap[uid]
                  return (
                    <button
                      key={uid}
                      onClick={() => { onAssign(uid); setPickerOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-secondary hover:text-primary hover:bg-hover transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-[var(--gold-muted)] flex items-center justify-center text-[9px] font-bold text-gold overflow-hidden flex-shrink-0">
                        {initialsOf(p, uid)}
                      </div>
                      {p?.full_name ?? p?.email ?? 'Unknown user'}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
