'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Task } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red',
  high: 'text-[var(--gold)]',
  medium: 'text-blue',
  low: 'text-secondary',
  none: 'text-muted',
}

interface TodayTasksProps {
  initialTasks: Task[]
}

export default function TodayTasks({ initialTasks }: TodayTasksProps) {
  const [tasks, setTasks] = useState(initialTasks)

  async function toggleTask(task: Task) {
    const supabase = createClient()
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (error) {
      toast.error('Failed to update task')
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: newStatus } : t
    ))
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CheckCircle2 size={28} className="text-muted mb-2" />
        <p className="text-sm text-secondary">No tasks due today</p>
        <a href="/tasks" className="text-xs text-gold hover:text-gold-light transition-colors mt-1.5">
          Add a task →
        </a>
      </div>
    )
  }

  return (
    <ul className="space-y-1">
      {tasks.map((task, i) => (
        <motion.li
          key={task.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 py-2 px-1 rounded-md hover:bg-hover transition-colors group"
        >
          <button
            onClick={() => toggleTask(task)}
            className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-muted hover:text-gold transition-colors"
          >
            {task.status === 'done'
              ? <CheckCircle2 size={18} className="text-green" />
              : <Circle size={18} />}
          </button>
          <span className={cn(
            'flex-1 text-sm truncate',
            task.status === 'done' ? 'line-through text-muted' : 'text-primary'
          )}>
            {task.title}
          </span>
          {(task.priority === 'urgent' || task.priority === 'high') && (
            <AlertCircle size={14} className={PRIORITY_COLORS[task.priority]} />
          )}
        </motion.li>
      ))}
    </ul>
  )
}
