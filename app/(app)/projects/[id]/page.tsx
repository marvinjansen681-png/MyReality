'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LayoutGrid, List, ArrowLeft, Share2, History, User, Target, LayoutDashboard, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { canManageInvites, canViewAuditTrail } from '@/lib/permissions/projectPermissions'
import { fetchProfilesByIds } from '@/lib/utils/profiles'
import BoardView from '@/components/projects/BoardView'
import ListView from '@/components/projects/ListView'
import ProjectShareModal from '@/components/projects/ProjectShareModal'
import ProjectAuditTrail from '@/components/projects/ProjectAuditTrail'
import ProjectGoals from '@/components/projects/ProjectGoals'
import ProjectOverview from '@/components/projects/ProjectOverview'
import ProjectChat from '@/components/projects/ProjectChat'
import type { Project, Column, Task, Profile, ProjectRole, ProjectGoal, DeadlineExplanation } from '@/types'

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({})
  const [projectRole, setProjectRole] = useState<ProjectRole | null>(null)
  const [goals, setGoals] = useState<ProjectGoal[]>([])
  const [view, setView] = useState<'overview' | 'board' | 'list' | 'goals' | 'chat' | 'activity'>('overview')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [assigneesMap, setAssigneesMap] = useState<Record<string, string[]>>({})
  const [activeMemberIds, setActiveMemberIds] = useState<Set<string>>(new Set())
  const [deadlineExplanations, setDeadlineExplanations] = useState<DeadlineExplanation[]>([])
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [profileRes, memberRes, projectRes, columnsRes, tasksRes, roleRes, assigneesRes, goalsRes, activeMembersRes, deadlineExplanationsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single(),
        supabase.from('projects').select('*').eq('id', params.id).single(),
        supabase.from('columns').select('*').eq('project_id', params.id).order('position'),
        supabase.from('tasks').select('*').eq('project_id', params.id).eq('is_personal', false).is('parent_task_id', null).order('position'),
        supabase.from('project_members').select('role').eq('project_id', params.id).eq('user_id', user.id).eq('status', 'active').maybeSingle(),
        supabase.from('task_assignees').select('task_id, user_id').eq('project_id', params.id),
        supabase.from('project_goals').select('*').eq('project_id', params.id).order('sort_order').order('created_at'),
        supabase.from('project_members').select('user_id').eq('project_id', params.id).eq('status', 'active'),
        supabase.from('deadline_explanations').select('*').eq('project_id', params.id).order('created_at', { ascending: false }),
      ])

      if (roleRes.data) setProjectRole(roleRes.data.role as ProjectRole)
      if (profileRes.data) setUserProfile(profileRes.data as Profile)
      if (memberRes.data) {
        // Fetch all workspace member profiles for assignee avatars
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', memberRes.data.workspace_id)
        if (members) {
          const map = await fetchProfilesByIds(supabase, members.map(m => m.user_id))
          setProfileMap(map)
        }
      }
      if (!projectRes.data) { setNotFound(true); setLoading(false); return }
      setProject(projectRes.data as Project)
      setColumns((columnsRes.data ?? []) as Column[])
      setTasks((tasksRes.data ?? []) as Task[])
      setGoals((goalsRes.data ?? []) as ProjectGoal[])
      setActiveMemberIds(new Set(((activeMembersRes.data ?? []) as { user_id: string }[]).map(m => m.user_id)))
      setDeadlineExplanations((deadlineExplanationsRes.data ?? []) as DeadlineExplanation[])

      const map: Record<string, string[]> = {}
      for (const row of (assigneesRes.data ?? []) as { task_id: string; user_id: string }[]) {
        map[row.task_id] = [...(map[row.task_id] ?? []), row.user_id]
      }
      setAssigneesMap(map)

      setLoading(false)
    }
    load()
  }, [params.id])

  // Realtime: keep the assignees map in sync without requiring a refresh.
  // Separate channel from the task-focused useRealtime hook used inside
  // BoardView — doesn't touch that hook at all.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${params.id}:task_assignees`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_assignees', filter: `project_id=eq.${params.id}` },
        (payload) => {
          const row = payload.new as { task_id: string; user_id: string }
          setAssigneesMap(prev => {
            const existing = prev[row.task_id] ?? []
            if (existing.includes(row.user_id)) return prev
            return { ...prev, [row.task_id]: [...existing, row.user_id] }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'task_assignees', filter: `project_id=eq.${params.id}` },
        (payload) => {
          const row = payload.old as { task_id?: string; user_id?: string }
          if (!row.task_id || !row.user_id) return
          setAssigneesMap(prev => {
            if (!prev[row.task_id as string]) return prev
            return { ...prev, [row.task_id as string]: prev[row.task_id as string].filter(id => id !== row.user_id) }
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  // Realtime: keep the page-level tasks list (used by Overview and Goals,
  // which — unlike BoardView/ListView — don't have their own task-focused
  // realtime subscription) in sync with completions/moves/goal links made
  // from any tab. Separate channel name from useRealtime's own
  // `project:{id}:tasks` subscription used inside BoardView.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${params.id}:tasks:overview`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks', filter: `project_id=eq.${params.id}` },
        (payload) => {
          const task = payload.new as Task
          setTasks(prev => prev.some(t => t.id === task.id) ? prev : [...prev, task])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `project_id=eq.${params.id}` },
        (payload) => {
          const task = payload.new as Task
          setTasks(prev => prev.map(t => t.id === task.id ? task : t))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          const id = (payload.old as { id: string }).id
          setTasks(prev => prev.filter(t => t.id !== id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  // Realtime: keep the page-level goals list (used by Project Pulse) in sync
  // with goal edits/completions made from the Goals tab, which keeps its own
  // separate local copy and doesn't write back up to this state otherwise.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${params.id}:goals:overview`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_goals', filter: `project_id=eq.${params.id}` },
        (payload) => {
          const goal = payload.new as ProjectGoal
          setGoals(prev => prev.some(g => g.id === goal.id) ? prev : [...prev, goal])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'project_goals', filter: `project_id=eq.${params.id}` },
        (payload) => {
          const goal = payload.new as ProjectGoal
          setGoals(prev => prev.map(g => g.id === goal.id ? goal : g))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  // Realtime: deadline explanations appear on Project Pulse without a refresh.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${params.id}:deadline_explanations`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deadline_explanations', filter: `project_id=eq.${params.id}` },
        (payload) => {
          const row = payload.new as DeadlineExplanation
          setDeadlineExplanations(prev => prev.some(e => e.id === row.id) ? prev : [row, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-muted animate-spin" />
      </div>
    )
  }

  const goalTitleMap: Record<string, string> = Object.fromEntries(goals.map(g => [g.id, g.title]))

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
        {/* Share / Invite */}
        {canManageInvites(projectRole) && (
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors flex-shrink-0 min-h-[40px]"
          >
            <Share2 size={15} />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
        {/* My tasks toggle */}
        {(view === 'board' || view === 'list') && (
          <button
            onClick={() => setMyTasksOnly(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors flex-shrink-0 min-h-[40px]',
              myTasksOnly ? 'bg-gold text-black' : 'text-secondary hover:text-primary hover:bg-hover'
            )}
          >
            <User size={15} />
            <span className="hidden sm:inline">My tasks</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        <button
          onClick={() => setView('overview')}
          className={cn('flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors', view === 'overview' ? 'bg-hover text-primary font-medium' : 'text-muted hover:text-secondary')}
        >
          <LayoutDashboard size={14} /> Overview
        </button>
        <button
          onClick={() => setView('board')}
          className={cn('flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors', view === 'board' ? 'bg-hover text-primary font-medium' : 'text-muted hover:text-secondary')}
        >
          <LayoutGrid size={14} /> Board
        </button>
        <button
          onClick={() => setView('list')}
          className={cn('flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors', view === 'list' ? 'bg-hover text-primary font-medium' : 'text-muted hover:text-secondary')}
        >
          <List size={14} /> List
        </button>
        <button
          onClick={() => setView('goals')}
          className={cn('flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors', view === 'goals' ? 'bg-hover text-primary font-medium' : 'text-muted hover:text-secondary')}
        >
          <Target size={14} /> Goals
        </button>
        {projectRole !== null && (
          <button
            onClick={() => setView('chat')}
            className={cn('flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors', view === 'chat' ? 'bg-hover text-primary font-medium' : 'text-muted hover:text-secondary')}
          >
            <MessageSquare size={14} /> Chat
          </button>
        )}
        {canViewAuditTrail(projectRole) && (
          <button
            onClick={() => setView('activity')}
            className={cn('flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors', view === 'activity' ? 'bg-hover text-primary font-medium' : 'text-muted hover:text-secondary')}
          >
            <History size={14} /> Activity
          </button>
        )}
      </div>

      {/* Overview / Board / List / Goals / Activity */}
      {view === 'overview' && (
        <ProjectOverview
          projectId={params.id}
          tasks={tasks}
          goals={goals}
          assigneesMap={assigneesMap}
          profileMap={profileMap}
          userId={userId ?? ''}
          projectRole={projectRole}
          deadlineExplanations={deadlineExplanations}
          onExplanationAdded={row => setDeadlineExplanations(prev => prev.some(e => e.id === row.id) ? prev : [row, ...prev])}
        />
      )}
      {view === 'board' && (
        <BoardView
          columns={columns}
          initialTasks={tasks}
          userId={userId ?? ''}
          userProfile={userProfile}
          projectId={params.id}
          profileMap={profileMap}
          assigneesMap={assigneesMap}
          myTasksOnly={myTasksOnly}
          projectRole={projectRole}
          goalTitleMap={goalTitleMap}
        />
      )}
      {view === 'list' && (
        <ListView
          initialTasks={tasks}
          columns={columns}
          userId={userId ?? ''}
          userProfile={userProfile}
          profileMap={profileMap}
          assigneesMap={assigneesMap}
          myTasksOnly={myTasksOnly}
          projectRole={projectRole}
          goalTitleMap={goalTitleMap}
        />
      )}
      {view === 'goals' && userId && (
        <ProjectGoals
          projectId={params.id}
          userId={userId}
          userProfile={userProfile}
          projectRole={projectRole}
          tasks={tasks}
          columns={columns}
          profileMap={profileMap}
          assigneesMap={assigneesMap}
          activeMemberIds={activeMemberIds}
          onTaskUpdated={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
          onTaskCreated={created => setTasks(prev => prev.some(t => t.id === created.id) ? prev : [...prev, created])}
        />
      )}
      {view === 'chat' && userId && projectRole !== null && (
        <ProjectChat
          projectId={params.id}
          userId={userId}
          userProfile={userProfile}
          projectRole={projectRole}
          profileMap={profileMap}
          activeMemberIds={activeMemberIds}
        />
      )}
      {view === 'activity' && canViewAuditTrail(projectRole) && (
        <ProjectAuditTrail projectId={params.id} />
      )}

      {shareOpen && project && userId && (
        <ProjectShareModal
          projectId={project.id}
          projectName={project.name}
          currentUserId={userId}
          currentRole={projectRole}
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  )
}
