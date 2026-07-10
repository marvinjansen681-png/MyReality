-- ============================================================================
-- STEP 21G — Goal Action Steps + Project Pulse
--
-- Adds two atomic, RLS-safe RPCs (create_goal_action_step,
-- convert_task_to_goal) and a deadline_explanations table. No RLS is
-- weakened or bypassed anywhere: both RPCs are SECURITY DEFINER but each
-- re-checks the exact same permission the equivalent direct-table RLS
-- policy would have checked, before doing anything — the same pattern
-- already used by create_mention_notifications (026). The point of the
-- RPCs is atomicity (task + assignment, or goal + task-link, in one
-- transaction), not looser permissions.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) create_goal_action_step — creates a real project task under a goal and,
-- optionally, assigns it in the same transaction. Mirrors exactly what the
-- client would otherwise do as two separate calls (tasks insert +
-- task_assignees insert), but atomically: if the assignee turns out to be
-- invalid, nothing is created at all, instead of a task existing with a
-- silently-failed assignment.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_goal_action_step(
  project_id_input uuid,
  goal_id_input uuid,
  column_id_input uuid,
  title_input text,
  assignee_id_input uuid,
  due_date_input date,
  priority_input text
)
RETURNS tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_goal_project uuid;
  v_column_project uuid;
BEGIN
  IF NOT can_edit_project_content(project_id_input) THEN
    RAISE EXCEPTION 'Not authorized to create action steps on this project';
  END IF;

  IF title_input IS NULL OR btrim(title_input) = '' THEN
    RAISE EXCEPTION 'Action step title is required';
  END IF;

  SELECT project_id INTO v_goal_project FROM project_goals WHERE id = goal_id_input;
  IF v_goal_project IS DISTINCT FROM project_id_input THEN
    RAISE EXCEPTION 'Goal does not belong to this project';
  END IF;

  SELECT project_id INTO v_column_project FROM columns WHERE id = column_id_input;
  IF v_column_project IS DISTINCT FROM project_id_input THEN
    RAISE EXCEPTION 'Column does not belong to this project';
  END IF;

  IF assignee_id_input IS NOT NULL AND NOT is_active_project_member(project_id_input, assignee_id_input) THEN
    RAISE EXCEPTION 'Assignee must be an active project member';
  END IF;

  INSERT INTO tasks (
    project_id, goal_id, column_id, title, is_personal, parent_task_id,
    status, priority, due_date, created_by, position
  )
  VALUES (
    project_id_input, goal_id_input, column_id_input, btrim(title_input), false, NULL,
    'todo', COALESCE(priority_input, 'none'), due_date_input, auth.uid(),
    (SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE column_id = column_id_input)
  )
  RETURNING * INTO v_task;

  IF assignee_id_input IS NOT NULL THEN
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task.id, assignee_id_input);
  END IF;

  RETURN v_task;
END;
$$;


