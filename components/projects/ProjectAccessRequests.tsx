'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, Check, X, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { fetchProfilesByIds } from '@/lib/utils/profiles'
import EmptyState from '@/components/shared/EmptyState'
import type { ProjectAccessRequest, Profile } from '@/types'

type RequestWithProfile = ProjectAccessRequest & { profile: Profile | null }

interface ProjectAccessRequestsProps {
  projectId: string
  currentUserId: string
  onChange?: () => void
}

export default function ProjectAccessRequests({ projectId, currentUserId, onChange }: ProjectAccessRequestsProps) {
  const [requests, setRequests] = useState<RequestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('project_access_requests')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })

    const rows = (data ?? []) as ProjectAccessRequest[]
    const profileMap = await fetchProfilesByIds(supabase, rows.map(r => r.user_id))
    setRequests(rows.map(r => ({ ...r, profile: profileMap[r.user_id] ?? null })))
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function approve(requestId: string) {
    setBusyId(requestId)
    const supabase = createClient()
    // Single UPDATE — the DB trigger (handle_access_request_approval)
    // provisions project_members and increments the invite's used_count.
    const { error } = await supabase
      .from('project_access_requests')
      .update({ status: 'approved', reviewed_by: currentUserId, reviewed_at: new Date().toISOString() })
      .eq('id', requestId)
    setBusyId(null)
    if (error) { toast.error('Failed to approve request', { description: error.message }); return }
    setRequests(prev => prev.filter(r => r.id !== requestId))
    toast.success('Request approved')
    onChange?.()
  }

  async function reject(requestId: string) {
    setBusyId(requestId)
    const supabase = createClient()
    const { error } = await supabase
      .from('project_access_requests')
      .update({
        status: 'rejected',
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
        review_note: notes[requestId]?.trim() || null,
      })
      .eq('id', requestId)
    setBusyId(null)
    if (error) { toast.error('Failed to reject request', { description: error.message }); return }
    setRequests(prev => prev.filter(r => r.id !== requestId))
    toast.success('Request rejected')
    onChange?.()
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="text-muted animate-spin" /></div>
  }

  if (requests.length === 0) {
    return <EmptyState icon={Inbox} title="No pending requests" description="Access requests from invite links will show up here." />
  }

  return (
    <div className="space-y-3">
      {requests.map(req => {
        const name = req.profile?.full_name ?? req.profile?.email ?? 'Unknown user'
        const busy = busyId === req.id
        return (
          <div key={req.id} className="bg-hover/50 border border-[var(--border)] rounded-lg p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary truncate">{name}</p>
                {req.profile?.email && req.profile?.full_name && (
                  <p className="text-xs text-muted truncate">{req.profile.email}</p>
                )}
                <p className="text-xs text-muted mt-0.5">
                  Requested <span className="text-secondary">{req.requested_role}</span> access ·{' '}
                  {formatDistanceToNow(new Date(req.requested_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <input
              value={notes[req.id] ?? ''}
              onChange={e => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
              placeholder="Optional note (shown if you reject)"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />

            <div className="flex gap-2">
              <button
                onClick={() => approve(req.id)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-green/15 text-green text-xs font-semibold hover:bg-green/25 transition-colors disabled:opacity-40"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Approve
              </button>
              <button
                onClick={() => reject(req.id)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-red/10 text-red text-xs font-semibold hover:bg-red/20 transition-colors disabled:opacity-40"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
