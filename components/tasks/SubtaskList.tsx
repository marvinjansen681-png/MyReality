'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, Circle, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Task } from '@/types'

interface SubtaskListProps {
  parentId: string
  subtasks: Task[]
  onSubtasksChange: (subtasks: Task[]) => void
  userId: string
}

export default function SubtaskList({ parentId, subtasks, onSubtasksChange, userId }: SubtaskListProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  async function addSubtask() {
    const text = draft.trim()
    if (!text) { setAdding(false); return }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: text,
        parent_task_id: parentId,
        is_personal: true,
        created_by: userId,
        status: 'todo',
        priority: 'none',
        position: subtasks.length,
      })
      .select()
      .single()
    if (error) { toast.error('Failed to add subtask'); return }
    onSubtasksChange([...subtasks, data as Task])
    setDraft('')
    setAdding(false)
  }

  async function toggleSubtask(subtask: Task) {
    const supabase = createClient()
    const newStatus = subtask.status === 'done' ? 'todo' : 'done'
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', subtask.id)
    if (error) { toast.error('Failed to update subtask'); return }
    onSubtasksChange(subtasks.map(s => s.id === subtask.id ? { ...s, status: newStatus } : s))
  }

  async function deleteSubtask(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { toast.error('Failed to delete subtask'); return }
    onSubtasksChange(subtasks.filter(s => s.id !== id))
  }

  const done = subtasks.filter(s => s.status === 'done').length

  return (
    <div className="space-y-1">
      {subtasks.length > 0 && (
        <p className="text-xs text-muted mb-2">{done}/{subtasks.length} completed</p>
      )}
      {subtasks.map(sub => (
        <div key={sub.id} className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-hover group transition-colors">
          <button
            onClick={() => toggleSubtask(sub)}
            className="flex-shrink-0 w-[18px] h-[18px] rounded border transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] -mx-3"
            style={{ borderColor: sub.status === 'done' ? 'var(--green)' : 'var(--border)', background: sub.status === 'done' ? 'var(--green)' : 'transparent' }}
          >
            {sub.status === 'done' && <Check size={10} className="text-black" />}
          </button>
          <span className={cn('flex-1 text-sm', sub.status === 'done' ? 'line-through text-muted' : 'text-primary')}>
            {sub.title}
          </span>
          <button
            onClick={() => deleteSubtask(sub.id)}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-red transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="flex items-center gap-2 pt-1">
          <Circle size={14} className="text-muted flex-shrink-0 ml-1" />
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={addSubtask}
            onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') { setAdding(false); setDraft('') } }}
            placeholder="Subtask title..."
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none border-b border-[var(--border-focus)]"
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors py-1.5 min-h-[44px]"
        >
          <Plus size={13} /> Add subtask
        </button>
      )}
    </div>
  )
}
