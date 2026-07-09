'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Copy, Check, Loader2, Link2, Users, Inbox, X as XIcon, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { createProjectInvite, revokeProjectInvite } from '@/lib/invites/projectInvites'
import ProjectAccessRequests from './ProjectAccessRequests'
import ProjectMembersPanel from './ProjectMembersPanel'
import type { ProjectInvite, ProjectInviteRole, ProjectRole, AuditEvent } from '@/types'

const ROLE_OPTIONS: { value: ProjectInviteRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'editor', label: 'Editor' },
  { value: 'commenter', label: 'Commenter' },
  { value: 'viewer', label: 'Viewer' },
]

const EXPIRY_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'Never' },
] as const
type ExpiryOption = (typeof EXPIRY_OPTIONS)[number]['value']

function expiryToDate(expiry: ExpiryOption): string | null {
  const now = Date.now()
  if (expiry === '24h') return new Date(now + 24 * 60 * 60 * 1000).toISOString()
  if (expiry === '7d') return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  if (expiry === '30d') return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

interface ProjectShareModalProps {
  projectId: string
  projectName: string
  currentUserId: string
  currentRole: ProjectRole | null
  onClose: () => void
}

type Tab = 'invite' | 'requests' | 'members'

export default function ProjectShareModal({ projectId, projectName, currentUserId, currentRole, onClose }: ProjectShareModalProps) {
  const [tab, setTab] = useState<Tab>('invite')
  const [invites, setInvites] = useState<ProjectInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([])

  const [defaultRole, setDefaultRole] = useState<ProjectInviteRole>('editor')
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [expiry, setExpiry] = useState<ExpiryOption>('7d')
  const [maxUses, setMaxUses] = useState('')
  const [creating, setCreating] = useState(false)
  const [justCreatedLink, setJustCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadInvites = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('project_invites')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setInvites((data ?? []) as ProjectInvite[])
    setLoadingInvites(false)
  }, [projectId])

  const loadPendingCount = useCallback(async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from('project_access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'pending')
    setPendingCount(count ?? 0)
  }, [projectId])

  const loadActivity = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('audit_events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(8)
    setRecentActivity((data ?? []) as AuditEvent[])
  }, [projectId])

  useEffect(() => {
    loadInvites()
    loadPendingCount()
    loadActivity()
  }, [loadInvites, loadPendingCount, loadActivity])

  async function handleCreateInvite() {
    setCreating(true)
    const result = await createProjectInvite({
      projectId,
      createdBy: currentUserId,
      defaultRole,
      approvalRequired,
      expiresAt: expiryToDate(expiry),
      maxUses: maxUses.trim() ? Math.max(1, parseInt(maxUses, 10)) : null,
    })
    setCreating(false)
    if (!result.ok) { toast.error('Failed to create invite', { description: result.error }); return }

    const link = `${window.location.origin}/invite/project/${result.token}`
    setJustCreatedLink(link)
    setMaxUses('')
    await loadInvites()
    await loadActivity()
    toast.success('Invite link created')
  }

  async function handleRevoke(inviteId: string) {
    const { error } = await revokeProjectInvite(inviteId)
    if (error) { toast.error('Failed to revoke invite', { description: error }); return }
    setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, revoked_at: new Date().toISOString() } : i))
    toast.success('Invite revoked')
    loadActivity()
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function inviteStatusLabel(invite: ProjectInvite): { label: string; tone: 'muted' | 'green' | 'red' } {
    if (invite.revoked_at) return { label: 'Revoked', tone: 'red' }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { label: 'Expired', tone: 'muted' }
    if (invite.max_uses !== null && invite.used_count >= invite.max_uses) return { label: 'Limit reached', tone: 'muted' }
    return { label: 'Active', tone: 'green' }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/60 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          className="pointer-events-auto bg-card border border-[var(--border)] flex flex-col w-full rounded-t-2xl max-h-[92dvh] sm:rounded-xl sm:max-w-lg sm:max-h-[85vh]"
          initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border)]" /></div>

          {/* Sticky header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            <div>
              <h2 className="font-display text-lg font-bold text-primary">Share “{projectName}”</h2>
              <p className="text-xs text-secondary mt-0.5">Invite people, review requests, manage members</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-hover rounded-md transition-colors">
              <XIcon size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-5 pt-3 flex-shrink-0">
            {([
              { key: 'invite', label: 'Invite Link', icon: Link2 },
              { key: 'requests', label: 'Requests', icon: Inbox, badge: pendingCount },
              { key: 'members', label: 'Members', icon: Users },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                  tab === t.key ? 'bg-hover text-primary' : 'text-muted hover:text-secondary'
                )}
              >
                <t.icon size={13} />
                {t.label}
                {'badge' in t && t.badge > 0 && (
                  <span className="bg-gold text-black text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {tab === 'invite' && (
              <div className="space-y-5">
                {justCreatedLink ? (
                  <div className="bg-[var(--gold-muted)] border border-gold/40 rounded-lg p-3.5 space-y-2.5">
                    <p className="text-xs text-secondary">
                      Copy this link now — it won&apos;t be shown again after you close this.
                    </p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={justCreatedLink} className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-primary truncate" />
                      <button
                        onClick={() => copyLink(justCreatedLink)}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gold text-black rounded-md hover:bg-gold-light transition-colors"
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                    <button onClick={() => setJustCreatedLink(null)} className="text-xs text-gold hover:text-gold-light transition-colors">
                      Create another link
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs text-secondary mb-1.5">Default role</label>
                      <select
                        value={defaultRole}
                        onChange={e => setDefaultRole(e.target.value as ProjectInviteRole)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                      >
                        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center justify-between bg-hover/50 border border-[var(--border)] rounded-lg px-3.5 py-3">
                      <div className="pr-3">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck size={13} className="text-gold" />
                          <p className="text-sm text-primary font-medium">Require approval</p>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {approvalRequired
                            ? 'People must be approved before they get access.'
                            : 'People get access immediately when they open the link.'}
                        </p>
                      </div>
                      <button
                        onClick={() => setApprovalRequired(v => !v)}
                        className={cn('relative flex-shrink-0 w-11 h-6 rounded-full transition-colors', approvalRequired ? 'bg-gold' : 'bg-[var(--border)]')}
                      >
                        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform', approvalRequired ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-secondary mb-1.5">Expires</label>
                        <select
                          value={expiry}
                          onChange={e => setExpiry(e.target.value as ExpiryOption)}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                        >
                          {EXPIRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-secondary mb-1.5">Max uses</label>
                        <input
                          type="number"
                          min={1}
                          value={maxUses}
                          onChange={e => setMaxUses(e.target.value)}
                          placeholder="Unlimited"
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCreateInvite}
                      disabled={creating}
                      className="w-full py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {creating && <Loader2 size={14} className="animate-spin" />}
                      Create invite link
                    </button>
                  </div>
                )}

                <div className="border-t border-[var(--border)] pt-4">
                  <p className="text-xs text-secondary mb-2.5">Existing links</p>
                  {loadingInvites ? (
                    <div className="flex justify-center py-6"><Loader2 size={16} className="text-muted animate-spin" /></div>
                  ) : invites.length === 0 ? (
                    <p className="text-xs text-muted">No invite links yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {invites.map(invite => {
                        const s = inviteStatusLabel(invite)
                        return (
                          <div key={invite.id} className="flex items-center gap-2 bg-hover/50 border border-[var(--border)] rounded-md px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-medium text-primary capitalize">{invite.default_role}</span>
                                <span className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full',
                                  s.tone === 'green' ? 'bg-green/10 text-green' : s.tone === 'red' ? 'bg-red/10 text-red' : 'bg-hover text-muted'
                                )}>{s.label}</span>
                                <span className="text-[10px] text-muted">{invite.approval_required ? 'approval required' : 'auto-approve'}</span>
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">
                                {invite.used_count}{invite.max_uses !== null ? ` / ${invite.max_uses}` : ''} uses
                                {invite.expires_at ? ` · expires ${format(new Date(invite.expires_at), 'MMM d, yyyy')}` : ' · never expires'}
                              </p>
                            </div>
                            {!invite.revoked_at && (
                              <button
                                onClick={() => handleRevoke(invite.id)}
                                className="flex-shrink-0 text-[11px] text-red hover:bg-red/10 px-2 py-1.5 rounded-md transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'requests' && (
              <ProjectAccessRequests
                projectId={projectId}
                currentUserId={currentUserId}
                onChange={() => { loadPendingCount(); loadActivity() }}
              />
            )}

            {tab === 'members' && (
              <ProjectMembersPanel projectId={projectId} currentUserId={currentUserId} currentRole={currentRole} />
            )}

            {recentActivity.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-xs text-secondary mb-2">Recent activity</p>
                <div className="space-y-1.5">
                  {recentActivity.map(ev => (
                    <p key={ev.id} className="text-[11px] text-muted">
                      <span className="text-secondary">{ev.entity_type}</span> {ev.action.toLowerCase()} · {format(new Date(ev.created_at), 'MMM d, HH:mm')}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
