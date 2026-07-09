'use client'

import { Target, CheckCircle2, ListTodo, AlertTriangle, User, TrendingUp } from 'lucide-react'
import type { Task, ProjectGoal } from '@/types'

interface ProjectOverviewProps {
  tasks: Task[]
  goals: ProjectGoal[]
  assigneesMap: Record<string, string[]>
  userId: string
}

// Project progress = completed tasks / total tasks. Chosen over a goal-based
// ratio because tasks are the finer-grained, always-present unit — a project
// can have zero goals defined yet and still have real task progress, but the
// reverse (goals with no tasks) shouldn't read as 0% project progress.
export default function ProjectOverview({ tasks, goals, assigneesMap, userId }: ProjectOverviewProps) {
  const activeGoals = goals.filter(g => g.status !== 'archived')
  const completedGoals = activeGoals.filter(g => g.status === 'completed').length
  const goalsInProgress = activeGoals.length - completedGoals

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const openTasks = totalTasks - completedTasks
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())).length
  const myTasks = tasks.filter(t => (assigneesMap[t.id] ?? []).includes(userId)).length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const stats = [
    { icon: Target, label: 'Goals', value: `${completedGoals}/${activeGoals.length}`, sub: `${goalsInProgress} active` },
    { icon: ListTodo, label: 'Tasks', value: `${completedTasks}/${totalTasks}`, sub: `${openTasks} open` },
    { icon: AlertTriangle, label: 'Overdue', value: String(overdueTasks), sub: overdueTasks > 0 ? 'need attention' : 'all on track', warn: overdueTasks > 0 },
    { icon: User, label: 'My tasks', value: String(myTasks), sub: 'assigned to you' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-gold" />
            <p className="text-sm font-semibold text-primary">Project progress</p>
          </div>
          <span className="text-lg font-bold text-primary">{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-hover overflow-hidden">
          <div className="h-full bg-gold transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-[11px] text-muted mt-1.5">{completedTasks} of {totalTasks} tasks completed</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon size={13} className={s.warn ? 'text-red' : 'text-muted'} />
              <span className="text-xs text-secondary">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.warn ? 'text-red' : 'text-primary'}`}>{s.value}</p>
            <p className="text-[11px] text-muted mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {goals.filter(g => g.status === 'active').length > 0 && (
        <div>
          <p className="text-xs text-secondary mb-2 flex items-center gap-1"><CheckCircle2 size={12} /> Active goals</p>
          <div className="space-y-1.5">
            {goals.filter(g => g.status === 'active').slice(0, 5).map(g => {
              const goalTasks = tasks.filter(t => t.goal_id === g.id)
              const done = goalTasks.filter(t => t.status === 'done').length
              const pct = goalTasks.length > 0 ? Math.round((done / goalTasks.length) * 100) : 0
              return (
                <div key={g.id} className="flex items-center gap-3 bg-hover/50 border border-[var(--border)] rounded-md px-3 py-2">
                  <span className="text-xs text-primary flex-1 truncate">{g.title}</span>
                  <span className="text-[11px] text-muted flex-shrink-0">{done}/{goalTasks.length}</span>
                  <div className="w-16 h-1.5 rounded-full bg-hover overflow-hidden flex-shrink-0">
                    <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
