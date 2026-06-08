'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(50),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
})

type WorkspaceValues = z.infer<typeof workspaceSchema>

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
}

export default function CreateWorkspaceModal() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceValues>({ resolver: zodResolver(workspaceSchema) })

  const nameValue = watch('name', '')

  useEffect(() => {
    // Auto-generate slug from name
    if (nameValue) {
      setValue('slug', toSlug(nameValue), { shouldValidate: false })
    }
  }, [nameValue, setValue])

  useEffect(() => {
    async function checkWorkspace() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership) {
        setShow(true)
      }
    }
    checkWorkspace()
  }, [])

  async function onSubmit(values: WorkspaceValues) {
    if (!userId) return
    const supabase = createClient()

    // Create workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name: values.name,
        slug: values.slug,
        owner_id: userId,
        plan: 'free',
      })
      .select()
      .single()

    if (wsError) {
      if (wsError.code === '23505') {
        toast.error('That slug is already taken', { description: 'Try a different workspace name.' })
      } else {
        toast.error('Failed to create workspace', { description: wsError.message })
      }
      return
    }

    // Add owner as member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberError) {
      toast.error('Failed to set up workspace membership', { description: memberError.message })
      return
    }

    toast.success(`Welcome to ${values.name}!`)
    setShow(false)
    router.refresh()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-card border border-[var(--border)] rounded-t-2xl sm:rounded-xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-md bg-[var(--gold-muted)] flex items-center justify-center">
            <Building2 size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-primary">Create your workspace</h2>
            <p className="text-secondary text-sm">This is where your team works together</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-secondary mb-1.5">Workspace Name</label>
            <input
              {...register('name')}
              type="text"
              placeholder="Marvin's Business"
              autoFocus
              className={cn(
                'w-full min-h-[44px] px-4 py-2.5 rounded-md bg-surface border text-primary placeholder:text-muted text-sm outline-none transition-colors',
                'focus:border-[var(--border-focus)]',
                errors.name ? 'border-red' : 'border-[var(--border)]'
              )}
            />
            {errors.name && <p className="text-red text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">
              Workspace URL
              <span className="text-muted ml-2 font-normal">myreality.app/</span>
            </label>
            <input
              {...register('slug')}
              type="text"
              placeholder="marvins-business"
              className={cn(
                'w-full min-h-[44px] px-4 py-2.5 rounded-md bg-surface border text-primary placeholder:text-muted text-sm outline-none transition-colors font-mono',
                'focus:border-[var(--border-focus)]',
                errors.slug ? 'border-red' : 'border-[var(--border)]'
              )}
            />
            {errors.slug && <p className="text-red text-xs mt-1">{errors.slug.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] mt-2 px-4 py-2.5 bg-gold text-[#0a0a0a] font-semibold rounded-md hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Create Workspace
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          You can always rename your workspace later in Settings
        </p>
      </div>
    </div>
  )
}
