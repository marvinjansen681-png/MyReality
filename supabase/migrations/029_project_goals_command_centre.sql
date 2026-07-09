-- ============================================================================
-- STEP 21F — Project Command Centre + Goals
--
-- Adds project_goals (milestones a project's tasks can be organized under)
-- and project_goal_comments, links tasks to goals, and extends the audit
-- trigger to label goal lifecycle actions readably. Follows the exact same
-- SECURITY DEFINER / RLS / audit patterns established in 018/021/026 — no
-- new architectural approach introduced.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) project_goals
-- ----------------------------------------------------------------------------
CREATE TABLE project_goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date date,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_goals_project ON project_goals(project_id);
CREATE INDEX idx_project_goals_status ON project_goals(project_id, status);
ALTER TABLE project_goals ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 2) tasks.goal_id — a task may belong to one goal, or none. Same-project
-- enforcement lives in a trigger (see #4) rather than a CHECK constraint,
-- since CHECK constraints can't do cross-table lookups.
-- ----------------------------------------------------------------------------
ALTER TABLE tasks ADD COLUMN goal_id uuid REFERENCES project_goals(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id) WHERE goal_id IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 3) Server-side stamping + status-transition trigger for project_goals.
-- Mirrors enforce_project_archive_owner_only (021): the general UPDATE RLS
-- policy is deliberately permissive (owner/manager/editor, matching
-- can_edit_project_content), and this trigger is what actually restricts
-- archiving to owner/manager — RLS policies can't apply per-column logic,
-- but a trigger can inspect exactly which field changed.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_goal_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  NEW.updated_at := now();

  -- Archiving/unarchiving a goal requires manager-or-above, independent of
  -- the general editor-level UPDATE grant.
  IF (NEW.status = 'archived' AND OLD.status <> 'archived')
     OR (OLD.status = 'archived' AND NEW.status <> 'archived') THEN
    IF NOT can_manage_project(NEW.project_id) THEN
      RAISE EXCEPTION 'Only the project owner or a manager can archive or restore a goal';
    END IF;
  END IF;

  -- Completing: stamp server-side, don't trust client-supplied values.
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at := now();
    NEW.completed_by := auth.uid();
  ELSIF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_goal_rules
BEFORE INSERT OR UPDATE ON project_goals
FOR EACH ROW EXECUTE FUNCTION enforce_goal_rules();


-- ----------------------------------------------------------------------------
-- 4) Same-project enforcement for tasks.goal_id.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_task_goal_same_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_project_id uuid;
BEGIN
  IF NEW.goal_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.goal_id IS NOT DISTINCT FROM OLD.goal_id THEN RETURN NEW; END IF;

  SELECT project_id INTO v_goal_project_id FROM project_goals WHERE id = NEW.goal_id;
  IF NOT FOUND OR v_goal_project_id IS DISTINCT FROM NEW.project_id THEN
    RAISE EXCEPTION 'A task can only be linked to a goal in the same project';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_task_goal_same_project
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION enforce_task_goal_same_project();


-- ----------------------------------------------------------------------------
-- 5) RLS: project_goals
--    - Anyone who can view the project can view its goals (owner through
--      viewer).
--    - Create/update (including complete/reopen) requires
--      can_edit_project_content (owner/manager/editor).
--    - Archiving is further restricted to owner/manager by the trigger above.
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view project goals" ON project_goals FOR SELECT
  USING (can_view_project(project_id));

CREATE POLICY "Editors can create project goals" ON project_goals FOR INSERT
  WITH CHECK (can_edit_project_content(project_id));

CREATE POLICY "Editors can update project goals" ON project_goals FOR UPDATE
  USING (can_edit_project_content(project_id));

-- No DELETE policy: goals are archived, not hard-deleted — same "archive is
-- the reversible default" decision already made for projects in 021.
-- Cascade delete still happens automatically if the parent project is
-- hard-deleted (owner-only, per 021).


