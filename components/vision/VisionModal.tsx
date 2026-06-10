'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Vision, VisionCategory, VisionStatus } from '@/types'

const CATEGORIES: VisionCategory[] = ['Faith', 'Business', 'Finance', 'Family', 'Health', 'Personal']

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  category: z.enum(['Faith', 'Business', 'Finance', 'Family', 'Health', 'Personal']),
  target_date: z.string().optional(),
  status: z.enum(['active', 'achieved', 'paused']),
})

type FormData = z.infer<typeof schema>

interface VisionModalProps {
  open: boolean
  onClose: () => void
  onSaved: (vision: Vision) => void
  userId: string
  workspaceId: string | null
  editing?: Vision | null
  nextPosition: number
}

export default function VisionModal({
  open, onClose, onSaved, userId, workspaceId, editing, nextPosition
}: VisionModalProps) {
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null)
  const [draggingOver, setDraggingOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: editing?.title ?? '',
      description: editing?.description ?? '',
      category: editing?.category ?? 'Personal',
      target_date: editing?.target_date ?? '',
      status: editing?.status ?? 'active',
    }
  })

  async function uploadImage(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('visions').upload(path, file, { upsert: false })
    if (error) {
      toast.error('Failed to upload image')
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('visions').getPublicUrl(path)
    setImageUrl(data.publicUrl)
    setUploading(false)
  }

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDraggingOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadImage(file)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormData) {
    setSaving(true)
    const supabase = createClient()

    if (editing) {
      const { data: updated, error } = await supabase
        .from('visions')
        .update({
          title: data.title,
          description: data.description || null,
          category: data.category,
          target_date: data.target_date || null,
          status: data.status,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id)
        .select()
        .single()

      if (error) {
        toast.error('Failed to update vision')
        setSaving(false)
        return
      }
      onSaved(updated as Vision)
    } else {
      const { data: created, error } = await supabase
        .from('visions')
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          title: data.title,
          description: data.description || null,
          category: data.category,
          target_date: data.target_date || null,
          status: data.status,
          image_url: imageUrl,
          position: nextPosition,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to create vision')
        setSaving(false)
        return
      }
      onSaved(created as Vision)
    }

    setSaving(false)
    reset()
    setImageUrl(null)
    onClose()
  }

  function handleClose() {
    if (!saving) {
      reset()
      setImageUrl(null)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Sheet / Dialog */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div
              className={cn(
                'pointer-events-auto bg-card border border-[var(--border)] flex flex-col w-full',
                // Mobile: bottom sheet
                'rounded-t-2xl max-h-[92dvh]',
                // Desktop: centered dialog
                'sm:rounded-xl sm:max-w-lg sm:max-h-[85vh]'
              )}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>

            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="font-display text-xl font-bold text-primary">
                {editing ? 'Edit Vision' : 'Add Vision'}
              </h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-secondary hover:text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <form id="vision-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Title *</label>
                  <input
                    {...register('title')}
                    placeholder="What do you want to achieve?"
                    className={cn(
                      'w-full bg-[var(--bg-surface)] border rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted',
                      'focus:outline-none focus:border-[var(--border-focus)] transition-colors',
                      errors.title ? 'border-red' : 'border-[var(--border)]'
                    )}
                  />
                  {errors.title && <p className="text-xs text-red mt-1">{errors.title.message}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Category *</label>
                  <select
                    {...register('category')}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Description</label>
                  <textarea
                    {...register('description')}
                    placeholder="Describe your vision..."
                    rows={2}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted resize-none focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                {/* Target date + Status row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-secondary mb-1.5">Target Date</label>
                    <input
                      type="date"
                      {...register('target_date')}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary mb-1.5">Status</label>
                    <select
                      {...register('status')}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="achieved">Achieved</option>
                    </select>
                  </div>
                </div>

                {/* Image upload */}
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Vision Image</label>
                  {imageUrl ? (
                    <div className="relative rounded-md overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Vision" className="w-full h-36 object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={e => { e.preventDefault(); setDraggingOver(true) }}
                      onDragLeave={() => setDraggingOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className={cn(
                        'border-2 border-dashed rounded-md p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors',
                        draggingOver ? 'border-gold bg-[var(--gold-muted)]' : 'border-[var(--border)] hover:border-[var(--border-focus)]'
                      )}
                    >
                      {uploading ? (
                        <Loader2 size={22} className="text-muted animate-spin" />
                      ) : (
                        <>
                          <div className="flex gap-2 text-muted">
                            <Upload size={18} />
                            <ImageIcon size={18} />
                          </div>
                          <p className="text-xs text-secondary text-center">
                            Drop an image here or tap to browse
                          </p>
                          <p className="text-xs text-muted">JPG, PNG, WebP — max 5MB</p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                </div>
              </form>
            </div>

            {/* Sticky footer — always visible */}
            <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-sm text-secondary hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="vision-form"
                disabled={saving || uploading}
                className="flex-1 py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Save Changes' : 'Add Vision'}
              </button>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
