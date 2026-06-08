'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check, Circle, Calendar, ChevronRight } from 'lucide-react'
import { format, parseISO, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import PriorityBadge from '@/components/shared/PriorityBadge'
import type { Task } from '@/types'

interface TaskItemProps {
  task: Task
  selected: boolean
  onSelect: (id: string) => void
  onToggle: (task: Task) => void
  onClick: (task: Task) => void
  index: number
}

const TaskItem = memo(function TaskItem({ task, selected, onSelect, onToggle, onClick, index }: TaskItemProps) {
  const isDone = task.status === 'done'
  const isOverdue = task.due_date && !isDone && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
  const isDueToday = task.due_date && isToday(parseISO(task.due_date))

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg border transition-colors group',
        selected ? 'bg-[var(--gold-muted)] border-[var(--gold)]' : 'bg-card border-[var(--border)] hover:border-[var(--border-focus)]',
        isDone && 'opacity-60'
      )}
    >
      {/* Select checkbox (visible on hover or when selected) */}
      <button
        onClick={e => { e.stopPropagation(); onSelect(task.id) }}
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all',
          'opacity-0 group-hover:opacity-100',
          selected ? 'opacity-100 bg-gold border-gold' : 'border-[var(--border)]',
          'min-w-[44px] min-h-[44px] -ml-3'
        )}
      >
        {selected && <Check size={10} className="text-black" />}
      </button>

      {/* Done toggle */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(task) }}
        className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] -mx-3"
        style={{ borderColor: isDone ? 'var(--green)' : 'var(--border)', background: isDone ? 'var(--green)' : 'transparent' }}
      >
        {isDone ? <Check size={11} className="text-black" /> : <Circle size={14} className="text-muted" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(task)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-medium truncate', isDone ? 'line-through text-muted' : 'text-primary')}>
            {task.title}
          </span>
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {task.due_date && (
            <span className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-red' : isDueToday ? 'text-gold' : 'text-muted')}>
              <Calendar size={10} />
              {isDueToday ? 'Today' : format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
          {task.labels?.slice(0, 3).map(l => (
            <span key={l} className="text-[10px] bg-hover text-muted px-1.5 py-0.5 rounded-full">{l}</span>
          ))}
          {(task.labels?.length ?? 0) > 3 && (
            <span className="text-[10px] text-muted">+{(task.labels?.length ?? 0) - 3}</span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight size={14} className="text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  )
})

export default TaskItem
