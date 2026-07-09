'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Crown, Shield, Pencil, MessageCircle, Eye, MoreHorizontal, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { canModifyMemberRow } from '@/lib/permissions/projectPermissions'
import EmptyState from '@/components/shared/EmptyState'
import type { ProjectMember, ProjectRole, Profile } from '@/types'

const ROLE_ICONS: Record<ProjectRole, React.ReactNode> = {
  owner: <Crown size={13} className="text-gold" />,
  manager: <Shield size={13} className="text-blue" />,
  editor: <Pencil size={13} className="text-secondary" />,
  commenter: <MessageCircle size={13} className="text-secondary" />,
  viewer: <Eye size={13} className="text-muted" />,
}

const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Owner', manager: 'Manager', editor: 'Editor', commenter: 'Commenter', viewer: 'Viewer',
}

const ASSIGNABLE_ROLES: ProjectRole[] = ['manager', 'editor', 'commenter', 'viewer']

type MemberWithProfile = ProjectMember & { profile: Profile | null }

interface ProjectMembersPanelProps {
  projectId: string
  currentUserId: string
  currentRole: ProjectRole | null
}

export default function ProjectMembersPanel({ projectId, currentUserId, currentRole }: ProjectMembersPanelProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('project_members')
      .select('*, profile:profiles!project_members_user_id_fkey(id, full_name, email, avatar_url, created_at, updated_at)')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('added_at', { ascending: true })
    setMembers((data ?? []) as unknown as MemberWithProfile[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function changeRole(memberId: string, newRole: ProjectRole) {
    setBusyId(memberId)
    const supabase = createClient()
    const { error } = await supabase.from('project_members').update({ role: newRole }).eq('id', memberId)
    setBusyId(null)
    setOpenMenuId(null)
    if (error) { toast.error('Failed to update role', { description: error.message }); return }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    toast.success('Role updated')
  }

  async function removeMember(memberId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this project?`)) return
    setBusyId(memberId)
    const supabase = createClient()
    const { error } = await supabase
      .from('project_members')
      .update({ status: 'removed' })
      .eq('id', memberId)
    setBusyId(null)
    setOpenMenuId(null)
    if (error) { toast.error('Failed to remove member', { description: error.message }); return }
    setMembers(prev => prev.filter(m => m.id !== memberId))
    toast.success(`${name} removed`)
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="text-muted animate-spin" /></div>
  }

  if (members.length === 0) {
    return <EmptyState icon={Users} title="No members yet" description="Invite people to this project to see them here." />
  }

  return (
    <div className="space-y-2">
      {members.map(member => {
        const isMe = member.user_id === currentUserId
        const name = member.profile?.full_name ?? member.profile?.email ?? 'Unknown'
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        const canModify = canModifyMemberRow(currentRole, member.role) && !isMe

        return (
          <div key={member.id} className="flex items-center gap-3 bg-hover/50 border border-[var(--border)] rounded-lg px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--gold-muted)] flex items-center justify-center text-gold text-xs font-bold flex-shrink-0 overflow-hidden">
              {member.profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
              ) : initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-primary truncate">{name}</p>
                {isMe && <span className="text-[10px] text-muted bg-hover px-1.5 py-0.5 rounded-full">You</span>}
              </div>
              <p className="text-xs text-muted truncate">{member.profile?.email ?? '—'}</p>
            </div>

            <div className="flex items-center gap-1.5 bg-hover px-2.5 py-1 rounded-full flex-shrink-0">
              {ROLE_ICONS[member.role]}
              <span className="text-xs text-secondary">{ROLE_LABELS[member.role]}</span>
            </div>

            {canModify && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                  disabled={busyId === member.id}
                  className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-md transition-colors min-w-[44px] min-h-[44px]"
                >
                  {busyId === member.id ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={16} />}
                </button>

                {openMenuId === member.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-0 top-full mt-1 bg-card border border-[var(--border)] rounded-md shadow-xl z-20 min-w-[160px] py-1">
                      <p className="px-3 py-1.5 text-[10px] text-muted uppercase tracking-wider">Change role</p>
                      {ASSIGNABLE_ROLES.map(role => (
                        <button
                          key={role}
                          onClick={() => changeRole(member.id, role)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover transition-colors',
                            member.role === role ? 'text-gold' : 'text-secondary hover:text-primary'
                          )}
                        >
                          {ROLE_ICONS[role]}
                          {ROLE_LABELS[role]}
                          {member.role === role && <span className="ml-auto text-[10px]">✓</span>}
                        </button>
                      ))}
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button
                        onClick={() => removeMember(member.id, name)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red hover:bg-hover transition-colors"
                      >
                        Remove from project
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
