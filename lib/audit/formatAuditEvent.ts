import type { AuditEvent, TaskStatus, TaskPriority, ProjectRole } from '@/types'

export type AuditCategory = 'project' | 'tasks' | 'members' | 'invites' | 'requests' | 'other'

export interface FormattedAuditEvent {
  title: string
  detail: string | null
  category: AuditCategory
}

export type NameResolver = (userId: string | null | undefined) => string

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'None', low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Owner', manager: 'Manager', editor: 'Editor', commenter: 'Commenter', viewer: 'Viewer',
}

// Collects every user id an audit event might reference — the actor, and
// (for tables where the row itself is "about" a different person) that
// person too — so the caller can resolve all of them in one profile fetch.
export function collectAuditEventUserIds(event: AuditEvent): string[] {
  const ids: (string | null | undefined)[] = [event.actor_id]
  const newData = event.new_data as Record<string, unknown> | null
  const oldData = event.old_data as Record<string, unknown> | null
  if (event.entity_type === 'project_members' || event.entity_type === 'project_access_requests') {
    ids.push(readString(newData, 'user_id'), readString(oldData, 'user_id'))
  }
  return ids.filter((id): id is string => !!id)
}

function readString(data: Record<string, unknown> | null, key: string): string | null {
  const value = data?.[key]
  return typeof value === 'string' ? value : null
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

export function formatAuditEvent(event: AuditEvent, getName: NameResolver): FormattedAuditEvent {
  const actor = getName(event.actor_id)
  const newData = event.new_data as Record<string, unknown> | null
  const oldData = event.old_data as Record<string, unknown> | null

  switch (event.entity_type) {
    case 'projects':
      return formatProjectEvent(event, actor, oldData, newData)
    case 'tasks':
      return formatTaskEvent(event, actor, oldData, newData)
    case 'task_comments':
      return formatTaskCommentEvent(event, actor, newData)
    case 'project_members':
      return formatProjectMemberEvent(event, actor, getName, oldData, newData)
    case 'project_invites':
      return formatProjectInviteEvent(event, actor, oldData, newData)
    case 'project_access_requests':
      return formatAccessRequestEvent(event, actor, getName, oldData, newData)
    default:
      return { title: `${actor} performed ${event.action.toLowerCase()} on ${event.entity_type}`, detail: null, category: 'other' }
  }
}

function formatProjectEvent(
  event: AuditEvent, actor: string, oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null
): FormattedAuditEvent {
  const name = readString(newData, 'name') ?? readString(oldData, 'name') ?? 'this project'

  if (event.action === 'INSERT') return { title: `${actor} created project "${name}"`, detail: null, category: 'project' }
  if (event.action === 'ARCHIVE') return { title: `${actor} archived the project`, detail: null, category: 'project' }
  if (event.action === 'RESTORE') return { title: `${actor} restored the project`, detail: null, category: 'project' }
  if (event.action === 'DELETE') return { title: `${actor} deleted project "${name}"`, detail: null, category: 'project' }

  const changes: string[] = []
  if (oldData && newData) {
    for (const field of ['name', 'description', 'color', 'icon'] as const) {
      const oldVal = readString(oldData, field)
      const newVal = readString(newData, field)
      if (oldVal !== newVal && newVal !== null) changes.push(`${field}: "${oldVal ?? '—'}" → "${newVal}"`)
    }
  }
  return { title: `${actor} updated the project`, detail: changes.length ? changes.join(', ') : null, category: 'project' }
}

function formatTaskEvent(
  event: AuditEvent, actor: string, oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null
): FormattedAuditEvent {
  const title = readString(newData, 'title') ?? readString(oldData, 'title') ?? 'a task'

  if (event.action === 'INSERT') return { title: `${actor} created task "${title}"`, detail: null, category: 'tasks' }
  if (event.action === 'DELETE') return { title: `${actor} deleted task "${title}"`, detail: null, category: 'tasks' }

  if (event.action === 'UPDATE' && oldData && newData) {
    const oldStatus = readString(oldData, 'status') as TaskStatus | null
    const newStatus = readString(newData, 'status') as TaskStatus | null
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return { title: `${actor} moved "${title}" from ${STATUS_LABELS[oldStatus]} to ${STATUS_LABELS[newStatus]}`, detail: null, category: 'tasks' }
    }

    const oldPriority = readString(oldData, 'priority') as TaskPriority | null
    const newPriority = readString(newData, 'priority') as TaskPriority | null
    if (oldPriority && newPriority && oldPriority !== newPriority) {
      return { title: `${actor} changed priority of "${title}" from ${PRIORITY_LABELS[oldPriority]} to ${PRIORITY_LABELS[newPriority]}`, detail: null, category: 'tasks' }
    }

    const oldTitle = readString(oldData, 'title')
    const newTitle = readString(newData, 'title')
    if (oldTitle && newTitle && oldTitle !== newTitle) {
      return { title: `${actor} renamed task "${oldTitle}" to "${newTitle}"`, detail: null, category: 'tasks' }
    }

    const oldDue = readString(oldData, 'due_date')
    const newDue = readString(newData, 'due_date')
    if (oldDue !== newDue) {
      return { title: `${actor} changed the due date of "${title}"`, detail: `${oldDue ?? 'none'} → ${newDue ?? 'none'}`, category: 'tasks' }
    }

    const oldColumn = readString(oldData, 'column_id')
    const newColumn = readString(newData, 'column_id')
    if (oldColumn !== newColumn) {
      return { title: `${actor} moved "${title}" to a different column`, detail: null, category: 'tasks' }
    }

    if (readString(newData, 'archived_at') || readString(newData, 'deleted_at')) {
      return { title: `${actor} archived task "${title}"`, detail: null, category: 'tasks' }
    }
  }

  return { title: `${actor} updated task "${title}"`, detail: null, category: 'tasks' }
}

