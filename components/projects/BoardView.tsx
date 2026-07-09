'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent, DragOverlay,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { canEditProjectContent } from '@/lib/permissions/projectPermissions'
import BoardColumn from './BoardColumn'
import TaskCard from './TaskCard'
import TaskDetail from './TaskDetail'
import type { Column, Task, Profile, ProjectRole } from '@/types'

interface BoardViewProps {
  columns: Column[]
  initialTasks: Task[]
  userId: string
  userProfile: Profile | null
  projectId: string
  profileMap?: Record<string, Profile>
  projectRole?: ProjectRole | null
}

export default function BoardView({ columns, initialTasks, userId, userProfile, projectId, profileMap, projectRole = null }: BoardViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragging, setDragging] = useState<Task | null>(null)
  const canEdit = canEditProjectContent(projectRole)

  useRealtime({
    projectId,
    currentUserId: userId,
    onInsert: (task) => {
      if (task.project_id === projectId) {
        setTasks(prev => prev.some(t => t.id === task.id) ? prev : [...prev, task])
      }
    },
    onUpdate: (task) => {
      if (task.project_id === projectId) {
        setTasks(prev => prev.map(t => t.id === task.id ? task : t))
      }
    },
    onDelete: (id) => {
      setTasks(prev => prev.filter(t => t.id !== id))
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  function getColumnTasks(columnId: string) {
    return tasks.filter(t => t.column_id === columnId).sort((a, b) => a.position - b.position)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDragging(null)
    if (!over || !canEdit) return

    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    const overId = String(over.id)
    // Over a column drop zone
    const targetColumnId: string = columns.find(c => c.id === overId)?.id
      ?? tasks.find(t => t.id === overId)?.column_id
      ?? draggedTask.column_id
      ?? ''
    if (!targetColumnId) return

    const sourceColumnId = draggedTask.column_id ?? ''

    if (targetColumnId === sourceColumnId) {
      // Reorder within same column
      const col = getColumnTasks(sourceColumnId)
      const oldIdx = col.findIndex(t => t.id === active.id)
      const newIdx = col.findIndex(t => t.id === over.id)
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
      const reordered = arrayMove(col, oldIdx, newIdx).map((t, i) => ({ ...t, position: i }))
      setTasks(prev => prev.map(t => reordered.find(r => r.id === t.id) ?? t))
      const supabase = createClient()
      for (const t of reordered) {
        await supabase.from('tasks').update({ position: t.position }).eq('id', t.id)
      }
    } else {
      // Move to different column
      const targetTasks = getColumnTasks(targetColumnId)
      const newPosition = targetTasks.length
      setTasks(prev => prev.map(t =>
        t.id === draggedTask.id
          ? { ...t, column_id: targetColumnId, position: newPosition, status: columnStatusMap(targetColumnId, columns) }
          : t
      ))
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ column_id: targetColumnId, position: newPosition, status: columnStatusMap(targetColumnId, columns), updated_at: new Date().toISOString() })
        .eq('id', draggedTask.id)
      if (error) toast.error('Failed to move task')
    }
  }

  async function addTask(columnId: string, title: string) {
    if (!canEdit) return
    const supabase = createClient()
    const colTasks = getColumnTasks(columnId)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        column_id: columnId,
        project_id: projectId,
        is_personal: false,
        created_by: userId,
        status: columnStatusMap(columnId, columns),
        priority: 'none',
        position: colTasks.length,
      })
      .select()
      .single()
    if (error) { toast.error('Failed to add task'); return }
    setTasks(prev => [...prev, data as Task])
  }

  async function moveTask(task: Task, columnId: string) {
    if (!canEdit) return
    const targetTasks = getColumnTasks(columnId)
    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, column_id: columnId, position: targetTasks.length, status: columnStatusMap(columnId, columns) }
        : t
    ))
    const supabase = createClient()
    await supabase.from('tasks').update({ column_id: columnId, position: targetTasks.length, status: columnStatusMap(columnId, columns) }).eq('id', task.id)
  }

  const handleUpdated = useCallback((updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setActiveTask(prev => prev?.id === updated.id ? updated : prev)
  }, [])

  const colMeta = columns.map(c => ({ id: c.id, title: c.title }))

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={e => setDragging(tasks.find(t => t.id === e.active.id) ?? null)}
        onDragEnd={handleDragEnd}
      >
        {/* Desktop: horizontal scroll board */}
        <div className="hidden lg:flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              allColumns={colMeta}
              onTaskClick={setActiveTask}
              onAddTask={addTask}
              onMoveTask={moveTask}
              profileMap={profileMap}
              canEdit={canEdit}
            />
          ))}
        </div>

        {/* Mobile: tab per column */}
        <MobileColumnTabs
          columns={columns}
          tasks={tasks}
          colMeta={colMeta}
          onTaskClick={setActiveTask}
          onAddTask={addTask}
          onMoveTask={moveTask}
          profileMap={profileMap}
          canEdit={canEdit}
        />

        <DragOverlay>
          {dragging && (
            <div className="bg-card border border-gold rounded-lg p-3 shadow-2xl opacity-90 w-[260px]">
              <p className="text-sm text-primary">{dragging.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

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

function columnStatusMap(columnId: string, columns: Column[]): Task['status'] {
  const col = columns.find(c => c.id === columnId)
  if (!col) return 'todo'
  const t = col.title.toLowerCase()
  if (t.includes('progress') || t.includes('doing')) return 'in_progress'
  if (t.includes('review')) return 'review'
  if (t.includes('done') || t.includes('complete')) return 'done'
  return 'todo'
}

function MobileColumnTabs({ columns, tasks, colMeta, onTaskClick, onAddTask, onMoveTask, profileMap, canEdit }: {
  columns: Column[]
  tasks: Task[]
  colMeta: { id: string; title: string }[]
  onTaskClick: (t: Task) => void
  onAddTask: (colId: string, title: string) => void
  onMoveTask: (t: Task, colId: string) => void
  profileMap?: Record<string, Profile>
  canEdit: boolean
}) {
  const [activeColIdx, setActiveColIdx] = useState(0)
  const activeCol = columns[activeColIdx]
  if (!activeCol) return null
  const colTasks = tasks.filter(t => t.column_id === activeCol.id).sort((a, b) => a.position - b.position)

  return (
    <div className="lg:hidden space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {columns.map((col, i) => (
          <button
            key={col.id}
            onClick={() => setActiveColIdx(i)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeColIdx === i ? 'bg-gold text-black' : 'bg-hover text-secondary'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
            {col.title}
            <span className={`text-[10px] px-1 rounded-full ${activeColIdx === i ? 'bg-black/20' : 'bg-[var(--bg-surface)]'}`}>
              {tasks.filter(t => t.column_id === col.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {colTasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onTaskClick}
            onMoveToColumn={onMoveTask}
            columns={colMeta}
            profileMap={profileMap}
            index={i}
          />
        ))}
        {canEdit && <MobileAddCard columnId={activeCol.id} onAdd={onAddTask} />}
      </div>
    </div>
  )
}

function MobileAddCard({ columnId, onAdd }: { columnId: string; onAdd: (id: string, t: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  return adding ? (
    <div className="flex gap-2">
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { onAdd(columnId, draft.trim()); setDraft(''); setAdding(false) } if (e.key === 'Escape') setAdding(false) }}
        placeholder="Task title..."
        className="flex-1 bg-card border border-[var(--border-focus)] rounded-lg px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none"
      />
      <button onClick={() => { onAdd(columnId, draft.trim()); setDraft(''); setAdding(false) }} className="px-3 py-2 bg-gold text-black text-sm font-semibold rounded-lg">Add</button>
    </div>
  ) : (
    <button onClick={() => setAdding(true)} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-muted hover:text-secondary hover:bg-hover rounded-lg transition-colors border border-dashed border-[var(--border)]">
      + Add card
    </button>
  )
}
