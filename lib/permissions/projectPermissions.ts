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

// Invite/request/member management — owner and manager, matching
// can_manage_project() in the database.
export function canManageInvites(role: ProjectRole | null): boolean {
  return canManageProject(role)
}

export function canReviewAccessRequests(role: ProjectRole | null): boolean {
  return canManageProject(role)
}

// Task assignment / metadata edits — same set as general content editing
// (owner/manager/editor), matching the task_assignees and tasks RLS.
export function canAssignTask(role: ProjectRole | null): boolean {
  return canEditProjectContent(role)
}

export function canEditTaskMetadata(role: ProjectRole | null): boolean {
  return canEditProjectContent(role)
}

// Mentions ride along with commenting — anyone who can comment can @mention,
// a viewer (who can't comment at all) can't.
export function canMentionMembers(role: ProjectRole | null): boolean {
  return canCommentOnProject(role)
}

// A manager may add/change/remove other members, but never an owner's own
// membership row — only another owner can touch that. Mirrors the DB
// trigger (enforce_project_member_rules) so the UI doesn't offer actions
// the database will reject anyway.
export function canModifyMemberRow(actingRole: ProjectRole | null, targetRole: ProjectRole): boolean {
  if (!canManageProject(actingRole)) return false
  if (targetRole === 'owner' && actingRole !== 'owner') return false
  return true
}

// Goals — create/edit/complete are owner/manager/editor (matching
// can_edit_project_content and the DB's general UPDATE policy on
// project_goals); archiving is owner/manager only (matching the
// enforce_goal_rules DB trigger, which is the actual enforcement layer).
export function canCreateGoal(role: ProjectRole | null): boolean {
  return canEditProjectContent(role)
}

export function canEditGoal(role: ProjectRole | null): boolean {
  return canEditProjectContent(role)
}

export function canCompleteGoal(role: ProjectRole | null): boolean {
  return canEditProjectContent(role)
}

export function canArchiveGoal(role: ProjectRole | null): boolean {
  return canManageProject(role)
}

export function canCommentOnGoal(role: ProjectRole | null): boolean {
  return canCommentOnProject(role)
}

// Action steps are real project tasks — creating one requires the same
// level as any other content edit (owner/manager/editor), matching the
// create_goal_action_step RPC's own can_edit_project_content() check.
export function canCreateGoalActionStep(role: ProjectRole | null): boolean {
  return canEditProjectContent(role)
}

// Explaining a missed deadline is a form of commenting on project status —
// same tier as task/goal comments (owner/manager/editor/commenter), matching
// the deadline_explanations RLS INSERT policy.
export function canExplainMissedDeadline(role: ProjectRole | null): boolean {
  return canCommentOnProject(role)
}

// Converting a task into a goal is a structural content edit, same tier as
// creating/editing a goal — matching convert_task_to_goal's own
// can_edit_project_content() check.
export function canConvertTaskToGoal(role: ProjectRole | null): boolean {
  return canEditProjectContent(role)
}

// Project chat — sending is the same tier as commenting (owner/manager/
// editor/commenter); viewer can read but not send, matching the
// project_chat_messages RLS INSERT policy exactly.
export function canSendProjectChatMessage(role: ProjectRole | null): boolean {
  return canCommentOnProject(role)
}

// Deleting someone else's chat message (moderation) is owner/manager only,
// matching the enforce_chat_message_edit_rules DB trigger. A sender can
// always delete their own message regardless of role — that's not gated by
// this helper, just an id comparison in the UI/DB.
export function canDeleteAnyProjectChatMessage(role: ProjectRole | null): boolean {
  return canManageProject(role)
}
