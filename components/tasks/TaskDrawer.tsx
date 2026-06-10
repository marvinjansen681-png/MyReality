'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { X, Calendar, Flag, Clock, Tag, Plus, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import SubtaskList from './SubtaskList'
import PriorityBadge from '@/components/shared/PriorityBadge'
import type { Task, TaskPriority, TaskStatus } from '@/types'

const PRIORITIES: TaskPriority[] = ['none', 'low', 'medium', 'high', 'urgent']
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'No priority', low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

interface TaskDrawerProps {
  task: Task | null
  userId: string
  onClose: () => void
  onUpdated: (task: Task) => void
  onDeleted: (id: string) => void
}

export default function TaskDrawer({ task, userId, onClose, onUpdated, onDeleted }: TaskDrawerProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'none')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours?.toString() ?? '')
  const [actualHours, setActualHours] = useState(task?.actual_hours?.toString() ?? '')
  const [labels, setLabels] = useState<string[]>(task?.labels ?? [])
  const [newLabel, setNewLabel] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [saving, setSaving] = useState(false)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: task?.description as Record<string, unknown> | undefined ?? '',
    editorProps: {
      attributes: { class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[80px] text-primary' }
    },
    onUpdate: () => scheduleAutoSave(),
  })

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setEstimatedHours(task.estimated_hours?.toString() ?? '')
    setActualHours(task.actual_hours?.toString() ?? '')
    setLabels(task.labels ?? [])
    editor?.commands.setContent(task.description as Record<string, unknown> | undefined ?? '')
    loadSubtasks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  useEffect(() => {
    if (addingLabel) labelInputRef.current?.focus()
  }, [addingLabel])

  useEffect(() => {
    if (!task) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [task, onClose])

  async function loadSubtasks() {
    if (!task) return
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', task.id)
      .order('position', { ascending: true })
    if (data) setSubtasks(data as Task[])
  }

  const scheduleAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveChanges(), 500)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveChanges(overrides?: Partial<Task>) {
    if (!task) return
    setSaving(true)
    const supabase = createClient()
    const updates: Partial<Task> & { updated_at: string } = {
      title,
      priority,
      due_date: dueDate || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      actual_hours: actualHours ? parseFloat(actualHours) : null,
      labels,
      description: editor?.getJSON() as Record<string, unknown> | null ?? null,
      updated_at: new Date().toISOString(),
      ...overrides,
    }
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id)
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Failed to save task'); return }
    onUpdated(data as Task)
  }

  async function deleteTask() {
    if (!task) return
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) { toast.error('Failed to delete task'); return }
    onDeleted(task.id)
    onClose()
    toast.success('Task deleted')
  }

  function handlePriorityChange(p: TaskPriority) {
    setPriority(p)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveChanges({ priority: p })
  }

  function handleDueDateChange(v: string) {
    setDueDate(v)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveChanges({ due_date: v || null })
  }

  function addLabel() {
    const l = newLabel.trim()
    if (l && !labels.includes(l)) {
      const next = [...labels, l]
      setLabels(next)
      saveChanges({ labels: next })
    }
    setNewLabel('')
    setAddingLabel(false)
  }

  function removeLabel(l: string) {
    const next = labels.filter(x => x !== l)
    setLabels(next)
    saveChanges({ labels: next })
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className={cn(
              'fixed z-50 bg-card border-[var(--border)] overflow-hidden flex flex-col',
              // Mobile: bottom sheet
              'bottom-0 left-0 right-0 h-[92dvh] rounded-t-2xl border-t',
              // Desktop: right drawer
              'lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[520px] lg:h-full lg:rounded-none lg:border-l lg:border-t-0'
            )}
            initial={{ y: '100%', x: 0, opacity: 0 }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            // Desktop overrides via style (framer doesn't support responsive initial)
            style={{ ['--drawer-x' as string]: 0 }}
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={priority} />
                {saving && <Loader2 size={12} className="text-muted animate-spin" />}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={deleteTask}
                  className="px-2.5 py-1 text-xs text-red hover:bg-[var(--red-muted)] rounded-md transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-secondary hover:text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Title */}
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); scheduleAutoSave() }}
                onBlur={() => saveChanges({ title })}
                className="w-full bg-transparent text-xl font-semibold text-primary outline-none border-b border-transparent focus:border-[var(--border-focus)] transition-colors pb-1"
                placeholder="Task title"
              />

              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                  <label className="block text-xs text-muted mb-1.5 flex items-center gap-1">
                    <Flag size={11} /> Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => handlePriorityChange(e.target.value as TaskPriority)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                </div>

                {/* Due date */}
                <div>
                  <label className="block text-xs text-muted mb-1.5 flex items-center gap-1">
                    <Calendar size={11} /> Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => handleDueDateChange(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                {/* Est. hours */}
                <div>
                  <label className="block text-xs text-muted mb-1.5 flex items-center gap-1">
                    <Clock size={11} /> Est. Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimatedHours}
                    onChange={e => { setEstimatedHours(e.target.value); scheduleAutoSave() }}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                    placeholder="0"
                  />
                </div>

                {/* Actual hours */}
                <div>
                  <label className="block text-xs text-muted mb-1.5 flex items-center gap-1">
                    <Clock size={11} /> Actual Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={actualHours}
                    onChange={e => { setActualHours(e.target.value); scheduleAutoSave() }}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-xs text-muted mb-2 flex items-center gap-1">
                  <Tag size={11} /> Labels
                </label>
                <div className="flex flex-wrap gap-2">
                  {labels.map(l => (
                    <span
                      key={l}
                      className="flex items-center gap-1 text-xs bg-hover text-secondary px-2 py-1 rounded-full"
                    >
                      {l}
                      <button onClick={() => removeLabel(l)} className="text-muted hover:text-red ml-0.5">×</button>
                    </span>
                  ))}
                  {addingLabel ? (
                    <input
                      ref={labelInputRef}
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      onBlur={addLabel}
                      onKeyDown={e => { if (e.key === 'Enter') addLabel(); if (e.key === 'Escape') { e.stopPropagation(); setAddingLabel(false); setNewLabel('') } }}
                      placeholder="Label..."
                      className="text-xs bg-[var(--bg-surface)] border border-[var(--border-focus)] rounded-full px-2 py-1 text-primary outline-none w-24"
                    />
                  ) : (
                    <button
                      onClick={() => setAddingLabel(true)}
                      className="flex items-center gap-1 text-xs text-muted hover:text-secondary transition-colors py-1"
                    >
                      <Plus size={11} /> Add label
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-muted mb-2">Description</label>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 focus-within:border-[var(--border-focus)] transition-colors">
                  {editor && <EditorContent editor={editor} />}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <label className="block text-xs text-muted mb-2">Subtasks</label>
                <SubtaskList
                  parentId={task.id}
                  subtasks={subtasks}
                  onSubtasksChange={setSubtasks}
                  userId={userId}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
