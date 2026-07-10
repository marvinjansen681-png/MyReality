'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO, isPast, isToday, differenceInCalendarDays, addDays, isWithinInterval } from 'date-fns'
import { Target, CheckCircle2, ListTodo, AlertTriangle, User, TrendingUp, CalendarClock, CalendarDays, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { canExplainMissedDeadline } from '@/lib/permissions/projectPermissions'
import type { Task, ProjectGoal, Profile, ProjectRole, DeadlineExplanation } from '@/types'

interface ProjectOverviewProps {
  projectId: string
  tasks: Task[]
  goals: ProjectGoal[]
  assigneesMap: Record<string, string[]>
  profileMap: Record<string, Profile>
  userId: string
  projectRole: ProjectRole | null
  deadlineExplanations: DeadlineExplanation[]
  onExplanationAdded: (row: DeadlineExplanation) => void
}

function personName(profileMap: Record<string, Profile>, id: string): string {
  return profileMap[id]?.full_name ?? profileMap[id]?.email ?? 'Unknown'
}

// Project progress = completed tasks / total tasks. Chosen over a goal-based
// ratio because tasks are the finer-grained, always-present unit — a project
// can have zero goals defined yet and still have real task progress, but the
// reverse (goals with no tasks) shouldn't read as 0% project progress.
export default function ProjectOverview({
  projectId, tasks, goals, assigneesMap, profileMap, userId, projectRole, deadlineExplanations, onExplanationAdded,
}: ProjectOverviewProps) {
  const canExplain = canExplainMissedDeadline(projectRole)
  const today = new Date(new Date().toDateString())
  const weekEnd = addDays(today, 7)

  const activeGoals = goals.filter(g => g.status !== 'archived')
  const completedGoalsCount = activeGoals.filter(g => g.status === 'completed').length
  const overdueGoals = activeGoals.filter(g => g.status === 'active' && g.due_date && isPast(parseISO(g.due_date)) && !isToday(parseISO(g.due_date)))

  const actionSteps = tasks.filter(t => t.goal_id !== null)
  const openActionSteps = actionSteps.filter(t => t.status !== 'done')
  const completedActionSteps = actionSteps.filter(t => t.status === 'done')

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const openTasks = totalTasks - completedTasks
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))
  const dueToday = tasks.filter(t => t.status !== 'done' && t.due_date && isToday(parseISO(t.due_date)))
  const dueThisWeek = tasks.filter(t => t.status !== 'done' && t.due_date && isWithinInterval(parseISO(t.due_date), { start: today, end: weekEnd }))
  const myTasks = tasks.filter(t => (assigneesMap[t.id] ?? []).includes(userId))
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const latestExplanationForTask = (taskId: string) => deadlineExplanations.find(e => e.task_id === taskId)
  const latestExplanationForGoal = (goalId: string) => deadlineExplanations.find(e => e.goal_id === goalId)

  const unassignedActionSteps = openActionSteps.filter(t => t.due_date && (assigneesMap[t.id] ?? []).length === 0)
  const urgentSoon = tasks.filter(t =>
    t.status !== 'done' && (t.priority === 'high' || t.priority === 'urgent') && t.due_date
    && !isPast(parseISO(t.due_date)) && isWithinInterval(parseISO(t.due_date), { start: today, end: addDays(today, 3) })
  )
  const goalsWithNoActionSteps = activeGoals.filter(g => g.status === 'active' && actionSteps.every(t => t.goal_id !== g.id))

  const stats = [
    { icon: Target, label: 'Goals', value: `${completedGoalsCount}/${activeGoals.length}`, sub: `${activeGoals.length - completedGoalsCount} active` },
    { icon: ListTodo, label: 'Action steps', value: `${completedActionSteps.length}/${actionSteps.length}`, sub: `${openActionSteps.length} open` },
    { icon: AlertTriangle, label: 'Overdue', value: String(overdueTasks.length + overdueGoals.length), sub: (overdueTasks.length + overdueGoals.length) > 0 ? 'need attention' : 'all on track', warn: (overdueTasks.length + overdueGoals.length) > 0 },
    { icon: User, label: 'My tasks', value: String(myTasks.length), sub: 'assigned to you' },
    { icon: CalendarClock, label: 'Due today', value: String(dueToday.length), sub: 'not yet done' },
    { icon: CalendarDays, label: 'Due this week', value: String(dueThisWeek.length), sub: 'next 7 days' },
  ]

  return (
    <div className="space-y-5">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-gold" />
            <p className="text-sm font-semibold text-primary">Project Pulse</p>
          </div>
          <span className="text-lg font-bold text-primary">{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-hover overflow-hidden">
          <motion.div
            className="h-full bg-gold"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[11px] text-muted mt-1.5">{completedTasks} of {totalTasks} tasks completed</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={cn('bg-[var(--bg-surface)] border rounded-lg p-3.5', s.warn ? 'border-red/40' : 'border-[var(--border)]')}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon size={13} className={s.warn ? 'text-red' : 'text-muted'} />
              <span className="text-xs text-secondary">{s.label}</span>
            </div>
            <p className={cn('text-xl font-bold', s.warn ? 'text-red' : 'text-primary')}>{s.value}</p>
            <p className="text-[11px] text-muted mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <NeedsAttention
        projectId={projectId}
        overdueTasks={overdueTasks}
        overdueGoals={overdueGoals}
        urgentSoon={urgentSoon}
        unassignedActionSteps={unassignedActionSteps}
        goalsWithNoActionSteps={goalsWithNoActionSteps}
        profileMap={profileMap}
        assigneesMap={assigneesMap}
        latestExplanationForTask={latestExplanationForTask}
        latestExplanationForGoal={latestExplanationForGoal}
        canExplain={canExplain}
        onExplanationAdded={onExplanationAdded}
      />

      {deadlineExplanations.length > 0 && (
        <div>
          <p className="text-xs text-secondary mb-2 flex items-center gap-1"><CalendarClock size={12} /> Deadline explanations</p>
          <div className="space-y-1.5">
            {deadlineExplanations.slice(0, 5).map(e => {
              const target = e.task_id ? tasks.find(t => t.id === e.task_id)?.title : goals.find(g => g.id === e.goal_id)?.title
              return (
                <div key={e.id} className="bg-hover/50 border border-[var(--border)] rounded-md px-3 py-2.5">
                  <p className="text-xs text-primary">{target ?? (e.task_id ? 'a task' : 'a goal')}</p>
                  <p className="text-xs text-secondary mt-0.5">{e.reason}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted">
                    <span>{personName(profileMap, e.created_by ?? '')}</span>
                    <span>· {format(parseISO(e.created_at), 'MMM d, HH:mm')}</span>
                    {e.new_expected_date && <span>· New expected date: {format(parseISO(e.new_expected_date), 'MMM d, yyyy')}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeGoals.filter(g => g.status === 'active').length > 0 && (
        <div>
          <p className="text-xs text-secondary mb-2 flex items-center gap-1"><CheckCircle2 size={12} /> Active goals</p>
          <div className="space-y-1.5">
            {activeGoals.filter(g => g.status === 'active').slice(0, 5).map(g => {
              const goalTasks = tasks.filter(t => t.goal_id === g.id)
              const done = goalTasks.filter(t => t.status === 'done').length
              const pct = goalTasks.length > 0 ? Math.round((done / goalTasks.length) * 100) : 0
              return (
                <div key={g.id} className="flex items-center gap-3 bg-hover/50 border border-[var(--border)] rounded-md px-3 py-2">
                  <span className="text-xs text-primary flex-1 truncate">{g.title}</span>
                  <span className="text-[11px] text-muted flex-shrink-0">{done}/{goalTasks.length}</span>
                  <div className="w-16 h-1.5 rounded-full bg-hover overflow-hidden flex-shrink-0">
                    <motion.div className="h-full bg-gold" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
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

interface NeedsAttentionProps {
  projectId: string
  overdueTasks: Task[]
  overdueGoals: ProjectGoal[]
  urgentSoon: Task[]
  unassignedActionSteps: Task[]
  goalsWithNoActionSteps: ProjectGoal[]
  profileMap: Record<string, Profile>
  assigneesMap: Record<string, string[]>
  latestExplanationForTask: (taskId: string) => DeadlineExplanation | undefined
  latestExplanationForGoal: (goalId: string) => DeadlineExplanation | undefined
  canExplain: boolean
  onExplanationAdded: (row: DeadlineExplanation) => void
}

function NeedsAttention({
  projectId, overdueTasks, overdueGoals, urgentSoon, unassignedActionSteps, goalsWithNoActionSteps,
  profileMap, assigneesMap, latestExplanationForTask, latestExplanationForGoal, canExplain, onExplanationAdded,
}: NeedsAttentionProps) {
  const overdueTasksNoReason = overdueTasks.filter(t => !latestExplanationForTask(t.id))
  const overdueGoalsNoReason = overdueGoals.filter(g => !latestExplanationForGoal(g.id))

  const totalCount = overdueTasksNoReason.length + overdueGoalsNoReason.length + urgentSoon.length + unassignedActionSteps.length + goalsWithNoActionSteps.length

  if (totalCount === 0) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex items-center gap-2">
        <CheckCircle2 size={16} className="text-green flex-shrink-0" />
        <p className="text-sm text-secondary">Nothing needs attention right now.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-secondary mb-2 flex items-center gap-1"><AlertCircle size={12} className="text-red" /> Needs Attention</p>
      <div className="space-y-2">
        {overdueTasksNoReason.map(t => (
          <OverdueRow key={`t-${t.id}`} title={t.title} dueDate={t.due_date!} responsible={(assigneesMap[t.id] ?? [])[0]} profileMap={profileMap}
            taskId={t.id} projectId={projectId} canExplain={canExplain} onExplanationAdded={onExplanationAdded} />
        ))}
        {overdueGoalsNoReason.map(g => (
          <OverdueRow key={`g-${g.id}`} title={g.title} dueDate={g.due_date!} responsible={undefined} profileMap={profileMap} isGoal
            goalId={g.id} projectId={projectId} canExplain={canExplain} onExplanationAdded={onExplanationAdded} />
        ))}
        {urgentSoon.map(t => (
          <div key={`u-${t.id}`} className="flex items-center gap-2.5 bg-[var(--gold-muted)] border border-gold/30 rounded-md px-3 py-2.5">
            <AlertTriangle size={13} className="text-gold flex-shrink-0" />
            <span className="text-xs text-primary flex-1 truncate">{t.title}</span>
            <span className="text-[11px] text-gold flex-shrink-0">Due {format(parseISO(t.due_date!), 'MMM d')} · {t.priority}</span>
          </div>
        ))}
        {unassignedActionSteps.map(t => (
          <div key={`una-${t.id}`} className="flex items-center gap-2.5 bg-hover/50 border border-[var(--border)] rounded-md px-3 py-2.5">
            <User size={13} className="text-muted flex-shrink-0" />
            <span className="text-xs text-primary flex-1 truncate">{t.title}</span>
            <span className="text-[11px] text-muted flex-shrink-0">Unassigned · due {format(parseISO(t.due_date!), 'MMM d')}</span>
          </div>
        ))}
        {goalsWithNoActionSteps.map(g => (
          <div key={`gn-${g.id}`} className="flex items-center gap-2.5 bg-hover/50 border border-[var(--border)] rounded-md px-3 py-2.5">
            <Target size={13} className="text-muted flex-shrink-0" />
            <span className="text-xs text-primary flex-1 truncate">{g.title}</span>
            <span className="text-[11px] text-muted flex-shrink-0">No action steps yet</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface OverdueRowProps {
  title: string
  dueDate: string
  responsible: string | undefined
  profileMap: Record<string, Profile>
  taskId?: string
  goalId?: string
  isGoal?: boolean
  projectId: string
  canExplain: boolean
  onExplanationAdded: (row: DeadlineExplanation) => void
}

function OverdueRow({ title, dueDate, responsible, profileMap, taskId, goalId, isGoal, projectId, canExplain, onExplanationAdded }: OverdueRowProps) {
  const [addingReason, setAddingReason] = useState(false)
  const daysOverdue = Math.max(1, differenceInCalendarDays(new Date(new Date().toDateString()), parseISO(dueDate)))

  return (
    <div className="bg-[var(--red-muted)] border border-red/30 rounded-md px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        {isGoal ? <Target size={13} className="text-red flex-shrink-0" /> : <AlertTriangle size={13} className="text-red flex-shrink-0" />}
        <span className="text-xs text-primary flex-1 truncate">{title}</span>
        <span className="text-[11px] text-red flex-shrink-0">{daysOverdue}d overdue</span>
      </div>
      <div className="flex items-center justify-between mt-1.5 pl-[21px]">
        <span className="text-[11px] text-muted">
          {responsible ? personName(profileMap, responsible) : 'Unassigned'}
        </span>
        {canExplain && !addingReason && (
          <button onClick={() => setAddingReason(true)} className="text-[11px] text-red font-medium hover:underline">
            Reason required · Add reason
          </button>
        )}
        {!canExplain && <span className="text-[11px] text-red font-medium">Reason required</span>}
      </div>
      {addingReason && (
        <AddReasonForm
          projectId={projectId}
          taskId={taskId}
          goalId={goalId}
          dueDate={dueDate}
          onSaved={row => { onExplanationAdded(row); setAddingReason(false) }}
          onCancel={() => setAddingReason(false)}
        />
      )}
    </div>
  )
}

interface AddReasonFormProps {
  projectId: string
  taskId?: string
  goalId?: string
  dueDate: string
  onSaved: (row: DeadlineExplanation) => void
  onCancel: () => void
}

function AddReasonForm({ projectId, taskId, goalId, dueDate, onSaved, onCancel }: AddReasonFormProps) {
  const [reason, setReason] = useState('')
  const [newExpectedDate, setNewExpectedDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!reason.trim()) { toast.error('A reason is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('deadline_explanations')
      .insert({
        project_id: projectId,
        task_id: taskId ?? null,
        goal_id: goalId ?? null,
        due_date: dueDate,
        reason: reason.trim(),
        new_expected_date: newExpectedDate || null,
      })
      .select('*')
      .single()
    setSaving(false)
    if (error) { toast.error('Failed to save reason', { description: error.message }); return }
    onSaved(data as DeadlineExplanation)
    toast.success('Reason saved')
  }

  return (
    <div className="mt-2 pl-[21px] space-y-2">
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={2}
        placeholder="Why was this missed?"
        className="w-full bg-card border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary placeholder:text-muted resize-none focus:outline-none focus:border-[var(--border-focus)] transition-colors"
      />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={newExpectedDate}
          onChange={e => setNewExpectedDate(e.target.value)}
          placeholder="New expected date"
          className="bg-card border border-[var(--border)] rounded-md px-2 py-1.5 text-xs text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
        />
        <button onClick={save} disabled={saving || !reason.trim()} className="flex items-center gap-1 px-2.5 py-1.5 bg-gold text-black text-xs font-semibold rounded-md hover:bg-gold-light transition-colors disabled:opacity-40">
          {saving && <Loader2 size={11} className="animate-spin" />} Save
        </button>
        <button onClick={onCancel} className="px-2.5 py-1.5 text-xs text-muted hover:text-secondary transition-colors">Cancel</button>
      </div>
    </div>
  )
}
