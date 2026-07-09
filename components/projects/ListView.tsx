'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Circle, ListTodo } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import EmptyState from '@/components/shared/EmptyState'
import PriorityBadge from '@/components/shared/PriorityBadge'
import { canEditProjectContent } from '@/lib/permissions/projectPermissions'
import TaskDetail from './TaskDetail'
import type { Task, Column, Profile, ProjectRole } from '@/types'

interface ListViewProps {
  initialTasks: Task[]
  columns: Column[]
  userId: string
  userProfile: Profile | null
  projectRole?: ProjectRole | null
}

export default function ListView({ initialTasks, columns, userId, userProfile, projectRole = null }: ListViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const canEdit = canEditProjectContent(projectRole)

  const colMap = Object.fromEntries(columns.map(c => [c.id, c.title]))

  async function toggleDone(task: Task) {
    if (!canEdit) return
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id)
    if (error) { toast.error('Failed to update task'); return }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  function handleUpdated(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setActiveTask(prev => prev?.id === updated.id ? updated : prev)
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted uppercase tracking-wider w-8" />
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted uppercase tracking-wider">Title</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted uppercase tracking-wider">Priority</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted uppercase tracking-wider">Column</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted uppercase tracking-wider">Due</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted uppercase tracking-wider">Labels</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr
                key={task.id}
                className="border-b border-[var(--border)] hover:bg-hover transition-colors group cursor-pointer"
                onClick={() => setActiveTask(task)}
              >
                <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleDone(task)}
                    disabled={!canEdit}
                    className="w-5 h-5 rounded-full border flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ borderColor: task.status === 'done' ? 'var(--green)' : 'var(--border)', background: task.status === 'done' ? 'var(--green)' : 'transparent' }}
                  >
                    {task.status === 'done' && <span className="text-black text-[10px]">✓</span>}
                  </button>
                </td>
                <td className="py-2.5 px-3">
                  <span className={cn('font-medium', task.status === 'done' ? 'line-through text-muted' : 'text-primary')}>
                    {task.title}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="py-2.5 px-3 text-xs text-secondary">
                  {task.column_id ? colMap[task.column_id] ?? '—' : '—'}
                </td>
                <td className="py-2.5 px-3 text-xs text-muted">
                  {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1 flex-wrap">
                    {task.labels?.slice(0, 2).map(l => (
                      <span key={l} className="text-[10px] bg-hover text-muted px-1.5 py-0.5 rounded-full">{l}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <EmptyState icon={ListTodo} title="No tasks here" description="No tasks in this project yet." />
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            className="bg-card border border-[var(--border)] rounded-lg p-3 cursor-pointer hover:border-[var(--border-focus)] transition-colors"
            onClick={() => setActiveTask(task)}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={e => { e.stopPropagation(); toggleDone(task) }}
                disabled={!canEdit}
                className="flex-shrink-0 mt-0.5 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {task.status === 'done'
                  ? <CheckCircle2 size={18} className="text-green" />
                  : <Circle size={18} className="text-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', task.status === 'done' ? 'line-through text-muted' : 'text-primary')}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <PriorityBadge priority={task.priority} />
                  {task.due_date && (
                    <span className="text-xs text-muted">{format(parseISO(task.due_date), 'MMM d')}</span>
                  )}
                  {task.column_id && (
                    <span className="text-xs text-muted">{colMap[task.column_id]}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <EmptyState icon={ListTodo} title="No tasks here" description="No tasks in this project yet." />
        )}
      </div>

      <TaskDetail
        task={activeTask}
        userId={userId}
        userProfile={userProfile}
        onClose={() => setActiveTask(null)}
        onUpdated={handleUpdated}
      />
    </>
  )
}
