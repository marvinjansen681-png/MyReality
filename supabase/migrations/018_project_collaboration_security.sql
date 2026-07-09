-- ============================================================================
-- STEP 21A — Project Collaboration Security Foundation
-- Database-first foundation for multi-user project collaboration:
-- project-level roles, approval-based invites, audit trail, soft delete.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- A) project_members
-- ----------------------------------------------------------------------------
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','manager','editor','commenter','viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed','pending')),
  added_by uuid REFERENCES auth.users(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_by uuid REFERENCES auth.users(id),
  removed_at timestamptz,
  UNIQUE(project_id, user_id)
);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- B) project_invites
-- ----------------------------------------------------------------------------
CREATE TABLE project_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  token_hash text NOT NULL UNIQUE,
  default_role text NOT NULL DEFAULT 'editor' CHECK (default_role IN ('manager','editor','commenter','viewer')),
  approval_required boolean NOT NULL DEFAULT true,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_invites_project ON project_invites(project_id);
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- C) project_access_requests
-- ----------------------------------------------------------------------------
CREATE TABLE project_access_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES project_invites(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL DEFAULT 'editor' CHECK (requested_role IN ('manager','editor','commenter','viewer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  UNIQUE(project_id, user_id)
);
CREATE INDEX idx_project_access_requests_project ON project_access_requests(project_id);
ALTER TABLE project_access_requests ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- D) audit_events
-- ----------------------------------------------------------------------------
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_project ON audit_events(project_id);
CREATE INDEX idx_audit_events_workspace ON audit_events(workspace_id);
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- E) Soft-delete fields on tasks
-- F) Task versioning fields
-- ----------------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS delete_reason text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);


-- ============================================================================
-- Helper functions for RLS
-- SECURITY DEFINER + fixed search_path so they run as the table owner and
-- bypass RLS on the tables they inspect (avoids policy recursion).
-- ============================================================================

