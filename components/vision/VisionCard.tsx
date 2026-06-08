'use client'

import { memo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import Confetti from 'react-confetti'
import { format, parseISO } from 'date-fns'
import { Calendar, MoreHorizontal, Trophy, Pencil, Trash2, PauseCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Vision } from '@/types'

const CATEGORY_STYLES: Record<string, string> = {
  Faith: 'bg-[var(--purple-muted)] text-purple',
  Business: 'bg-[var(--gold-muted)] text-gold',
  Finance: 'bg-[var(--green-muted)] text-green',
  Family: 'bg-[var(--red-muted)] text-red',
  Health: 'bg-[var(--blue-muted)] text-blue',
  Personal: 'bg-hover text-secondary',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-green',
  achieved: 'text-gold',
  paused: 'text-muted',
}

interface VisionCardProps {
  vision: Vision
  onEdit: (vision: Vision) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Vision['status']) => void
}

const VisionCard = memo(function VisionCard({ vision, onEdit, onDelete, onStatusChange }: VisionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [cardEl, setCardEl] = useState<HTMLElement | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: vision.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function markAchieved() {
    setMenuOpen(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('visions')
      .update({ status: 'achieved', updated_at: new Date().toISOString() })
      .eq('id', vision.id)

    if (error) {
      toast.error('Failed to update vision')
      return
    }
    setCelebrating(true)
    onStatusChange(vision.id, 'achieved')
    setTimeout(() => setCelebrating(false), 3500)
  }

  async function deleteVision() {
    setMenuOpen(false)
    const supabase = createClient()
    const { error } = await supabase.from('visions').delete().eq('id', vision.id)
    if (error) {
      toast.error('Failed to delete vision')
      return
    }
    onDelete(vision.id)
    toast.success('Vision deleted')
  }

  return (
    <motion.div
      ref={(el) => { setNodeRef(el); setCardEl(el) }}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative bg-card border border-[var(--border)] rounded-lg overflow-hidden',
        'hover:border-[var(--border-focus)] transition-colors group',
        vision.status === 'achieved' && 'border-[var(--gold-muted)]'
      )}
      {...attributes}
    >
      {/* Confetti on achieved */}
      {celebrating && cardEl && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <Confetti
            width={cardEl.offsetWidth}
            height={cardEl.offsetHeight}
            recycle={false}
            numberOfPieces={120}
            gravity={0.4}
            colors={['#c9a84c', '#e8c97a', '#f0ece0', '#4caf7d', '#9b5be0']}
          />
        </div>
      )}

      {/* Drag handle + Image */}
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        {vision.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vision.image_url}
            alt={vision.title}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-28 bg-hover flex items-center justify-center">
            <div className={cn(
              'text-3xl',
              vision.category === 'Faith' ? '🙏' : ''
            )}>
              {CATEGORY_EMOJI[vision.category]}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', CATEGORY_STYLES[vision.category])}>
              {vision.category}
            </span>
            {vision.status !== 'active' && (
              <span className={cn('text-[10px] font-medium capitalize', STATUS_STYLES[vision.status])}>
                {vision.status === 'achieved' ? '✓ Achieved' : 'Paused'}
              </span>
            )}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-hover transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-card border border-[var(--border)] rounded-md shadow-xl min-w-[160px] py-1">
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(vision) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  {vision.status !== 'achieved' && (
                    <button
                      onClick={markAchieved}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gold hover:bg-hover transition-colors"
                    >
                      <Trophy size={14} /> Mark as Achieved
                    </button>
                  )}
                  {vision.status === 'active' && (
                    <button
                      onClick={async () => {
                        setMenuOpen(false)
                        const sb = createClient()
                        await sb.from('visions').update({ status: 'paused' }).eq('id', vision.id)
                        onStatusChange(vision.id, 'paused')
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
                    >
                      <PauseCircle size={14} /> Pause
                    </button>
                  )}
                  <hr className="border-[var(--border)] my-1" />
                  <button
                    onClick={deleteVision}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red hover:bg-hover transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <h3 className="text-sm font-semibold text-primary leading-snug mb-1 line-clamp-2">
          {vision.title}
        </h3>

        {vision.description && (
          <p className="text-xs text-secondary line-clamp-2 mb-2">{vision.description}</p>
        )}

        {vision.target_date && (
          <div className="flex items-center gap-1 text-xs text-muted mt-2">
            <Calendar size={11} />
            <span>{format(parseISO(vision.target_date), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
})

const CATEGORY_EMOJI: Record<string, string> = {
  Faith: '🙏',
  Business: '💼',
  Finance: '💰',
  Family: '👨‍👩‍👧',
  Health: '💪',
  Personal: '⭐',
}

export default VisionCard
