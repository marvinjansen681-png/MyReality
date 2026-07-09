'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Circle, ListTodo } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import EmptyState from '@/components/shared/EmptyState'
import PriorityBadge from '@/components/shared/PriorityBadge'
import AssigneeAvatars from '@/components/shared/AssigneeAvatars'
import { getDueDateStatus } from '@/lib/utils/dueDate'
import { canEditProjectContent } from '@/lib/permissions/projectPermissions'
import TaskDetail from './TaskDetail'
import type { Task, Column, Profile, ProjectRole } from '@/types'

interface ListViewProps {
  initialTasks: Task[]
  columns: Column[]
  userId: string
  userProfile: Profile | null
  profileMap?: Record<string, Profile>
  assigneesMap?: Record<string, string[]>
  myTasksOnly?: boolean
  projectRole?: ProjectRole | null
}

export default function ListView({ initialTasks, columns, userId, userProfile, profileMap, assigneesMap, myTasksOnly = false, projectRole = null }: ListViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const canEdit = canEditProjectContent(projectRole)

  const colMap = Object.fromEntries(columns.map(c => [c.id, c.title]))
  const visibleTasks = tasks.filter(t => !myTasksOnly || (assigneesMap?.[t.id] ?? []).includes(userId))

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
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted uppercase tracking-wider">Assignees</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map(task => (
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
                <td className={cn(
                  'py-2.5 px-3 text-xs',
                  getDueDateStatus(task.due_date, task.status) === 'overdue' ? 'text-red'
                    : getDueDateStatus(task.due_date, task.status) === 'today' ? 'text-gold'
                    : 'text-muted'
                )}>
                  {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1 flex-wrap">
                    {task.labels?.slice(0, 2).map(l => (
                      <span key={l} className="text-[10px] bg-hover text-muted px-1.5 py-0.5 rounded-full">{l}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  {profileMap && <AssigneeAvatars ids={assigneesMap?.[task.id] ?? []} profileMap={profileMap} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleTasks.length === 0 && (
          <EmptyState icon={ListTodo} title="No tasks here" description="No tasks in this project yet." />
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {visibleTasks.map(task => (
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
                    <span className={cn(
                      'text-xs',
                      getDueDateStatus(task.due_date, task.status) === 'overdue' ? 'text-red'
                        : getDueDateStatus(task.due_date, task.status) === 'today' ? 'text-gold'
                        : 'text-muted'
                    )}>
                      {format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  )}
                  {task.column_id && (
                    <span className="text-xs text-muted">{colMap[task.column_id]}</span>
                  )}
                  {profileMap && <AssigneeAvatars ids={assigneesMap?.[task.id] ?? []} profileMap={profileMap} />}
                </div>
              </div>
            </div>
          </div>
        ))}
        {visibleTasks.length === 0 && (
          <EmptyState icon={ListTodo} title="No tasks here" description="No tasks in this project yet." />
        )}
      </div>

      <TaskDetail
        task={activeTask}
        userId={userId}
        userProfile={userProfile}
        projectRole={projectRole}
        onClose={() => setActiveTask(null)}
        onUpdated={handleUpdated}
      />
    </>
  )
}
