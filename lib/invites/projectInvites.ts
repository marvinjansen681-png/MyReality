import { createClient } from '@/lib/supabase/client'
import type { ProjectInviteRole } from '@/types'

// Crypto-safe random token. Held only in memory client-side (React state)
// until the user copies it — never logged, never sent anywhere except as
// part of the invite URL the user shares themselves.
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// One-way hash — this is the only form of the token that ever reaches the
// database (project_invites.token_hash). The raw token cannot be recovered
// from it.
export async function hashInviteToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface CreateInviteParams {
  projectId: string
  createdBy: string
  defaultRole: ProjectInviteRole
  approvalRequired: boolean
  expiresAt: string | null
  maxUses: number | null
}

export type CreateInviteResult =
  | { ok: true; token: string; inviteId: string }
  | { ok: false; error: string }

// Relies entirely on the "Managers can create invites" RLS policy
// (can_manage_project(project_id) AND created_by = auth.uid()) for
// authorization — this function does not itself decide who is allowed to
// create an invite.
export async function createProjectInvite(params: CreateInviteParams): Promise<CreateInviteResult> {
  const token = generateInviteToken()
  const tokenHash = await hashInviteToken(token)
  const supabase = createClient()

  const { data, error } = await supabase
    .from('project_invites')
    .insert({
      project_id: params.projectId,
      created_by: params.createdBy,
      token_hash: tokenHash,
      default_role: params.defaultRole,
      approval_required: params.approvalRequired,
      expires_at: params.expiresAt,
      max_uses: params.maxUses,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to create invite' }
  return { ok: true, token, inviteId: data.id }
}

export async function revokeProjectInvite(inviteId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId)
  return { error: error?.message ?? null }
}

export type InviteValidityStatus = 'valid' | 'revoked' | 'expired' | 'max_uses_reached' | 'not_found'

export interface InviteStatus {
  inviteId: string | null
  projectId: string | null
  projectName: string | null
  projectIcon: string | null
  projectColor: string | null
  defaultRole: ProjectInviteRole | null
  approvalRequired: boolean | null
  status: InviteValidityStatus
}

interface GetInviteStatusRow {
  invite_id: string | null
  project_id: string | null
  project_name: string | null
  project_icon: string | null
  project_color: string | null
  default_role: ProjectInviteRole | null
  approval_required: boolean | null
  status: InviteValidityStatus
}

// Safe to call before the user is signed in — backed by a SECURITY DEFINER
// function that returns only non-sensitive preview fields, never token_hash.
export async function getInviteByToken(token: string): Promise<InviteStatus> {
  const tokenHash = await hashInviteToken(token)
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('get_invite_status', { token_hash_input: tokenHash })
    .single<GetInviteStatusRow>()

  if (error || !data) {
    return {
      inviteId: null, projectId: null, projectName: null, projectIcon: null,
      projectColor: null, defaultRole: null, approvalRequired: null, status: 'not_found',
    }
  }

  return {
    inviteId: data.invite_id,
    projectId: data.project_id,
    projectName: data.project_name,
    projectIcon: data.project_icon,
    projectColor: data.project_color,
    defaultRole: data.default_role,
    approvalRequired: data.approval_required,
    status: data.status,
  }
}

export type RedeemOutcome = 'already_member' | 'added' | 'pending_created' | 'pending_existing' | 'invalid'

export type InvalidInviteReason = Exclude<InviteValidityStatus, 'valid'>

export interface RedeemResult {
  result: RedeemOutcome
  invalidReason: InvalidInviteReason | null
  projectId: string | null
  projectName: string | null
  role: string | null
}

interface RedeemInviteRow {
  result: RedeemOutcome
  invalid_reason: InvalidInviteReason | null
  project_id: string | null
  project_name: string | null
  role: string | null
}

// Requires the caller to be signed in. This is the only path that ever
// creates a project_access_requests row from an invite, or (only when
// approval_required is false) grants project_members access directly —
// all of the actual authorization logic lives server-side in the RPC.
export async function redeemProjectInvite(token: string): Promise<RedeemResult | { error: string }> {
  const tokenHash = await hashInviteToken(token)
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('redeem_project_invite', { token_hash_input: tokenHash })
    .single<RedeemInviteRow>()

  if (error) return { error: error.message }
  if (!data) return { error: 'No response from server' }

  return {
    result: data.result,
    invalidReason: data.invalid_reason,
    projectId: data.project_id,
    projectName: data.project_name,
    role: data.role,
  }
}
