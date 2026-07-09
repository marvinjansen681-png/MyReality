'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import ProjectCard from '@/components/projects/ProjectCard'
import EmptyState from '@/components/shared/EmptyState'
import type { Project, Workspace } from '@/types'

const COLORS = ['#c9a84c', '#4caf7d', '#5b8fe0', '#9b5be0', '#e05b5b', '#e07b5b']
const ICONS = ['📋', '🚀', '💡', '🎯', '🔧', '📊', '🌟', '💼', '🏗️', '🎨']

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])
  const [creating, setCreating] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', user.id)
        .single()

      if (member?.workspaces) setWorkspace(member.workspaces as unknown as Workspace)

      const workspaceId = member?.workspace_id
      if (!workspaceId) { setLoading(false); return }

      const { data } = await supabase
        .from('projects')
        .select('*, task_count:tasks(count)')
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })

      setProjects((data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        task_count: (p.task_count as { count: number }[])?.[0]?.count ?? 0,
      })) as Project[])
      setLoading(false)
    }
    load()
  }, [])

  async function onSubmit(data: FormData) {
    if (!workspace || !userId) return
    setCreating(true)
    const supabase = createClient()

    // Insert without requesting the row back (no .select()): PostgREST's
    // RETURNING evaluates the SELECT policy on the new row in the same
    // statement as the owner-membership AFTER INSERT trigger, and that races
    // — it can reject the insert outright with an RLS error even though the
    // insert itself is fully authorized. Pre-generating the id and fetching
    // it back in a separate follow-up query avoids the race entirely.
    const projectId = crypto.randomUUID()
    const { error } = await supabase.from('projects').insert({
      id: projectId,
      workspace_id: workspace.id,
      name: data.name,
      description: data.description || null,
      color: selectedColor,
      icon: selectedIcon,
      created_by: userId,
      status: 'active',
    })
    if (error) { setCreating(false); toast.error('Failed to create project'); return }

    const { data: created, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    setCreating(false)
    if (fetchError || !created) { toast.error('Project created, but could not load it. Please refresh.'); return }

    // Create default columns
    const sb = createClient()
    await sb.from('columns').insert([
      { project_id: projectId, title: 'Todo', color: '#5a5248', position: 0 },
      { project_id: projectId, title: 'In Progress', color: '#5b8fe0', position: 1 },
      { project_id: projectId, title: 'Review', color: '#c9a84c', position: 2 },
      { project_id: projectId, title: 'Done', color: '#4caf7d', position: 3 },
    ])

    // The owner-membership trigger should have already run — verify rather than assume.
    const { data: ownerMembership } = await sb
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (!ownerMembership) {
      toast.error('Project created, but owner access could not be confirmed. Please refresh.')
    }

    setProjects(prev => [{ ...(created as Project), task_count: 0 }, ...prev])
    reset()
    setSelectedColor(COLORS[0])
    setSelectedIcon(ICONS[0])
    setModalOpen(false)
    toast.success('Project created')
  }

  return (
    <>
      <main className="px-4 lg:px-7 py-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary">Projects</h1>
            <p className="text-secondary text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="text-muted animate-spin" /></div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create your first project to start organizing your team's work."
            action={
              <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors">
                New Project
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
          </div>
        )}
      </main>

      {/* Create project modal */}
      {modalOpen && (
          <React.Fragment key="new-project-modal">
            <motion.div key="backdrop" className="fixed inset-0 bg-black/60 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setModalOpen(false)} />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div
              key="modal-card"
              className="pointer-events-auto bg-card border border-[var(--border)] flex flex-col w-full rounded-t-2xl max-h-[90dvh] sm:rounded-xl sm:max-w-md sm:max-h-[85vh]"
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Drag handle mobile */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border)]" /></div>
              {/* Sticky header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
                <h2 className="font-display text-xl font-bold text-primary">New Project</h2>
              </div>
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs text-secondary mb-1.5">Project name *</label>
                    <input
                      {...register('name')}
                      placeholder="My awesome project"
                      className={`w-full bg-[var(--bg-surface)] border rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors ${errors.name ? 'border-red' : 'border-[var(--border)]'}`}
                    />
                    {errors.name && <p className="text-xs text-red mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-secondary mb-1.5">Description</label>
                    <textarea
                      {...register('description')}
                      rows={2}
                      placeholder="What is this project about?"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted resize-none focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                    />
                  </div>
                  {/* Color */}
                  <div>
                    <label className="block text-xs text-secondary mb-2">Color</label>
                    <div className="flex gap-2">
                      {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setSelectedColor(c)}
                          className={`w-7 h-7 rounded-full transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-offset-card ring-white scale-110' : ''}`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Icon */}
                  <div>
                    <label className="block text-xs text-secondary mb-2">Icon</label>
                    <div className="flex flex-wrap gap-2">
                      {ICONS.map(icon => (
                        <button key={icon} type="button" onClick={() => setSelectedIcon(icon)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-colors ${selectedIcon === icon ? 'bg-[var(--gold-muted)] ring-1 ring-gold' : 'hover:bg-hover'}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
              {/* Sticky footer */}
              <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-sm text-secondary hover:bg-hover transition-colors">Cancel</button>
                <button type="submit" form="project-form" disabled={creating} className="flex-1 py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  Create Project
                </button>
              </div>
            </motion.div>
            </div>
          </React.Fragment>
        )}
    </>
  )
}
