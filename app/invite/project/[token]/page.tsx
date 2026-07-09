'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldAlert, Clock, Ban, Users as UsersIcon, CheckCircle2, Hourglass } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInviteByToken, redeemProjectInvite, type InviteStatus, type InvalidInviteReason } from '@/lib/invites/projectInvites'
import { LogoStacked } from '@/components/ui/Logo'

type PageState =
  | { kind: 'loading' }
  | { kind: 'invalid'; reason: InvalidInviteReason }
  | { kind: 'needs_auth' }
  | { kind: 'ready' }
  | { kind: 'already_member'; role: string | null }
  | { kind: 'pending' }
  | { kind: 'added'; role: string | null }
  | { kind: 'error'; message: string }

export default function ProjectInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [invite, setInvite] = useState<InviteStatus | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const status = await getInviteByToken(params.token)
    setInvite(status)

    if (status.status !== 'valid') {
      setState({ kind: 'invalid', reason: status.status })
      return
    }

    if (!user) {
      setState({ kind: 'needs_auth' })
      return
    }

    if (!status.projectId) {
      setState({ kind: 'invalid', reason: 'not_found' })
      return
    }

    // Read-only pre-checks so a returning visitor immediately sees their
    // real state, without needing to click anything.
    const [memberRes, requestRes] = await Promise.all([
      supabase.from('project_members').select('role').eq('project_id', status.projectId).eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      supabase.from('project_access_requests').select('status').eq('project_id', status.projectId).eq('user_id', user.id).maybeSingle(),
    ])

    if (memberRes.data) {
      setState({ kind: 'already_member', role: memberRes.data.role })
      return
    }
    if (requestRes.data?.status === 'pending') {
      setState({ kind: 'pending' })
      return
    }

    setState({ kind: 'ready' })
  }, [params.token])

  useEffect(() => { load() }, [load])

  async function handleRequestAccess() {
    setRedeeming(true)
    const result = await redeemProjectInvite(params.token)
    setRedeeming(false)

    if ('error' in result) {
      setState({ kind: 'error', message: result.error })
      return
    }

    if (result.result === 'invalid') {
      setState({ kind: 'invalid', reason: result.invalidReason ?? 'not_found' })
    } else if (result.result === 'already_member') {
      setState({ kind: 'already_member', role: result.role })
    } else if (result.result === 'added') {
      setState({ kind: 'added', role: result.role })
    } else {
      setState({ kind: 'pending' })
    }
  }

  const currentPath = `/invite/project/${params.token}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-8">
          <LogoStacked markSize={64} />
        </div>

        {state.kind === 'loading' && (
          <div className="flex justify-center py-10"><Loader2 size={24} className="text-muted animate-spin" /></div>
        )}

        {state.kind === 'invalid' && (
          <InviteMessage
            icon={state.reason === 'revoked' ? Ban : state.reason === 'expired' ? Clock : ShieldAlert}
            title={
              state.reason === 'revoked' ? 'This invite link has been revoked.' :
              state.reason === 'expired' ? 'This invite link has expired.' :
              state.reason === 'max_uses_reached' ? 'This invite link has reached its usage limit.' :
              'This invite link is invalid or has expired.'
            }
          >
            <Link href="/dashboard" className="text-gold text-sm hover:text-gold-light transition-colors">Go to dashboard</Link>
          </InviteMessage>
        )}

        {state.kind === 'needs_auth' && invite && (
          <InviteMessage
            icon={UsersIcon}
            title={`You've been invited to join ${invite.projectName ?? 'a project'}`}
            description={`Sign in or create an account to ${invite.approvalRequired ? 'request access' : 'join'}.`}
          >
            <div className="flex flex-col gap-2.5 mt-2">
              <Link
                href={`/login?redirectTo=${encodeURIComponent(currentPath)}`}
                className="w-full py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={`/signup?redirectTo=${encodeURIComponent(currentPath)}`}
                className="w-full py-2.5 rounded-md border border-[var(--border)] text-sm text-secondary hover:bg-hover transition-colors"
              >
                Create Account
              </Link>
            </div>
          </InviteMessage>
        )}

        {state.kind === 'ready' && invite && (
          <InviteMessage
            icon={UsersIcon}
            title={`You've been invited to join ${invite.projectName ?? 'a project'}`}
            description={
              invite.approvalRequired
                ? `Requesting ${invite.defaultRole ?? 'member'} access. A project owner or manager will need to approve you before you can enter.`
                : `You'll get ${invite.defaultRole ?? 'member'} access immediately.`
            }
          >
            <button
              onClick={handleRequestAccess}
              disabled={redeeming}
              className="w-full py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            >
              {redeeming && <Loader2 size={14} className="animate-spin" />}
              {invite.approvalRequired ? 'Request Access' : 'Join Project'}
            </button>
          </InviteMessage>
        )}

        {state.kind === 'pending' && (
          <InviteMessage icon={Hourglass} title="Your access request has been sent." description="A project owner or manager must approve it before you can enter." />
        )}

        {(state.kind === 'already_member' || state.kind === 'added') && invite?.projectId && (
          <InviteMessage
            icon={CheckCircle2}
            title={state.kind === 'added' ? 'You now have access to this project.' : 'You already have access to this project.'}
          >
            <button
              onClick={() => router.push(`/projects/${invite.projectId}`)}
              className="w-full py-2.5 rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors mt-2"
            >
              Open Project
            </button>
          </InviteMessage>
        )}

        {state.kind === 'error' && (
          <InviteMessage icon={ShieldAlert} title="Something went wrong." description={state.message} />
        )}
      </div>
    </div>
  )
}

function InviteMessage({
  icon: Icon, title, description, children,
}: {
  icon: React.ElementType
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="w-14 h-14 rounded-full bg-hover flex items-center justify-center mx-auto mb-4">
        <Icon size={24} className="text-gold" />
      </div>
      <h1 className="font-display text-lg font-bold text-primary mb-1.5">{title}</h1>
      {description && <p className="text-sm text-secondary mb-4">{description}</p>}
      {children}
    </div>
  )
}
