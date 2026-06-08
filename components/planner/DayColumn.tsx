'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { isToday } from '@/lib/utils/dates'
import PlannerItem from './PlannerItem'
import type { PlanItem } from '@/types'

interface DayColumnProps {
  date: Date
  dayIndex: number
  items: PlanItem[]
  carriedOverIds: Set<string>
  onAddItem: (dayIndex: number, text: string, time?: string) => void
  onToggleItem: (dayIndex: number, id: string) => void
  onDeleteItem: (dayIndex: number, id: string) => void
  onTextChange: (dayIndex: number, id: string, text: string) => void
  /** mobile-only: show just this column */
  compact?: boolean
}

export default function DayColumn({
  date, dayIndex, items, carriedOverIds,
  onAddItem, onToggleItem, onDeleteItem, onTextChange, compact
}: DayColumnProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const today = isToday(date)

  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` })

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  function submitAdd() {
    const text = draft.trim()
    if (text) {
      onAddItem(dayIndex, text, draftTime || undefined)
    }
    setDraft('')
    setDraftTime('')
    setAdding(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border transition-colors',
        'bg-card',
        today ? 'border-[var(--gold)] border-opacity-60' : 'border-[var(--border)]',
        isOver && 'bg-[var(--gold-muted)]',
        compact ? 'min-h-[60vh]' : 'min-h-[320px]'
      )}
    >
      {/* Day header */}
      <div className={cn(
        'px-3 py-2.5 border-b flex items-center justify-between',
        today ? 'border-[var(--gold)] border-opacity-30' : 'border-[var(--border)]'
      )}>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            today ? 'text-gold' : 'text-secondary'
          )}>
            {format(date, 'EEE')}
          </span>
          <span className={cn(
            'text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full',
            today ? 'bg-gold text-black' : 'text-primary'
          )}>
            {format(date, 'd')}
          </span>
        </div>
        <span className="text-xs text-muted">{items.length > 0 ? `${items.filter(i => i.done).length}/${items.length}` : ''}</span>
      </div>

      {/* Items */}
      <div className="flex-1 px-1 py-1 overflow-y-auto">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <PlannerItem
              key={item.id}
              item={item}
              isCarriedOver={carriedOverIds.has(item.id)}
              onToggle={id => onToggleItem(dayIndex, id)}
              onDelete={id => onDeleteItem(dayIndex, id)}
              onTextChange={(id, text) => onTextChange(dayIndex, id, text)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add form */}
      <div className="px-2 pb-2">
        {adding ? (
          <div className="space-y-1.5 pt-1">
            <input
              ref={addInputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitAdd()
                if (e.key === 'Escape') { setAdding(false); setDraft('') }
              }}
              placeholder="What needs doing?"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-focus)] rounded-md px-2.5 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-none"
            />
            <div className="flex gap-2 items-center">
              <input
                type="time"
                value={draftTime}
                onChange={e => setDraftTime(e.target.value)}
                className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-secondary focus:outline-none focus:border-[var(--border-focus)]"
              />
              <button
                onClick={submitAdd}
                className="px-3 py-1 bg-gold text-black text-xs font-semibold rounded-md hover:bg-gold-light transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setDraft('') }}
                className="px-2 py-1 text-xs text-muted hover:text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted hover:text-secondary hover:bg-hover rounded-md transition-colors min-h-[36px]"
          >
            <Plus size={12} /> Add item
          </button>
        )}
      </div>
    </div>
  )
}
