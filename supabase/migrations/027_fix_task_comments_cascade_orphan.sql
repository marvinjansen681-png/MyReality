-- ============================================================================
-- Fix: task_comments cascade-delete still produced an invisible orphan
-- audit_events row — a second-level version of the exact problem Step
-- 21C.1 (migration 025) was meant to eliminate.
--
-- FOUND: during Step 21D's live verification, hard-deleting a project whose
-- tasks had comments left 3 orphaned audit_events rows (project_id AND
-- workspace_id both NULL) — the personal-task-unrelated kind, genuinely
-- invisible to everyone.
--
-- ROOT CAUSE: log_audit_event() resolves project_id for every entity type
-- either directly off the row's own project_id column (projects,
-- project_members, tasks, task_assignees) or, for task_comments only,
-- indirectly via `SELECT t.project_id FROM tasks t WHERE t.id = ...`. 025's
-- fix only guards the *direct* case: "project_id was found on the row, but
-- looking that project up failed." It never anticipated a *two-level*
-- cascade — project delete -> its tasks cascade-delete -> their comments
-- cascade-delete, all in one transaction — where task_comments' own lookup
-- fails not because a project vanished, but because the *task* it's trying
-- to join through is ALSO already gone by the time this trigger fires.
-- v_project_id was simply left at its NULL default in that case, which
-- skipped the "was this row's project deleted mid-cascade" check entirely
-- and fell straight into the INSERT — reproducing the orphan.
--
-- FIX: task_comments now treats "the task I'm trying to resolve through no
-- longer exists" exactly the same as every other entity type treats "the
-- project I belong to no longer exists" — skip logging the cascade-child
-- event instead of inserting it with everything null. No other entity type
-- was affected (all of them read project_id directly off their own row).
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
    IF NOT FOUND THEN
      -- The task this comment belongs to is also already gone within this
      -- same transaction (cascading from its project's hard delete two
      -- levels up) — skip, don't orphan.
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT workspace_id INTO v_workspace_id FROM projects WHERE id = v_project_id;
    IF NOT FOUND THEN
      -- Parent project no longer exists — this row is a cascade child of a
      -- project hard-delete. Skip logging this event entirely instead of
      -- inserting an unreachable project_id-null row.
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
