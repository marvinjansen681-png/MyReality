import type { ProjectRole } from '@/types'

export function canManageProject(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'manager'
}

export function canEditProjectContent(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'manager' || role === 'editor'
}

export function canCommentOnProject(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'manager' || role === 'editor' || role === 'commenter'
}

export function canViewAuditTrail(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'manager'
}

export function canDeleteTask(role: ProjectRole | null, isCreator: boolean): boolean {
  return isCreator || canManageProject(role)
}

// Archiving/restoring/hard-deleting the project itself is owner-only —
// managers can manage content but not the project's own lifecycle.
export function canArchiveProject(role: ProjectRole | null): boolean {
  return role === 'owner'
}

export function canRestoreProject(role: ProjectRole | null): boolean {
  return role === 'owner'
}
