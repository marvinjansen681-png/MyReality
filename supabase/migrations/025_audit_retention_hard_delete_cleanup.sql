-- ============================================================================
-- STEP 21C.1 — Audit Retention Cleanup for Hard-Deleted Projects
-- Resolves Known Issue #11.
--
-- PRODUCT DECISION (as directed):
--   - Archiving is the normal, safe, reversible action and must preserve
--     full project audit history (unaffected by this migration — archived
--     projects are UPDATEs, never deletes, so their audit_events rows keep
--     a live project_id and stay visible under the existing policy).
--   - Hard delete means the owner intentionally purges the project. On hard
--     delete, project-level audit_events for that project are cleaned up —
--     not kept around as invisible project_id/workspace_id-null orphans.
--   - A single workspace-level HARD_DELETE marker is kept, visible only to
--     the workspace owner/admin, so "this project existed and was purged"
--     isn't lost entirely — without loosening audit_events RLS broadly or
--     exposing deleted-project history to unrelated users.
--
-- ROOT CAUSE (recap): audit_events.project_id already has
-- ON DELETE CASCADE, so pre-existing rows tied to a project are correctly
-- purged when the project is hard-deleted. The orphans came from a
-- different source: the AFTER DELETE/UPDATE audit triggers that fire
-- *during* the cascade itself (project_members, tasks, task_comments rows
-- being deleted as children of the project delete) run after the parent
-- projects row is already gone from view, so log_audit_event() nulled
-- project_id/workspace_id to dodge the FK violation and inserted the row
-- anyway — creating exactly the invisible orphans this migration removes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) log_audit_event(): stop creating cascade-orphan rows; log one
--    workspace-level HARD_DELETE marker for the project's own delete instead.
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

  -- Special case: the project row itself being hard-deleted. Log one
  -- workspace-scoped HARD_DELETE marker (project_id left NULL on purpose —
  -- the project is gone — but workspace_id is preserved from OLD, read
  -- before the row disappeared, so the RLS policy below can gate it by
  -- workspace admin/owner instead of project membership).
  IF TG_TABLE_NAME = 'projects' AND TG_OP = 'DELETE' THEN
    INSERT INTO audit_events (workspace_id, project_id, actor_id, entity_type, entity_id, action, old_data, new_data)
    VALUES (
      (v_old->>'workspace_id')::uuid,
      NULL,
      auth.uid(),
      'projects',
      (v_old->>'id')::uuid,
      'HARD_DELETE',
      v_old,
      NULL
    );
    RETURN OLD;
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
      -- Parent project no longer exists — this row is a cascade child of a
      -- project hard-delete (e.g. a project_members/task/task_comments row
      -- being removed along with it). Per the product decision above,
      -- project-level audit history is cleaned up on hard delete rather
      -- than kept as an invisible orphan, so skip logging this event
      -- entirely instead of inserting an unreachable project_id-null row.
      RETURN COALESCE(NEW, OLD);
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


-- ----------------------------------------------------------------------------
-- 2) audit_events SELECT policy: narrowly add visibility for the new
--    HARD_DELETE marker to the workspace owner/admin only. Does NOT loosen
--    visibility for any other project_id-null row, and does not touch the
--    existing owner/manager project-scoped branch at all.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners and managers view audit trail" ON audit_events;
CREATE POLICY "Owners and managers view audit trail" ON audit_events FOR SELECT
  USING (
    (
      project_id IS NOT NULL
      AND (
        project_role(project_id) IN ('owner','manager')
        OR is_workspace_admin(project_workspace_id(project_id))
      )
    )
    OR (
      project_id IS NULL
      AND entity_type = 'projects'
      AND action = 'HARD_DELETE'
      AND workspace_id IS NOT NULL
      AND is_workspace_admin(workspace_id)
    )
  );


-- ----------------------------------------------------------------------------
-- 3) One-time cleanup of pre-existing orphan rows (project_id AND
--    workspace_id both NULL) accumulated by earlier verification rounds.
--    Confirmed test residue in Step 21C's live verification — this mirrors
--    that same exact-condition cleanup, now codified so it also cleans up
--    on any environment this migration is applied to. Rows that already
--    have a project_id (still-cascadable) or a preserved workspace_id
--    (i.e. any future HARD_DELETE marker, including ones this very
--    migration might have just started producing) are left untouched.
-- ----------------------------------------------------------------------------
DELETE FROM audit_events WHERE project_id IS NULL AND workspace_id IS NULL;