function formatTaskCommentEvent(event: AuditEvent, actor: string, newData: Record<string, unknown> | null): FormattedAuditEvent {
  const content = readString(newData, 'content')
  if (event.action === 'INSERT') {
    return { title: `${actor} commented`, detail: content ? `"${truncate(content, 80)}"` : null, category: 'tasks' }
  }
  if (event.action === 'DELETE') return { title: `${actor} deleted a comment`, detail: null, category: 'tasks' }
  return { title: `${actor} edited a comment`, detail: null, category: 'tasks' }
}

function formatProjectMemberEvent(
  event: AuditEvent, actor: string, getName: NameResolver,
  oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null
): FormattedAuditEvent {
  const targetId = readString(newData, 'user_id') ?? readString(oldData, 'user_id')
  const target = getName(targetId)
  const newRole = readString(newData, 'role') as ProjectRole | null
  const oldRole = readString(oldData, 'role') as ProjectRole | null
  const newStatus = readString(newData, 'status')
  const oldStatus = readString(oldData, 'status')

  if (event.action === 'INSERT') {
    return { title: `${actor} added ${target} as ${newRole ? ROLE_LABELS[newRole] : 'a member'}`, detail: null, category: 'members' }
  }
  if (event.action === 'DELETE') {
    return { title: `${actor} removed ${target} from the project`, detail: null, category: 'members' }
  }
  if (event.action === 'UPDATE') {
    if (newStatus === 'removed' && oldStatus !== 'removed') {
      return { title: `${actor} removed ${target} from the project`, detail: null, category: 'members' }
    }
    if (oldRole && newRole && oldRole !== newRole) {
      return { title: `${actor} changed ${target}'s role from ${ROLE_LABELS[oldRole]} to ${ROLE_LABELS[newRole]}`, detail: null, category: 'members' }
    }
    if (newStatus === 'active' && oldStatus === 'removed') {
      return { title: `${actor} restored ${target}'s membership`, detail: null, category: 'members' }
    }
  }
  return { title: `${actor} updated ${target}'s membership`, detail: null, category: 'members' }
}

function formatProjectInviteEvent(
  event: AuditEvent, actor: string, oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null
): FormattedAuditEvent {
  const role = readString(newData, 'default_role') as ProjectRole | null
  if (event.action === 'INSERT') {
    const approvalRequired = newData?.approval_required
    return {
      title: `${actor} created an invite link (${role ? ROLE_LABELS[role] : 'member'})`,
      detail: approvalRequired === false ? 'No approval required' : 'Approval required',
      category: 'invites',
    }
  }
  if (event.action === 'UPDATE') {
    const revokedNew = readString(newData, 'revoked_at')
    const revokedOld = readString(oldData, 'revoked_at')
    if (revokedNew && !revokedOld) {
      return { title: `${actor} revoked an invite link`, detail: null, category: 'invites' }
    }
    return { title: `${actor} updated an invite link`, detail: null, category: 'invites' }
  }
  return { title: `${actor} deleted an invite link`, detail: null, category: 'invites' }
}

function formatAccessRequestEvent(
  event: AuditEvent, actor: string, getName: NameResolver,
  oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null
): FormattedAuditEvent {
  const targetId = readString(newData, 'user_id') ?? readString(oldData, 'user_id')
  const target = getName(targetId)
  const status = readString(newData, 'status')
  const oldStatus = readString(oldData, 'status')

  if (event.action === 'INSERT') {
    return { title: `${target} requested access to the project`, detail: null, category: 'requests' }
  }
  if (event.action === 'UPDATE' && status !== oldStatus) {
    if (status === 'approved') return { title: `${actor} approved ${target}'s access request`, detail: null, category: 'requests' }
    if (status === 'rejected') {
      const note = readString(newData, 'review_note')
      return { title: `${actor} rejected ${target}'s access request`, detail: note ? `Note: "${note}"` : null, category: 'requests' }
    }
    if (status === 'cancelled') return { title: `${target} cancelled their access request`, detail: null, category: 'requests' }
  }
  return { title: `${actor} updated ${target}'s access request`, detail: null, category: 'requests' }
}
