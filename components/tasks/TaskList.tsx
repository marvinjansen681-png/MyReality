'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, SortAsc, CheckSquare, Trash2, Flag, Loader2, ListTodo } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import TaskItem from './TaskItem'
import TaskDrawer from './TaskDrawer'
import EmptyState from '@/components/shared/EmptyState'
import type { Task, TaskPriority } from '@/types'

type FilterTab = 'all' | 'active' | 'done' | 'urgent' | 'high'
type SortKey = 'priority' | 'due_date' | 'created_at'

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }

interface TaskListProps {
  initialTasks: Task[]
  userId: string
}

export default function TaskList({ initialTasks, userId }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [sort, setSort] = useState<SortKey>('priority')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchDisplay, setSearchDisplay] = useState('')

  function handleSearchChange(v: string) {
    setSearchDisplay(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(v), 300)
  }

  const filtered = useMemo(() => {
    let result = tasks

    // Filter
    switch (filter) {
      case 'active': result = result.filter(t => t.status !== 'done'); break
      case 'done': result = result.filter(t => t.status === 'done'); break
      case 'urgent': result = result.filter(t => t.priority === 'urgent'); break
      case 'high': result = result.filter(t => t.priority === 'high' || t.priority === 'urgent'); break
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.labels?.some(l => l.toLowerCase().includes(q))
      )
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sort === 'priority') return (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)
      if (sort === 'due_date') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      return b.created_at.localeCompare(a.created_at)
    })
  }, [tasks, filter, search, sort])

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter(t => t.status !== 'done').length,
    done: tasks.filter(t => t.status === 'done').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
  }), [tasks])

  async function createTask() {
    const title = newTitle.trim()
    if (!title) { setAdding(false); return }
    setCreating(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title, is_personal: true, created_by: userId, status: 'todo', priority: 'none', position: tasks.length })
      .select()
      .single()
    setCreating(false)
    if (error) { toast.error('Failed to create task'); return }
    setTasks(prev => [data as Task, ...prev])
    setNewTitle('')
    setAdding(false)
    toast.success('Task created')
  }

  async function toggleTask(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id)
    if (error) { toast.error('Failed to update task'); return }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkMarkDone() {
    const ids = Array.from(selected)
    const supabase = createClient()
    await supabase.from('tasks').update({ status: 'done', updated_at: new Date().toISOString() }).in('id', ids)
    setTasks(prev => prev.map(t => selected.has(t.id) ? { ...t, status: 'done' as const } : t))
    setSelected(new Set())
    toast.success(`${ids.length} task${ids.length > 1 ? 's' : ''} marked done`)
  }

  async function bulkSetPriority(priority: TaskPriority) {
    const ids = Array.from(selected)
    const supabase = createClient()
    await supabase.from('tasks').update({ priority, updated_at: new Date().toISOString() }).in('id', ids)
    setTasks(prev => prev.map(t => selected.has(t.id) ? { ...t, priority } : t))
    setSelected(new Set())
    toast.success(`Priority updated`)
  }

  async function bulkDelete() {
    const ids = Array.from(selected)
    const supabase = createClient()
    await supabase.from('tasks').delete().in('id', ids)
    setTasks(prev => prev.filter(t => !selected.has(t.id)))
    setSelected(new Set())
    toast.success(`${ids.length} task${ids.length > 1 ? 's' : ''} deleted`)
  }

  const handleUpdated = useCallback((updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    if (activeTask?.id === updated.id) setActiveTask(updated)
  }, [activeTask])

  const handleDeleted = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setActiveTask(null)
  }, [])

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'done', label: 'Done' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'high', label: 'High' },
  ]

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary">My Tasks</h1>
            <p className="text-secondary text-sm mt-0.5">{counts.active} active</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Quick-add */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createTask(); if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
                placeholder="Task title..."
                className="flex-1 bg-card border border-[var(--border-focus)] rounded-lg px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none"
              />
              <button
                onClick={createTask}
                disabled={creating}
                className="px-4 py-2 bg-gold text-black text-sm font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                Add
              </button>
              <button onClick={() => { setAdding(false); setNewTitle('') }} className="px-3 py-2 text-sm text-muted hover:text-secondary transition-colors">
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchDisplay}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-card border border-[var(--border)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />
          </div>
          <div className="relative">
            <SortAsc size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="bg-card border border-[var(--border)] rounded-lg pl-8 pr-3 py-2.5 text-sm text-secondary focus:outline-none focus:border-[var(--border-focus)] transition-colors appearance-none"
            >
              <option value="priority">Priority</option>
              <option value="due_date">Due Date</option>
              <option value="created_at">Created</option>
            </select>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]',
                filter === tab.key ? 'bg-gold text-black' : 'bg-hover text-secondary hover:text-primary'
              )}
            >
              {tab.label}
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', filter === tab.key ? 'bg-black/20' : 'bg-[var(--bg-surface)]')}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Task list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks here"
            description={search ? `No tasks match "${search}"` : 'Add your first task to get started.'}
            action={!search ? (
              <button onClick={() => setAdding(true)} className="px-4 py-2 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors">
                New Task
              </button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((task, i) => (
              <TaskItem
                key={task.id}
                task={task}
                selected={selected.has(task.id)}
                onSelect={toggleSelect}
                onToggle={toggleTask}
                onClick={setActiveTask}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-card border border-[var(--border)] rounded-full px-4 py-2.5 shadow-2xl safe-bottom"
          >
            <span className="text-xs text-secondary mr-1">{selected.size} selected</span>
            <button
              onClick={bulkMarkDone}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green/10 text-green rounded-full text-xs font-medium hover:bg-green/20 transition-colors min-h-[36px]"
            >
              <CheckSquare size={13} /> Done
            </button>
            <button
              onClick={() => bulkSetPriority('high')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold-muted)] text-gold rounded-full text-xs font-medium hover:bg-[var(--gold-muted)] transition-colors min-h-[36px]"
            >
              <Flag size={13} /> High
            </button>
            <button
              onClick={bulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--red-muted)] text-red rounded-full text-xs font-medium hover:bg-[var(--red-muted)] transition-colors min-h-[36px]"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-1 text-muted hover:text-secondary text-xs"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task drawer */}
      <TaskDrawer
        task={activeTask}
        userId={userId}
        onClose={() => setActiveTask(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </>
  )
}
