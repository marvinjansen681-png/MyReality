'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { X, Calendar, Flag, Clock, Tag, Plus, Loader2, Send, Activity } from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { logActivity, insertNotification } from '@/lib/utils/activity'
import SubtaskList from '@/components/tasks/SubtaskList'
import PriorityBadge from '@/components/shared/PriorityBadge'
import type { Task, TaskComment, TaskActivity, TaskPriority, Profile } from '@/types'

const PRIORITIES: TaskPriority[] = ['none', 'low', 'medium', 'high', 'urgent']
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'No priority', low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

interface TaskDetailProps {
  task: Task | null
  userId: string
  userProfile: Profile | null
  onClose: () => void
  onUpdated: (task: Task) => void
}

export default function TaskDetail({ task, userId, userProfile, onClose, onUpdated }: TaskDetailProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('none')
  const [dueDate, setDueDate] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [activity, setActivity] = useState<TaskActivity[]>([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: { class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[60px] text-primary' }
    },
    onUpdate: () => scheduleAutoSave(),
  })

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setLabels(task.labels ?? [])
    editor?.commands.setContent(task.description as Record<string, unknown> | undefined ?? '')
    loadTaskData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  useEffect(() => {
    if (addingLabel) labelInputRef.current?.focus()
  }, [addingLabel])

  async function loadTaskData() {
    if (!task) return
    const supabase = createClient()
    const [subtasksRes, commentsRes, activityRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('parent_task_id', task.id).order('position'),
      supabase.from('task_comments').select('*, profile:profiles!task_comments_user_id_fkey(full_name, avatar_url)').eq('task_id', task.id).order('created_at'),
      supabase.from('task_activity').select('*, profile:profiles!task_activity_user_id_fkey(full_name)').eq('task_id', task.id).order('created_at', { ascending: false }).limit(20),
    ])
    if (subtasksRes.data) setSubtasks(subtasksRes.data as Task[])
    if (commentsRes.data) setComments(commentsRes.data as TaskComment[])
    if (activityRes.data) setActivity(activityRes.data as TaskActivity[])
  }

  const scheduleAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveField({}), 500)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveField(overrides: Partial<Task>) {
    if (!task) return
    setSaving(true)
    const supabase = createClient()
    const updates = {
      title,
      priority,
      due_date: dueDate || null,
      labels,
      description: editor?.getJSON() as Record<string, unknown> | null ?? null,
      updated_at: new Date().toISOString(),
      ...overrides,
    }
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', task.id).select().single()
    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    onUpdated(data as Task)

    // Notify newly assigned users
    if (overrides.assigned_to) {
      const prevAssigned = task.assigned_to ?? []
      const newAssigned = (overrides.assigned_to as string[]) ?? []
      const added = newAssigned.filter(id => !prevAssigned.includes(id) && id !== userId)
      for (const assigneeId of added) {
        await insertNotification({
          userId: assigneeId,
          type: 'task_assigned',
          title: `You were assigned to "${(overrides.title ?? title)}"`,
          body: `Assigned by ${userProfile?.full_name ?? 'someone'}`,
          link: task.project_id ? `/projects/${task.project_id}` : undefined,
        })
      }
    }
  }

  async function sendComment() {
    if (!commentText.trim() || !task) return
    setSendingComment(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: task.id, user_id: userId, content: commentText.trim() })
      .select('*, profile:profiles!task_comments_user_id_fkey(full_name, avatar_url)')
      .single()
    setSendingComment(false)
    if (error) { toast.error('Failed to send comment'); return }
    setComments(prev => [...prev, data as TaskComment])
    setCommentText('')
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // Log activity + notify task creator if different user
    await logActivity(task.id, userId, 'commented', { preview: commentText.trim().slice(0, 80) })
    if (task.created_by !== userId) {
      await insertNotification({
        userId: task.created_by,
        type: 'task_commented',
        title: `New comment on "${task.title}"`,
        body: `${userProfile?.full_name ?? 'Someone'}: ${commentText.trim().slice(0, 100)}`,
        link: task.project_id ? `/projects/${task.project_id}` : undefined,
      })
    }
  }

  function addLabel() {
    const l = newLabel.trim()
    if (l && !labels.includes(l)) {
      const next = [...labels, l]
      setLabels(next)
      saveField({ labels: next })
    }
    setNewLabel('')
    setAddingLabel(false)
  }

  const ACTION_LABELS: Record<string, string> = {
    created: 'created this task',
    updated: 'updated this task',
    commented: 'commented',
    assigned: 'was assigned',
    moved: 'moved this task',
    completed: 'completed this task',
    reopened: 'reopened this task',
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              'fixed z-50 bg-card border-[var(--border)] overflow-hidden flex flex-col',
              'bottom-0 left-0 right-0 h-[95dvh] rounded-t-2xl border-t',
              'lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[520px] lg:h-full lg:rounded-none lg:border-l lg:border-t-0'
            )}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>

            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={priority} />
                {saving && <Loader2 size={12} className="text-muted animate-spin" />}
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-secondary transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4 space-y-5">
                {/* Title */}
                <input
                  value={title}
                  onChange={e => { setTitle(e.target.value); scheduleAutoSave() }}
                  onBlur={() => saveField({ title })}
                  className="w-full bg-transparent text-xl font-semibold text-primary outline-none border-b border-transparent focus:border-[var(--border-focus)] transition-colors pb-1"
                  placeholder="Task title"
                />

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted mb-1.5 flex items-center gap-1 block"><Flag size={11} /> Priority</label>
                    <select
                      value={priority}
                      onChange={e => { const p = e.target.value as TaskPriority; setPriority(p); saveField({ priority: p }) }}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary focus:outline-none focus:border-[var(--border-focus)]"
                    >
                      {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 flex items-center gap-1 block"><Calendar size={11} /> Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => { setDueDate(e.target.value); saveField({ due_date: e.target.value || null }) }}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary focus:outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <label className="text-xs text-muted mb-2 flex items-center gap-1 block"><Tag size={11} /> Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {labels.map(l => (
                      <span key={l} className="flex items-center gap-1 text-xs bg-hover text-secondary px-2 py-1 rounded-full">
                        {l}
                        <button onClick={() => { const next = labels.filter(x => x !== l); setLabels(next); saveField({ labels: next }) }} className="text-muted hover:text-red ml-0.5">×</button>
                      </span>
                    ))}
                    {addingLabel ? (
                      <input
                        ref={labelInputRef}
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        onBlur={addLabel}
                        onKeyDown={e => { if (e.key === 'Enter') addLabel(); if (e.key === 'Escape') { setAddingLabel(false); setNewLabel('') } }}
                        placeholder="Label..."
                        className="text-xs bg-[var(--bg-surface)] border border-[var(--border-focus)] rounded-full px-2 py-1 text-primary outline-none w-24"
                      />
                    ) : (
                      <button onClick={() => setAddingLabel(true)} className="flex items-center gap-1 text-xs text-muted hover:text-secondary transition-colors py-1">
                        <Plus size={11} /> Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-muted mb-2 block">Description</label>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 focus-within:border-[var(--border-focus)] transition-colors">
                    {editor && <EditorContent editor={editor} />}
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <label className="text-xs text-muted mb-2 block">Subtasks</label>
                  <SubtaskList parentId={task.id} subtasks={subtasks} onSubtasksChange={setSubtasks} userId={userId} />
                </div>

                {/* Comments */}
                <div>
                  <label className="text-xs text-muted mb-3 block">Comments</label>
                  <div className="space-y-3">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-hover flex items-center justify-center text-xs font-semibold text-secondary flex-shrink-0">
                          {(c.profile as Profile | undefined)?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-primary">{(c.profile as Profile | undefined)?.full_name ?? 'User'}</span>
                            <span className="text-[10px] text-muted">{formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-secondary leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                </div>

                {/* Activity log */}
                {activity.length > 0 && (
                  <div>
                    <label className="text-xs text-muted mb-3 flex items-center gap-1 block"><Activity size={11} /> Activity</label>
                    <div className="space-y-2">
                      {activity.map(a => (
                        <div key={a.id} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)] mt-1.5 flex-shrink-0" />
                          <p className="text-xs text-muted leading-relaxed">
                            <span className="text-secondary">{(a.profile as Profile | undefined)?.full_name ?? 'Someone'}</span>
                            {' '}{ACTION_LABELS[a.action] ?? a.action}
                            {' · '}{formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom padding for fixed comment bar */}
                <div className="h-16" />
              </div>
            </div>

            {/* Fixed comment input */}
            <div className="flex-shrink-0 border-t border-[var(--border)] px-4 py-3 flex items-center gap-3 bg-card safe-bottom">
              <div className="w-7 h-7 rounded-full bg-hover flex items-center justify-center text-xs font-semibold text-secondary flex-shrink-0">
                {userProfile?.full_name?.charAt(0) ?? '?'}
              </div>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
                placeholder="Add a comment..."
                className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-4 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
              <button
                onClick={sendComment}
                disabled={!commentText.trim() || sendingComment}
                className="w-8 h-8 flex items-center justify-center bg-gold text-black rounded-full disabled:opacity-40 hover:bg-gold-light transition-colors flex-shrink-0"
              >
                {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
