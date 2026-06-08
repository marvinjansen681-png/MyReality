'use client'

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Calendar, MessageSquare, MoreVertical } from 'lucide-react'
import { format, parseISO, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import PriorityBadge from '@/components/shared/PriorityBadge'
import type { Task, Profile } from '@/types'

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
  onMoveToColumn?: (task: Task, columnId: string) => void
  columns?: { id: string; title: string }[]
  profileMap?: Record<string, Profile>
  index?: number
}

const TaskCard = memo(function TaskCard({ task, onClick, onMoveToColumn, columns, profileMap, index = 0 }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const isDone = task.status === 'done'
  const isOverdue = task.due_date && !isDone && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
  const isDueToday = task.due_date && isToday(parseISO(task.due_date))

  return (
    <motion.div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 cursor-pointer',
        'hover:border-[var(--border-focus)] transition-colors group'
      )}
      onClick={() => onClick(task)}
      {...attributes}
      {...listeners}
    >
      {/* Priority + title */}
      <div className="mb-2">
        {task.priority !== 'none' && (
          <div className="mb-1.5">
            <PriorityBadge priority={task.priority} />
          </div>
        )}
        <p className={cn('text-sm font-medium leading-snug', isDone ? 'line-through text-muted' : 'text-primary')}>
          {task.title}
        </p>
      </div>

      {/* Labels */}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map(l => (
            <span key={l} className="text-[10px] bg-hover text-muted px-1.5 py-0.5 rounded-full">{l}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2">
        {task.due_date && (
          <span className={cn('flex items-center gap-1 text-[10px]', isOverdue ? 'text-red' : isDueToday ? 'text-gold' : 'text-muted')}>
            <Calendar size={9} />
            {isDueToday ? 'Today' : format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
        {(task.comments?.length ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <MessageSquare size={9} /> {task.comments!.length}
          </span>
        )}

        {/* Assignee avatars */}
        {profileMap && task.assigned_to?.length > 0 && (
          <div className="ml-auto flex items-center -space-x-1.5">
            {task.assigned_to.slice(0, 3).map(uid => {
              const p = profileMap[uid]
              if (!p) return null
              const initials = (p.full_name ?? p.email ?? '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div
                  key={uid}
                  title={p.full_name ?? p.email ?? uid}
                  className="w-5 h-5 rounded-full bg-[var(--gold-muted)] border border-[var(--bg-surface)] flex items-center justify-center text-[8px] font-bold text-gold overflow-hidden flex-shrink-0"
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.full_name ?? ''} className="w-full h-full object-cover" />
                  ) : initials}
                </div>
              )
            })}
            {task.assigned_to.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-hover border border-[var(--bg-surface)] flex items-center justify-center text-[8px] text-muted flex-shrink-0">
                +{task.assigned_to.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Mobile move menu */}
        {onMoveToColumn && columns && (
          <div className="ml-auto lg:hidden" onClick={e => e.stopPropagation()}>
            <div className="relative group/menu">
              <button className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary">
                <MoreVertical size={14} />
              </button>
              <div className="hidden group-focus-within/menu:block absolute right-0 bottom-8 bg-card border border-[var(--border)] rounded-md shadow-xl z-20 min-w-[140px] py-1">
                <p className="px-3 py-1.5 text-[10px] text-muted uppercase tracking-wider">Move to</p>
                {columns.filter(c => c.id !== task.column_id).map(col => (
                  <button
                    key={col.id}
                    onClick={() => onMoveToColumn(task, col.id)}
                    className="w-full px-3 py-2 text-left text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
                  >
                    {col.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
})

export default TaskCard