-- ----------------------------------------------------------------------------
-- 2) convert_task_to_goal — the safer first version per the brief: creates a
-- new goal from the task's title/priority/due_date and links the original
-- task under that goal (goal_id set). The task itself is left untouched
-- otherwise — not deleted, not marked done, no data lost. Once linked, the
-- task shows up as the goal's first Action Step, and the user can move other
-- related tasks under it from there.
--
-- KNOWN LIMITATION (documented, not silently dropped): task.description is
-- TipTap JSON, not plain text, so it is not copied into the goal's
-- (plain-text) description field. The goal is created with an empty
-- description; Marvin can fill it in via Edit Goal if wanted.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION convert_task_to_goal(task_id_input uuid)
RETURNS project_goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_goal project_goals%ROWTYPE;
  v_priority text;
  v_workspace_id uuid;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = task_id_input;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_task.project_id IS NULL THEN
    RAISE EXCEPTION 'Only project tasks can be converted to a goal';
  END IF;
  IF NOT can_edit_project_content(v_task.project_id) THEN
    RAISE EXCEPTION 'Not authorized to convert this task';
  END IF;

  v_priority := CASE WHEN v_task.priority = 'none' THEN 'medium' ELSE v_task.priority END;

  INSERT INTO project_goals (project_id, title, priority, due_date, created_by)
  VALUES (v_task.project_id, v_task.title, v_priority, v_task.due_date, auth.uid())
  RETURNING * INTO v_goal;

  UPDATE tasks SET goal_id = v_goal.id, updated_at = now() WHERE id = task_id_input;

  SELECT workspace_id INTO v_workspace_id FROM projects WHERE id = v_task.project_id;

  -- Explicit marker event, distinct from the generic project_goals INSERT
  -- and tasks UPDATE rows this also naturally produces via the existing
  -- audit triggers — this one specifically says "this goal came from a
  -- task conversion" so the Activity tab can render it as such.
  INSERT INTO audit_events (workspace_id, project_id, actor_id, entity_type, entity_id, action, old_data, new_data)
  VALUES (
    v_workspace_id, v_task.project_id, auth.uid(), 'tasks', task_id_input, 'CONVERT_TO_GOAL',
    to_jsonb(v_task), jsonb_build_object('goal_id', v_goal.id, 'goal_title', v_goal.title)
  );

  RETURN v_goal;
END;
$$;


-- ----------------------------------------------------------------------------
-- 3) deadline_explanations
-- ----------------------------------------------------------------------------
CREATE TABLE deadline_explanations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES project_goals(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  reason text NOT NULL,
  new_expected_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deadline_explanations_exactly_one_target CHECK (
    (task_id IS NOT NULL AND goal_id IS NULL) OR (task_id IS NULL AND goal_id IS NOT NULL)
  )
);
CREATE INDEX idx_deadline_explanations_project ON deadline_explanations(project_id);
CREATE INDEX idx_deadline_explanations_task ON deadline_explanations(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_deadline_explanations_goal ON deadline_explanations(goal_id) WHERE goal_id IS NOT NULL;
ALTER TABLE deadline_explanations ENABLE ROW LEVEL SECURITY;

-- Server-side stamping: project_id is always derived from the referenced
-- task/goal (never trusted from the client — the same reasoning as
-- task_assignees' project_id derivation in 026), and created_by is always
-- the caller. This also guarantees an explanation can never be attached to
-- a task/goal outside the project it claims to belong to.
CREATE OR REPLACE FUNCTION enforce_deadline_explanation_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NEW.task_id IS NOT NULL THEN
    SELECT project_id INTO v_project_id FROM tasks WHERE id = NEW.task_id;
    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Cannot add a deadline explanation to a personal task';
    END IF;
  ELSE
    SELECT project_id INTO v_project_id FROM project_goals WHERE id = NEW.goal_id;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Task or goal not found';
  END IF;

  NEW.project_id := v_project_id;
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_deadline_explanation_project
BEFORE INSERT ON deadline_explanations
FOR EACH ROW EXECUTE FUNCTION enforce_deadline_explanation_project();

-- View: anyone who can view the project. Add: owner/manager/editor/
-- commenter (mirrors can_comment_on_project exactly — viewer cannot).
CREATE POLICY "Members can view deadline explanations" ON deadline_explanations FOR SELECT
  USING (can_view_project(project_id));

CREATE POLICY "Commenters can add deadline explanations" ON deadline_explanations FOR INSERT
  WITH CHECK (can_comment_on_project(project_id));

CREATE TRIGGER trg_audit_deadline_explanations
  AFTER INSERT ON deadline_explanations
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- ----------------------------------------------------------------------------
-- 4) Realtime: add deadline_explanations (idempotent, same pattern as prior
-- migrations). project_goals/tasks/task_assignees/audit_events are already
-- on the publication from 018/021/026/029 — nothing else to add.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deadline_explanations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deadline_explanations;
  END IF;
END $$;
