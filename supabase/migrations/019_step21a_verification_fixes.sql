-- ============================================================================
-- STEP 21A — Verification fixes
-- Found while verifying 018 against live Supabase (2026-07-09):
--
-- 1) BLOCKING: "Workspace members can create projects" (INSERT policy on
--    projects) rejects every authenticated insert, even for a user who is
--    a workspace_members row for that workspace_id. 018 never touched this
--    policy, so this predates it, but it means NO new project can currently
--    be created in production. Self-healing fix: drop + recreate it verbatim.
--
-- 2) Deleting a project throws a foreign key violation:
--      insert or update on table "audit_events" violates foreign key
--      constraint "audit_events_project_id_fkey"
--    Cause: deleting a project cascades to project_members/tasks/etc:
--    their AFTER DELETE audit triggers try to INSERT a new audit_events row
--    with project_id = <the project being deleted>, but by the time those
--    child triggers fire, the parent projects row is already gone from the
--    transaction's view, so the FK check fails. Fix: log_audit_event() now
--    checks the project still exists before using it as project_id / for
--    the workspace_id lookup, falling back to NULL (entity_id still records
--    what was deleted). Also adds DELETE to the projects audit trigger so
--    project deletions themselves are logged (entity_id captures it even
--    though project_id/workspace_id will be NULL for that row, since the
--    project is gone by the time the trigger runs).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Fix 1: restore the projects INSERT policy
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace members can create projects" ON projects;
CREATE POLICY "Workspace members can create projects" ON projects FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));


-- ----------------------------------------------------------------------------
-- Fix 2: audit trigger must not choke when its parent project is mid-delete
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
      -- Parent project no longer exists (e.g. this row is being deleted as
      -- part of a cascading project delete). Don't try to FK-reference it.
      v_project_id := NULL;
      v_workspace_id := NULL;
    END IF;
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

DROP TRIGGER IF EXISTS trg_audit_projects ON projects;
CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