CREATE OR REPLACE FUNCTION is_workspace_admin(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = workspace_uuid AND w.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_uuid
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION project_role(project_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pm.role FROM project_members pm
  WHERE pm.project_id = project_uuid
    AND pm.user_id = auth.uid()
    AND pm.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_project_member(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT project_role(project_uuid) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION project_workspace_id(project_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM projects WHERE id = project_uuid;
$$;

CREATE OR REPLACE FUNCTION can_view_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_project_member(project_uuid) OR is_workspace_admin(project_workspace_id(project_uuid));
$$;

CREATE OR REPLACE FUNCTION can_manage_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT project_role(project_uuid) IN ('owner','manager') OR is_workspace_admin(project_workspace_id(project_uuid));
$$;

CREATE OR REPLACE FUNCTION can_edit_project_content(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT project_role(project_uuid) IN ('owner','manager','editor') OR is_workspace_admin(project_workspace_id(project_uuid));
$$;

CREATE OR REPLACE FUNCTION can_comment_on_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT project_role(project_uuid) IN ('owner','manager','editor','commenter')
    OR is_workspace_admin(project_workspace_id(project_uuid));
$$;


-- ============================================================================
-- Trigger: auto-add project creator as owner
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, status, added_by)
  VALUES (NEW.id, NEW.created_by, 'owner', 'active', NEW.created_by)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_created_owner
AFTER INSERT ON projects
FOR EACH ROW EXECUTE FUNCTION handle_new_project();


-- ============================================================================
-- Backfill: existing projects get their creator as owner
-- ============================================================================
INSERT INTO project_members (project_id, user_id, role, status, added_by)
SELECT p.id, p.created_by, 'owner', 'active', p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = p.created_by
)
ON CONFLICT (project_id, user_id) DO NOTHING;


-- ============================================================================
-- Trigger: task version bump on update
-- ============================================================================
CREATE OR REPLACE FUNCTION bump_task_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_task_version
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION bump_task_version();


-- ============================================================================
-- Audit logging
-- Generic trigger that records inserts/updates/deletes on collaboration
-- and content tables. Never logs raw invite tokens — only token_hash, and
-- that column is stripped from the logged payload as defense in depth.
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_workspace_id uuid;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSE
    v_new := to_jsonb(NEW);
  END IF;

  IF TG_TABLE_NAME = 'project_invites' THEN
    v_old := v_old - 'token_hash';
    v_new := v_new - 'token_hash';
  END IF;

  v_project_id := COALESCE((v_new->>'project_id')::uuid, (v_old->>'project_id')::uuid);

  IF TG_TABLE_NAME = 'projects' THEN
    v_project_id := COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  END IF;

  IF TG_TABLE_NAME = 'task_comments' THEN
    SELECT t.project_id INTO v_project_id FROM tasks t
    WHERE t.id = COALESCE((v_new->>'task_id')::uuid, (v_old->>'task_id')::uuid);
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT workspace_id INTO v_workspace_id FROM projects WHERE id = v_project_id;
  END IF;

  INSERT INTO audit_events (workspace_id, project_id, actor_id, entity_type, entity_id, action, old_data, new_data)
  VALUES (
    v_workspace_id,
    v_project_id,
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid),
    TG_OP,
    v_old,
    v_new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_project_members
  AFTER INSERT OR UPDATE OR DELETE ON project_members
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_project_invites
  AFTER INSERT OR UPDATE ON project_invites
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_project_access_requests
  AFTER INSERT OR UPDATE ON project_access_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_task_comments
  AFTER INSERT OR UPDATE OR DELETE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- ============================================================================
-- RLS: project_members
-- ============================================================================
CREATE POLICY "View project members for viewable projects" ON project_members FOR SELECT
  USING (can_view_project(project_id));

CREATE POLICY "Managers can insert project members" ON project_members FOR INSERT
  WITH CHECK (can_manage_project(project_id));

CREATE POLICY "Managers can update project members" ON project_members FOR UPDATE
  USING (can_manage_project(project_id));

CREATE POLICY "Managers can delete project members" ON project_members FOR DELETE
  USING (can_manage_project(project_id));


-- ============================================================================
-- RLS: project_invites
-- ============================================================================
CREATE POLICY "Managers can view invites" ON project_invites FOR SELECT
  USING (can_manage_project(project_id));

CREATE POLICY "Managers can create invites" ON project_invites FOR INSERT
  WITH CHECK (can_manage_project(project_id) AND created_by = auth.uid());

CREATE POLICY "Managers can revoke invites" ON project_invites FOR UPDATE
  USING (can_manage_project(project_id));


-- ============================================================================
-- RLS: project_access_requests
-- ============================================================================
CREATE POLICY "View own or manageable access requests" ON project_access_requests FOR SELECT
  USING (user_id = auth.uid() OR can_manage_project(project_id));

CREATE POLICY "Users create own access requests" ON project_access_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner or manager reviews access requests" ON project_access_requests FOR UPDATE
  USING (user_id = auth.uid() OR can_manage_project(project_id));


-- ============================================================================
-- RLS: audit_events (owners/managers only, for now)
-- ============================================================================
CREATE POLICY "Owners and managers view audit trail" ON audit_events FOR SELECT
  USING (
    project_id IS NOT NULL
    AND (
      project_role(project_id) IN ('owner','manager')
      OR is_workspace_admin(project_workspace_id(project_id))
    )
  );


-- ============================================================================
-- RLS: tighten projects / columns / tasks / task_comments
-- ============================================================================
DROP POLICY IF EXISTS "Workspace members can view projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can update projects" ON projects;

CREATE POLICY "Members can view accessible projects" ON projects FOR SELECT
  USING (can_view_project(id));

CREATE POLICY "Managers can update projects" ON projects FOR UPDATE
  USING (can_manage_project(id));

-- "Workspace members can create projects" stays as-is: any workspace member
-- may create a project; the trigger above then makes them its owner.

DROP POLICY IF EXISTS "Workspace members can manage columns" ON columns;

CREATE POLICY "Viewers can view columns" ON columns FOR SELECT
  USING (can_view_project(project_id));

CREATE POLICY "Editors can insert columns" ON columns FOR INSERT
  WITH CHECK (can_edit_project_content(project_id));

CREATE POLICY "Editors can update columns" ON columns FOR UPDATE
  USING (can_edit_project_content(project_id));

CREATE POLICY "Managers can delete columns" ON columns FOR DELETE
  USING (can_manage_project(project_id));

DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Creator can delete tasks" ON tasks;

CREATE POLICY "View project or personal tasks" ON tasks FOR SELECT
  USING (
    (is_personal = true AND created_by = auth.uid())
    OR (is_personal = false AND project_id IS NOT NULL AND can_view_project(project_id))
  );

CREATE POLICY "Create personal or project tasks" ON tasks FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      is_personal = true
      OR (project_id IS NOT NULL AND can_edit_project_content(project_id))
    )
  );

CREATE POLICY "Update personal or project tasks" ON tasks FOR UPDATE
  USING (
    (is_personal = true AND created_by = auth.uid())
    OR (is_personal = false AND project_id IS NOT NULL AND can_edit_project_content(project_id))
  );

CREATE POLICY "Delete personal or project tasks" ON tasks FOR DELETE
  USING (
    (is_personal = true AND created_by = auth.uid())
    OR (is_personal = false AND project_id IS NOT NULL AND (created_by = auth.uid() OR can_manage_project(project_id)))
  );

DROP POLICY IF EXISTS "Workspace members can view comments" ON task_comments;
DROP POLICY IF EXISTS "Members can add comments" ON task_comments;

CREATE POLICY "View comments on accessible tasks" ON task_comments FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE (is_personal = true AND created_by = auth.uid())
         OR (is_personal = false AND project_id IS NOT NULL AND can_view_project(project_id))
    )
  );

CREATE POLICY "Commenters can add comments" ON task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (
      SELECT id FROM tasks
      WHERE (is_personal = true AND created_by = auth.uid())
         OR (is_personal = false AND project_id IS NOT NULL AND can_comment_on_project(project_id))
    )
  );

-- "Authors can delete comments" is unchanged and still applies.


-- ============================================================================
-- Realtime: add new collaboration tables (idempotent)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_access_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_access_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE audit_events;
  END IF;
END $$;
