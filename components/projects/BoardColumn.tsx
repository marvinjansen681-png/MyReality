'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import TaskCard from './TaskCard'
import type { Column, Task, Profile } from '@/types'

interface BoardColumnProps {
  column: Column
  tasks: Task[]
  allColumns: { id: string; title: string }[]
  onTaskClick: (task: Task) => void
  onAddTask: (columnId: string, title: string) => void
  onMoveTask: (task: Task, columnId: string) => void
  profileMap?: Record<string, Profile>
  canEdit?: boolean
}

export default function BoardColumn({ column, tasks, allColumns, onTaskClick, onAddTask, onMoveTask, profileMap, canEdit = true }: BoardColumnProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function submitAdd() {
    const t = draft.trim()
    if (t) onAddTask(column.id, t)
    setDraft('')
    setAdding(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border min-w-[260px] w-[260px] flex-shrink-0 max-h-[calc(100vh-200px)]',
        isOver ? 'border-[var(--gold)] bg-[var(--gold-muted)]' : 'border-[var(--border)] bg-card'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: column.color }} />
          <span className="text-sm font-semibold text-primary">{column.title}</span>
          <span className="text-xs text-muted bg-hover px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAdding(true)}
              className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-md transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onMoveToColumn={onMoveTask}
              columns={allColumns}
              profileMap={profileMap}
              index={i}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add card footer */}
      {canEdit && (
      <div className="px-2 pb-2 flex-shrink-0">
        {adding ? (
          <div className="space-y-2 pt-1">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setDraft('') } }}
              placeholder="Task title..."
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-focus)] rounded-md px-2.5 py-2 text-sm text-primary placeholder:text-muted focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={submitAdd} className="flex-1 py-1.5 bg-gold text-black text-xs font-semibold rounded-md hover:bg-gold-light transition-colors">
                Add
              </button>
              <button onClick={() => { setAdding(false); setDraft('') }} className="px-3 py-1.5 text-xs text-muted hover:text-secondary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 px-2 py-2 text-xs text-muted hover:text-secondary hover:bg-hover rounded-md transition-colors"
          >
            <Plus size={12} /> Add card
          </button>
        )}
      </div>
      )}
    </div>
  )
}
