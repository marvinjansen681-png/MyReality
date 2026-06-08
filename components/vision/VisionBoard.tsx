'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Plus, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import VisionCard from './VisionCard'
import VisionModal from './VisionModal'
import EmptyState from '@/components/shared/EmptyState'
import type { Vision, VisionCategory } from '@/types'

const CATEGORIES: (VisionCategory | 'All')[] = ['All', 'Faith', 'Business', 'Finance', 'Family', 'Health', 'Personal']

interface VisionBoardProps {
  initialVisions: Vision[]
  userId: string
  workspaceId: string | null
}

export default function VisionBoard({ initialVisions, userId, workspaceId }: VisionBoardProps) {
  const [visions, setVisions] = useState(initialVisions)
  const [filter, setFilter] = useState<VisionCategory | 'All'>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Vision | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const filtered = filter === 'All' ? visions : visions.filter(v => v.category === filter)

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = visions.findIndex(v => v.id === active.id)
    const newIndex = visions.findIndex(v => v.id === over.id)
    const reordered = arrayMove(visions, oldIndex, newIndex)

    setVisions(reordered)

    // Persist positions
    const supabase = createClient()
    const updates = reordered.map((v, i) => ({ id: v.id, position: i }))
    for (const u of updates) {
      await supabase.from('visions').update({ position: u.position }).eq('id', u.id)
    }
  }, [visions])

  function handleSaved(vision: Vision) {
    setVisions(prev => {
      const idx = prev.findIndex(v => v.id === vision.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = vision
        return next
      }
      return [vision, ...prev]
    })
    toast.success(editing ? 'Vision updated' : 'Vision added')
    setEditing(null)
  }

  function handleEdit(vision: Vision) {
    setEditing(vision)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    setVisions(prev => prev.filter(v => v.id !== id))
  }

  function handleStatusChange(id: string, status: Vision['status']) {
    setVisions(prev => prev.map(v => v.id === id ? { ...v, status } : v))
  }

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary">Vision Board</h1>
            <p className="text-secondary text-sm mt-0.5">{visions.length} vision{visions.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Vision</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Category filter bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]',
                filter === cat
                  ? 'bg-gold text-black'
                  : 'bg-hover text-secondary hover:text-primary hover:bg-[var(--bg-hover)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={filter === 'All' ? 'No visions yet' : `No ${filter} visions`}
            description={filter === 'All' ? 'Add your first vision to start building your dream life.' : `Add a ${filter} vision to get started.`}
            action={
              <button
                onClick={openAdd}
                className="px-4 py-2 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors"
              >
                Add Vision
              </button>
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filtered.map(v => v.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(vision => (
                  <VisionCard
                    key={vision.id}
                    vision={vision}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <VisionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSaved={handleSaved}
        userId={userId}
        workspaceId={workspaceId}
        editing={editing}
      />
    </>
  )
}
