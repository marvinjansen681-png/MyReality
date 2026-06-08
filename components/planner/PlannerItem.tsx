'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Trash2, GripVertical, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PlanItem } from '@/types'

interface PlannerItemProps {
  item: PlanItem
  isCarriedOver?: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onTextChange: (id: string, text: string) => void
}

export default function PlannerItem({ item, isCarriedOver, onToggle, onDelete, onTextChange }: PlannerItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== item.text) {
      onTextChange(item.id, trimmed)
    } else {
      setDraft(item.text)
    }
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'flex items-center gap-2 py-2 px-2 rounded-md group hover:bg-hover transition-colors',
        item.done && 'opacity-60'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={13} />
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        className={cn(
          'flex-shrink-0 w-[18px] h-[18px] rounded border transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] -mx-3',
          item.done
            ? 'bg-green border-green'
            : 'border-[var(--border)] hover:border-gold'
        )}
      >
        {item.done && <Check size={11} className="text-black" />}
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') { setDraft(item.text); setEditing(false) }
            }}
            className="w-full bg-transparent text-sm text-primary outline-none border-b border-[var(--border-focus)]"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className={cn(
              'text-sm cursor-text block truncate',
              item.done ? 'line-through text-muted' : 'text-primary'
            )}
          >
            {item.text}
          </span>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          {item.time && (
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <Clock size={9} /> {item.time}
            </span>
          )}
          {isCarriedOver && (
            <span className="text-[10px] text-muted italic">carried over</span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
