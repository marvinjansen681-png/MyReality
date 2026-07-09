export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'
export type WorkspacePlan = 'free' | 'pro' | 'team'
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type VisionCategory = 'Faith' | 'Business' | 'Finance' | 'Family' | 'Health' | 'Personal'
export type VisionStatus = 'active' | 'achieved' | 'paused'
export type NotificationType = 'task_assigned' | 'task_commented' | 'task_due' | 'mention' | 'vision_due' | 'access_request_approved' | 'access_request_rejected'
export type ActivityAction = 'created' | 'updated' | 'commented' | 'assigned' | 'moved' | 'completed' | 'reopened'
export type ProjectRole = 'owner' | 'manager' | 'editor' | 'commenter' | 'viewer'
export type ProjectMemberStatus = 'active' | 'removed' | 'pending'
export type ProjectInviteRole = 'manager' | 'editor' | 'commenter' | 'viewer'
export type ProjectAccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  logo_url: string | null
  plan: WorkspacePlan
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: Profile
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string
  icon: string
  status: ProjectStatus
  created_by: string
  archived_at: string | null
  archived_by: string | null
  archive_reason: string | null
  created_at: string
  updated_at: string
  columns?: Column[]
  member_count?: number
  task_count?: number
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectRole
  status: ProjectMemberStatus
  added_by: string | null
  added_at: string
  removed_by: string | null
  removed_at: string | null
  profile?: Profile
}

export interface ProjectInvite {
  id: string
  project_id: string
  created_by: string
  token_hash: string
  default_role: ProjectInviteRole
  approval_required: boolean
  max_uses: number | null
  used_count: number
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface ProjectAccessRequest {
  id: string
  project_id: string
  invite_id: string | null
  user_id: string
  requested_role: ProjectInviteRole
  status: ProjectAccessRequestStatus
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  profile?: Profile
}

export interface TaskAssignee {
  id: string
  task_id: string
  project_id: string
  user_id: string
  assigned_by: string | null
  assigned_at: string
  profile?: Profile
}

export interface AuditEvent {
  id: string
  workspace_id: string | null
  project_id: string | null
  actor_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Column {
  id: string
  project_id: string
  title: string
  color: string
  position: number
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  project_id: string | null
  column_id: string | null
  title: string
  description: Record<string, unknown> | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  position: number
  created_by: string
  assigned_to: string[]
  labels: string[]
  estimated_hours: number | null
  actual_hours: number | null
  parent_task_id: string | null
  is_personal: boolean
  deleted_at: string | null
  deleted_by: string | null
  delete_reason: string | null
  version: number
  updated_by: string | null
  created_at: string
  updated_at: string
  subtasks?: Task[]
  comments?: TaskComment[]
  assignees?: Profile[]
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: ActivityAction
  metadata: Record<string, unknown>
  created_at: string
  profile?: Profile
}

export interface WeeklyPlan {
  id: string
  user_id: string
  workspace_id: string | null
  week_start: string
  day_index: number
  items: PlanItem[]
  created_at: string
  updated_at: string
}

export interface PlanItem {
  id: string
  text: string
  done: boolean
  time: string | null
  color: string | null
}

export interface Vision {
  id: string
  user_id: string
  workspace_id: string | null
  title: string
  description: string | null
  category: VisionCategory
  image_url: string | null
  target_date: string | null
  status: VisionStatus
  position: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: string
}
