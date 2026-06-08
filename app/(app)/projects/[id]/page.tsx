'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LayoutGrid, List, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import BoardView from '@/components/projects/BoardView'
import ListView from '@/components/projects/ListView'
import type { Project, Column, Task, Profile } from '@/types'

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [profileRes, memberRes, projectRes, columnsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single(),
        supabase.from('projects').select('*').eq('id', params.id).single(),
        supabase.from('columns').select('*').eq('project_id', params.id).order('position'),
        supabase.from('tasks').select('*').eq('project_id', params.id).eq('is_personal', false).is('parent_task_id', null).order('position'),
      ])

      if (profileRes.data) setUserProfile(profileRes.data as Profile)
      if (memberRes.data) setWorkspaceId(memberRes.data.workspace_id)
      if (!projectRes.data) { setNotFound(true); setLoading(false); return }
      setProject(projectRes.data as Project)
      setColumns((columnsRes.data ?? []) as Column[])
      setTasks((tasksRes.data ?? []) as Task[])
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-muted animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <main className="px-4 lg:px-7 py-6">
        <p className="text-secondary">Project not found.</p>
        <button onClick={() => router.push('/projects')} className="text-gold text-sm mt-2">← Back to projects</button>
      </main>
    )
  }

  return (
    <main className="px-4 lg:px-7 py-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/projects')} className="text-muted hover:text-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
          <ArrowLeft size={18} />
        </button>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: (project?.color ?? '#c9a84c') + '22' }}
        >
          {project?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl lg:text-2xl font-bold text-primary truncate">{project?.name}</h1>
          {project?.description && <p className="text-xs text-secondary truncate">{project.description}</p>}
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-hover rounded-lg p-1 gap-1 flex-shrink-0">
          <button
            onClick={() => setView('board')}
            className={cn('w-8 h-8 flex items-center justify-center rounded-md transition-colors', view === 'board' ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-secondary')}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('w-8 h-8 flex items-center justify-center rounded-md transition-colors', view === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-secondary')}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Board / List */}
      {view === 'board' ? (
        <BoardView
          columns={columns}
          initialTasks={tasks}
          userId={userId ?? ''}
          userProfile={userProfile}
          projectId={params.id}
          workspaceId={workspaceId}
        />
      ) : (
        <ListView
          initialTasks={tasks}
          columns={columns}
          userId={userId ?? ''}
          userProfile={userProfile}
        />
      )}
    </main>
  )
}
