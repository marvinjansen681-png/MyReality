'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, MoreHorizontal, Shield, Crown, User, Eye, Loader2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { sendWorkspaceInvite } from '@/lib/email'
import { cn } from '@/lib/utils/cn'
import EmptyState from '@/components/shared/EmptyState'
import type { WorkspaceMember, Profile, UserRole, Workspace } from '@/types'

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  owner: <Crown size={13} className="text-gold" />,
  admin: <Shield size={13} className="text-blue" />,
  member: <User size={13} className="text-secondary" />,
  viewer: <Eye size={13} className="text-muted" />,
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const ROLES_ASSIGNABLE: UserRole[] = ['admin', 'member', 'viewer']

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['admin', 'member', 'viewer']),
})
type InviteForm = z.infer<typeof inviteSchema>

type MemberWithProfile = WorkspaceMember & { profile: Profile | null }

export default function TeamPage() {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole>('member')
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'member' },
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: memberRow } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(*)')
      .eq('user_id', user.id)
      .single()

    if (!memberRow) { setLoading(false); return }
    setCurrentRole(memberRow.role as UserRole)
    setWorkspace(memberRow.workspaces as unknown as Workspace)

    const { data: allMembers } = await supabase
      .from('workspace_members')
      .select('*, profile:profiles!workspace_members_user_id_fkey(id, full_name, email, avatar_url, created_at, updated_at)')
      .eq('workspace_id', memberRow.workspace_id)
      .order('joined_at', { ascending: true })

    setMembers((allMembers ?? []) as MemberWithProfile[])
    setLoading(false)
  }

  async function onInvite(data: InviteForm) {
    if (!workspace) return
    setInviting(true)

    // Check if email already a member
    const existing = members.find(m => m.profile?.email === data.email)
    if (existing) {
      toast.error('This person is already a member')
      setInviting(false)
      return
    }

    // Look up user by email
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', data.email)
      .single()

    if (!profile) {
      // User doesn't exist yet — send invite email only
      const currentProfile = members.find(m => m.user_id === currentUserId)?.profile
      await sendWorkspaceInvite({
        toEmail: data.email,
        toName: data.email.split('@')[0],
        fromName: currentProfile?.full_name ?? 'Someone',
        workspaceName: workspace.name,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'}/signup?workspace=${workspace.id}`,
      })
      toast.success(`Invite sent to ${data.email}`)
      setInviting(false)
      reset()
      setInviteOpen(false)
      return
    }

    // Add existing user
    const { error } = await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: profile.id,
      role: data.role,
    })

    setInviting(false)
    if (error) {
      toast.error('Failed to add member')
      return
    }

    toast.success(`${profile.full_name ?? data.email} added to workspace`)
    reset()
    setInviteOpen(false)
    await load()
  }

  async function changeRole(memberId: string, userId: string, newRole: UserRole) {
    const supabase = createClient()
    const { error } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId)
    if (error) { toast.error('Failed to update role'); return }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    setOpenMenuId(null)
    toast.success('Role updated')
  }

  async function removeMember(memberId: string, memberName: string) {
    const supabase = createClient()
    const { error } = await supabase.from('workspace_members').delete().eq('id', memberId)
    if (error) { toast.error('Failed to remove member'); return }
    setMembers(prev => prev.filter(m => m.id !== memberId))
    setOpenMenuId(null)
    toast.success(`${memberName} removed`)
  }

  const canManage = currentRole === 'owner' || currentRole === 'admin'

  return (
    <>
      <main className="px-4 lg:px-7 py-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary">Team</h1>
            <p className="text-secondary text-sm mt-0.5">
              {workspace?.name} · {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors min-h-[44px]"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Invite Member</span>
              <span className="sm:hidden">Invite</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="text-muted animate-spin" /></div>
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" description="Invite your team to get started." />
        ) : (
          <div className="space-y-2">
            {members.map(member => {
              const isMe = member.user_id === currentUserId
              const isOwner = member.role === 'owner'
              const name = member.profile?.full_name ?? member.profile?.email ?? 'Unknown'
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-card border border-[var(--border)] rounded-lg px-4 py-3"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[var(--gold-muted)] flex items-center justify-center text-gold text-sm font-bold flex-shrink-0 overflow-hidden">
                    {member.profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                    ) : initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-primary truncate">{name}</p>
                      {isMe && <span className="text-[10px] text-muted bg-hover px-1.5 py-0.5 rounded-full">You</span>}
                    </div>
                    <p className="text-xs text-muted truncate">{member.profile?.email ?? '—'}</p>
                  </div>

                  {/* Role badge */}
                  <div className="flex items-center gap-1.5 bg-hover px-2.5 py-1 rounded-full">
                    {ROLE_ICONS[member.role as UserRole]}
                    <span className="text-xs text-secondary">{ROLE_LABELS[member.role as UserRole]}</span>
                  </div>

                  {/* Actions menu */}
                  {canManage && !isMe && !isOwner && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                        className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-md transition-colors min-w-[44px] min-h-[44px]"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      <AnimatePresence>
                        {openMenuId === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-full mt-1 bg-card border border-[var(--border)] rounded-md shadow-xl z-20 min-w-[160px] py-1"
                            >
                              <p className="px-3 py-1.5 text-[10px] text-muted uppercase tracking-wider">Change role</p>
                              {ROLES_ASSIGNABLE.map(role => (
                                <button
                                  key={role}
                                  onClick={() => changeRole(member.id, member.user_id, role)}
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
                                Remove member
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      {/* Invite modal */}
      <AnimatePresence>
        {inviteOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setInviteOpen(false)} />
            <motion.div
              className="fixed z-50 bg-card border border-[var(--border)] bottom-0 left-0 right-0 rounded-t-2xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:w-full sm:max-w-md"
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border)]" /></div>
              <div className="p-5">
                <h2 className="font-display text-xl font-bold text-primary mb-1">Invite Member</h2>
                <p className="text-sm text-secondary mb-5">
                  If they don&apos;t have an account yet, they&apos;ll receive an email to sign up.
                </p>
                <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
                  <div>
                    <label className="block text-xs text-secondary mb-1.5">Email address *</label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="colleague@example.com"
                      className={cn(
                        'w-full bg-[var(--bg-surface)] border rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors',
                        errors.email ? 'border-red' : 'border-[var(--border)]'
                      )}
                    />
                    {errors.email && <p className="text-xs text-red mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-secondary mb-1.5">Role</label>
                    <select
                      {...register('role')}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                    >
                      {ROLES_ASSIGNABLE.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => { setInviteOpen(false); reset() }} className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-sm text-secondary hover:bg-hover transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={inviting} className="flex-1 py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                      {inviting && <Loader2 size={14} className="animate-spin" />}
                      Send Invite
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
