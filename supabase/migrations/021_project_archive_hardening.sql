-- ============================================================================
-- STEP 21A.1 — Project Archive/Delete Policy Hardening
--
-- Decision: project deletion is not a normal collaboration feature.
-- Archiving is the default, reversible, owner-only action. Hard delete is
-- restricted to the owner too, and is NOT exposed anywhere in the normal UI
-- — it exists at the database layer only, for future admin/cleanup tooling.
--
-- Managers can still manage project content (members, invites, columns,
-- tasks) via can_manage_project() — this migration does not touch that.
-- They may NOT archive, restore, or delete the project itself. Editors,
-- commenters, and viewers were never able to do any of this and still can't.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Archive fields
-- ----------------------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS archive_reason text;

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);


-- ----------------------------------------------------------------------------
-- 3) can_own_project — true only for the project's active owner, or a
-- workspace owner/admin (same override pattern as can_manage_project).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_own_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT project_role(project_uuid) = 'owner' OR is_workspace_admin(project_workspace_id(project_uuid));
$$;


-- ----------------------------------------------------------------------------
-- 2) Owner-only enforcement for archive/restore
--
-- RLS policies can restrict by ROW but not by COLUMN — the existing
-- "Managers can update projects" policy (can_manage_project) must stay in
-- place so managers can still edit name/description/color/icon. To stop a
-- manager from sneaking an archive/restore through that same UPDATE, a
-- BEFORE UPDATE trigger specifically inspects archived_at and blocks the
-- change unless can_own_project() is true. It also stamps archived_by/
-- archived_at/status server-side rather than trusting client-provided
-- values, and syncs the legacy status column so existing status-based
-- queries/filters keep working.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_project_archive_owner_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    IF NOT can_own_project(NEW.id) THEN
      RAISE EXCEPTION 'Only the project owner can archive or restore this project';
    END IF;

    IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
      -- Archiving
      NEW.archived_at := now();
      NEW.archived_by := auth.uid();
      NEW.status := 'archived';
    ELSIF NEW.archived_at IS NULL AND OLD.archived_at IS NOT NULL THEN
      -- Restoring
      NEW.archived_by := NULL;
      NEW.archive_reason := NULL;
      NEW.status := 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_archive_owner_only ON projects;
CREATE TRIGGER trg_enforce_project_archive_owner_only
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION enforce_project_archive_owner_only();


-- ----------------------------------------------------------------------------
-- 4) Hard delete: owner-only, not exposed in normal UI.
-- Resolves the previously-flagged gap (no DELETE policy existed on projects
-- at all). This intentionally does not allow managers to delete a project,
-- even though they can manage its content.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner can hard-delete project" ON projects;
CREATE POLICY "Owner can hard-delete project" ON projects FOR DELETE
  USING (can_own_project(id));


-- ----------------------------------------------------------------------------
-- 7) Audit: label archive/restore distinctly instead of generic UPDATE.
-- ----------------------------------------------------------------------------
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
  v_action text;
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
    IF NOT FOUND THEN
      v_project_id := NULL;
      v_workspace_id := NULL;
    END IF;
  END IF;

  v_action := TG_OP;
  IF TG_TABLE_NAME = 'projects' AND TG_OP = 'UPDATE' THEN
    IF (v_old->>'archived_at') IS NULL AND (v_new->>'archived_at') IS NOT NULL THEN
      v_action := 'ARCHIVE';
    ELSIF (v_old->>'archived_at') IS NOT NULL AND (v_new->>'archived_at') IS NULL THEN
      v_action := 'RESTORE';
    END IF;
  END IF;

  INSERT INTO audit_events (workspace_id, project_id, actor_id, entity_type, entity_id, action, old_data, new_data)
  VALUES (
    v_workspace_id,
    v_project_id,
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid),
    v_action,
    v_old,
    v_new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
