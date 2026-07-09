'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Target, Plus, Loader2, ChevronDown, Archive, RotateCcw, CheckCircle2, Circle, X as XIcon, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { fetchProfilesByIds } from '@/lib/utils/profiles'
import { parseMentions } from '@/lib/utils/mentions'
import { canCreateGoal, canEditGoal, canCompleteGoal, canArchiveGoal, canCommentOnGoal } from '@/lib/permissions/projectPermissions'
import EmptyState from '@/components/shared/EmptyState'
import PriorityBadge from '@/components/shared/PriorityBadge'
import TaskDetail from './TaskDetail'
import type { ProjectGoal, ProjectGoalPriority, ProjectGoalComment, Task, TaskPriority, Profile, ProjectRole } from '@/types'

const PRIORITIES: ProjectGoalPriority[] = ['low', 'medium', 'high', 'urgent']

interface ProjectGoalsProps {
  projectId: string
  userId: string
  userProfile: Profile | null
  projectRole: ProjectRole | null
  tasks: Task[]
  profileMap: Record<string, Profile>
  onTaskUpdated: (task: Task) => void
}

export default function ProjectGoals({ projectId, userId, userProfile, projectRole, tasks, profileMap, onTaskUpdated }: ProjectGoalsProps) {
  const [goals, setGoals] = useState<ProjectGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<ProjectGoal | 'new' | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const canCreate = canCreateGoal(projectRole)
  const canEdit = canEditGoal(projectRole)
  const canComplete = canCompleteGoal(projectRole)
  const canArchive = canArchiveGoal(projectRole)

  const loadGoals = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('project_goals')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('created_at')
    setGoals((data ?? []) as ProjectGoal[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { loadGoals() }, [loadGoals])

  // Realtime: keep goals in sync for all project members without a refresh.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${projectId}:goals`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_goals', filter: `project_id=eq.${projectId}` }, () => {
        loadGoals()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId, loadGoals])

  const visibleGoals = goals.filter(g => showArchived ? g.status === 'archived' : g.status !== 'archived')

  function tasksForGoal(goalId: string): Task[] {
    return tasks.filter(t => t.goal_id === goalId)
  }

  async function toggleComplete(goal: ProjectGoal) {
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed'
    const supabase = createClient()
    const { error } = await supabase.from('project_goals').update({ status: nextStatus }).eq('id', goal.id)
    if (error) { toast.error('Failed to update goal'); return }
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: nextStatus } : g))
    toast.success(nextStatus === 'completed' ? 'Goal completed' : 'Goal reopened')
  }

  async function toggleArchive(goal: ProjectGoal) {
    const nextStatus = goal.status === 'archived' ? 'active' : 'archived'
    const supabase = createClient()
    const { error } = await supabase.from('project_goals').update({ status: nextStatus }).eq('id', goal.id)
    if (error) { toast.error('Failed to update goal'); return }
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: nextStatus } : g))
    toast.success(nextStatus === 'archived' ? 'Goal archived' : 'Goal restored')
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="text-muted animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowArchived(v => !v)}
          className={cn('text-xs px-2.5 py-1.5 rounded-full transition-colors', showArchived ? 'bg-gold text-black' : 'bg-hover text-secondary hover:text-primary')}
        >
          {showArchived ? 'Showing archived' : 'Show archived'}
        </button>
        {canCreate && (
          <button
            onClick={() => setEditingGoal('new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-gold text-black text-xs font-semibold rounded-md hover:bg-gold-light transition-colors min-h-[36px]"
          >
            <Plus size={14} /> New Goal
          </button>
        )}
      </div>

      {visibleGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={showArchived ? 'No archived goals' : 'No goals yet'}
          description={showArchived ? undefined : 'Break this project into milestones and track progress toward each one.'}
        />
      ) : (
        <div className="space-y-2.5">
          {visibleGoals.map(goal => {
            const goalTasks = tasksForGoal(goal.id)
            const doneCount = goalTasks.filter(t => t.status === 'done').length
            const pct = goalTasks.length > 0 ? Math.round((doneCount / goalTasks.length) * 100) : goal.status === 'completed' ? 100 : 0
            const expanded = expandedId === goal.id

            return (
              <div key={goal.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="p-3.5 cursor-pointer" onClick={() => setExpandedId(expanded ? null : goal.id)}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); if (canComplete) toggleComplete(goal) }}
                      disabled={!canComplete}
                      className="flex-shrink-0 mt-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {goal.status === 'completed'
                        ? <CheckCircle2 size={18} className="text-green" />
                        : <Circle size={18} className="text-muted" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('text-sm font-semibold', goal.status === 'completed' ? 'line-through text-muted' : 'text-primary')}>{goal.title}</p>
                        <PriorityBadge priority={goal.priority as TaskPriority} />
                        {goal.status === 'archived' && <span className="text-[10px] bg-hover text-muted px-1.5 py-0.5 rounded-full">Archived</span>}
                      </div>
                      {goal.description && <p className="text-xs text-secondary mt-1 line-clamp-2">{goal.description}</p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {goal.due_date && <span className="text-[11px] text-muted">Due {format(parseISO(goal.due_date), 'MMM d, yyyy')}</span>}
                        <span className="text-[11px] text-muted">{doneCount}/{goalTasks.length} tasks</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-hover overflow-hidden">
                            <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-muted">{pct}%</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown size={14} className={cn('text-muted flex-shrink-0 mt-1 transition-transform', expanded && 'rotate-180')} />
                  </div>
                </div>

                {expanded && (
                  <GoalDetails
                    goal={goal}
                    goalTasks={goalTasks}
                    profileMap={profileMap}
                    userId={userId}
                    canEdit={canEdit}
                    canArchive={canArchive}
                    canComment={canCommentOnGoal(projectRole)}
                    onEdit={() => setEditingGoal(goal)}
                    onArchiveToggle={() => toggleArchive(goal)}
                    onSelectTask={t => setActiveTask(t)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {editingGoal && (
        <GoalFormModal
          projectId={projectId}
          userId={userId}
          goal={editingGoal === 'new' ? null : editingGoal}
          onClose={() => setEditingGoal(null)}
          onSaved={goal => {
            setGoals(prev => {
              const exists = prev.some(g => g.id === goal.id)
              return exists ? prev.map(g => g.id === goal.id ? goal : g) : [...prev, goal]
            })
            setEditingGoal(null)
          }}
        />
      )}

      <TaskDetail
        task={activeTask}
        userId={userId}
        userProfile={userProfile}
        projectRole={projectRole}
        onClose={() => setActiveTask(null)}
        onUpdated={updated => { onTaskUpdated(updated); setActiveTask(updated) }}
      />
    </div>
  )
}

interface GoalDetailsProps {
  goal: ProjectGoal
  goalTasks: Task[]
  profileMap: Record<string, Profile>
  userId: string
  canEdit: boolean
  canArchive: boolean
  canComment: boolean
  onEdit: () => void
  onArchiveToggle: () => void
  onSelectTask: (task: Task) => void
}

function GoalDetails({ goal, goalTasks, profileMap, userId, canEdit, canArchive, canComment, onEdit, onArchiveToggle, onSelectTask }: GoalDetailsProps) {
  const [comments, setComments] = useState<ProjectGoalComment[]>([])
  const [peopleMap, setPeopleMap] = useState<Record<string, Profile>>({})
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('project_goal_comments').select('*').eq('goal_id', goal.id).order('created_at')
      if (cancelled) return
      const rows = (data ?? []) as ProjectGoalComment[]
      setComments(rows)
      const profiles = await fetchProfilesByIds(supabase, rows.map(c => c.user_id))
      if (!cancelled) setPeopleMap(profiles)
      setLoadingComments(false)
    }
    load()
    return () => { cancelled = true }
  }, [goal.id])

  async function sendComment() {
    if (!commentText.trim()) return
    setSending(true)
    const supabase = createClient()
    const content = commentText.trim()
    const { data, error } = await supabase
      .from('project_goal_comments')
      .insert({ goal_id: goal.id, project_id: goal.project_id, content })
      .select('*')
      .single()
    setSending(false)
    if (error) { toast.error('Failed to send comment'); return }
    const inserted = data as ProjectGoalComment
    setComments(prev => [...prev, inserted])
    setCommentText('')

    const candidates = Object.values(profileMap)
    const mentionedIds = parseMentions(content, candidates)
    if (mentionedIds.length > 0) {
      await supabase.rpc('create_goal_mention_notifications', { comment_id_input: inserted.id, mentioned_user_ids: mentionedIds })
    }
  }

  return (
    <div className="border-t border-[var(--border)] px-3.5 py-3 space-y-4">
      <div className="flex items-center gap-2">
        {canEdit && (
          <button onClick={onEdit} className="text-xs text-secondary hover:text-primary bg-hover px-2.5 py-1.5 rounded-md transition-colors">Edit</button>
        )}
        {canArchive && (
          <button onClick={onArchiveToggle} className="flex items-center gap-1 text-xs text-secondary hover:text-primary bg-hover px-2.5 py-1.5 rounded-md transition-colors">
            {goal.status === 'archived' ? <><RotateCcw size={12} /> Restore</> : <><Archive size={12} /> Archive</>}
          </button>
        )}
      </div>

      <div>
        <p className="text-xs text-muted mb-1.5">Tasks under this goal</p>
        {goalTasks.length === 0 ? (
          <p className="text-xs text-muted">No tasks linked yet.</p>
        ) : (
          <div className="space-y-1">
            {goalTasks.map(t => (
              <button
                key={t.id}
                onClick={() => onSelectTask(t)}
                className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-hover transition-colors"
              >
                {t.status === 'done' ? <CheckCircle2 size={13} className="text-green flex-shrink-0" /> : <Circle size={13} className="text-muted flex-shrink-0" />}
                <span className={cn('text-xs truncate', t.status === 'done' ? 'line-through text-muted' : 'text-secondary')}>{t.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-muted mb-1.5">Comments</p>
        {loadingComments ? (
          <div className="flex justify-center py-3"><Loader2 size={14} className="text-muted animate-spin" /></div>
        ) : (
          <div className="space-y-2 mb-2">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-hover flex items-center justify-center text-[10px] font-semibold text-secondary flex-shrink-0">
                  {(peopleMap[c.user_id]?.full_name ?? peopleMap[c.user_id]?.email ?? '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-primary mr-1.5">{peopleMap[c.user_id]?.full_name ?? peopleMap[c.user_id]?.email ?? 'User'}</span>
                  <span className="text-xs text-secondary">{c.content}</span>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-xs text-muted">No comments yet.</p>}
          </div>
        )}
        {canComment ? (
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendComment() }}
              placeholder="Add a comment... (@name to mention)"
              className="flex-1 bg-card border border-[var(--border)] rounded-full px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />
            <button
              onClick={sendComment}
              disabled={!commentText.trim() || sending}
              className="w-7 h-7 flex items-center justify-center bg-gold text-black rounded-full disabled:opacity-40 hover:bg-gold-light transition-colors flex-shrink-0"
            >
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted">You don&apos;t have permission to comment on this goal.</p>
        )}
      </div>
    </div>
  )
}

interface GoalFormModalProps {
  projectId: string
  userId: string
  goal: ProjectGoal | null
  onClose: () => void
  onSaved: (goal: ProjectGoal) => void
}

function GoalFormModal({ projectId, goal, onClose, onSaved }: GoalFormModalProps) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [priority, setPriority] = useState<ProjectGoalPriority>(goal?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(goal?.due_date ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) { toast.error('Goal title is required'); return }
    setSaving(true)
    const supabase = createClient()
    if (goal) {
      const { data, error } = await supabase
        .from('project_goals')
        .update({ title: title.trim(), description: description.trim() || null, priority, due_date: dueDate || null })
        .eq('id', goal.id)
        .select('*')
        .single()
      setSaving(false)
      if (error) { toast.error('Failed to save goal'); return }
      onSaved(data as ProjectGoal)
      toast.success('Goal updated')
    } else {
      const { data, error } = await supabase
        .from('project_goals')
        .insert({ project_id: projectId, title: title.trim(), description: description.trim() || null, priority, due_date: dueDate || null })
        .select('*')
        .single()
      setSaving(false)
      if (error) { toast.error('Failed to create goal'); return }
      onSaved(data as ProjectGoal)
      toast.success('Goal created')
    }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/60 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          className="pointer-events-auto bg-card border border-[var(--border)] flex flex-col w-full rounded-t-2xl max-h-[90dvh] sm:rounded-xl sm:max-w-md sm:max-h-[85vh]"
          initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            <h2 className="font-display text-lg font-bold text-primary">{goal ? 'Edit Goal' : 'New Goal'}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-md transition-colors">
              <XIcon size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Launch v2"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="What does success look like?"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted resize-none focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-secondary mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as ProjectGoalPriority)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-secondary mb-1.5">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-sm text-secondary hover:bg-hover transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {goal ? 'Save' : 'Create Goal'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