-- ----------------------------------------------------------------------------
-- 6) project_goal_comments
-- ----------------------------------------------------------------------------
CREATE TABLE project_goal_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id uuid NOT NULL REFERENCES project_goals(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_goal_comments_goal ON project_goal_comments(goal_id);
CREATE INDEX idx_project_goal_comments_project ON project_goal_comments(project_id);
ALTER TABLE project_goal_comments ENABLE ROW LEVEL SECURITY;

-- Server-side stamping + same-project enforcement, same reasoning as #4.
CREATE OR REPLACE FUNCTION enforce_goal_comment_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_project_id uuid;
BEGIN
  SELECT project_id INTO v_goal_project_id FROM project_goals WHERE id = NEW.goal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;
  NEW.project_id := v_goal_project_id;
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_goal_comment_project
BEFORE INSERT ON project_goal_comments
FOR EACH ROW EXECUTE FUNCTION enforce_goal_comment_project();

-- owner/manager/editor/commenter can comment; viewer cannot — mirrors
-- can_comment_on_project() exactly, same as task_comments.
CREATE POLICY "Members can view goal comments" ON project_goal_comments FOR SELECT
  USING (can_view_project(project_id));

CREATE POLICY "Commenters can add goal comments" ON project_goal_comments FOR INSERT
  WITH CHECK (can_comment_on_project(project_id));

CREATE POLICY "Author or manager can delete goal comments" ON project_goal_comments FOR DELETE
  USING (user_id = auth.uid() OR can_manage_project(project_id));

CREATE TRIGGER trg_audit_project_goal_comments
  AFTER INSERT OR DELETE ON project_goal_comments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- ----------------------------------------------------------------------------
-- 7) Goal mentions — mirrors create_mention_notifications (026) exactly,
-- just pointed at project_goal_comments instead of task_comments.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_goal_mention_notifications(comment_id_input uuid, mentioned_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment project_goal_comments%ROWTYPE;
  v_goal project_goals%ROWTYPE;
  v_actor_name text;
  v_uid uuid;
BEGIN
  SELECT * INTO v_comment FROM project_goal_comments WHERE id = comment_id_input;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_comment.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the comment author can create mentions for it';
  END IF;

  SELECT * INTO v_goal FROM project_goals WHERE id = v_comment.goal_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();

  FOREACH v_uid IN ARRAY mentioned_user_ids LOOP
    IF v_uid <> auth.uid() AND is_active_project_member(v_comment.project_id, v_uid) THEN
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (
        v_uid,
        'mention',
        'You were mentioned in "' || COALESCE(v_goal.title, 'a goal') || '"',
        COALESCE(v_actor_name, 'Someone') || ' mentioned you: ' || left(v_comment.content, 100),
        '/projects/' || v_comment.project_id::text
      );
    END IF;
  END LOOP;
END;
$$;


-- ----------------------------------------------------------------------------
-- 8) Audit trigger + readable action labels for project_goals.
-- project_goals/project_goal_comments both carry project_id directly, so the
-- existing generic log_audit_event() already resolves workspace/project for
-- them with no special-casing. This CREATE OR REPLACE only adds the
-- COMPLETE/REOPEN/ARCHIVE/RESTORE action labels for project_goals UPDATEs,
-- the same way 027 already labels ARCHIVE/RESTORE for projects.
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
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT workspace_id INTO v_workspace_id FROM projects WHERE id = v_project_id;
    IF NOT FOUND THEN
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

  IF TG_TABLE_NAME = 'project_goals' AND TG_OP = 'UPDATE' THEN
    IF (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
      IF (v_new->>'status') = 'completed' THEN
        v_action := 'COMPLETE';
      ELSIF (v_old->>'status') = 'completed' THEN
        v_action := 'REOPEN';
      ELSIF (v_new->>'status') = 'archived' THEN
        v_action := 'ARCHIVE';
      ELSIF (v_old->>'status') = 'archived' THEN
        v_action := 'RESTORE';
      END IF;
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

CREATE TRIGGER trg_audit_project_goals
  AFTER INSERT OR UPDATE OR DELETE ON project_goals
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- ----------------------------------------------------------------------------
-- 9) Realtime: add project_goals (idempotent, same pattern as 018/026).
-- Not adding project_goal_comments to realtime — goal comments are read on
-- open, not a live chat surface, matching the "don't overbuild" instruction.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_goals;
  END IF;
END $$;
