-- ============================================================================
-- STEP 21D — Practical Collaboration Tools
--
-- Checked first (per instruction): tasks already has `due_date` (date) and
-- `priority` (text, checked against a 5-value enum including 'none') from
-- migration 007 — both already editable in TaskDetail. No schema change
-- needed for those two; this migration only adds what's actually missing.
--
-- tasks also already has `assigned_to uuid[]` (007), but it has no way to
-- enforce "only active project members," no per-assignment actor/timestamp,
-- and no clean per-assignment audit trail (only a whole-array diff). Per the
-- brief's preferred approach, this migration adds a proper `task_assignees`
-- join table as the source of truth for assignment going forward.
-- `assigned_to` is left untouched (unused by the new UI, not dropped) —
-- no destructive change to an existing column.
--
-- PRE-EXISTING BUG FOUND (not introduced by this step, fixed here):
-- `notifications` has RLS enabled but only ever had SELECT/UPDATE policies
-- scoped to `user_id = auth.uid()` (013) — there has never been an INSERT
-- policy of any kind. That means every client-side `insertNotification()`
-- call in TaskDetail.tsx (task_assigned on assignment, task_commented on
-- comment) has been silently failing since it was written: RLS default-
-- denies with no matching policy, and the call site never checked the
-- returned error. No notification has ever actually been created by either
-- path. Fixed here by moving notification creation entirely server-side
-- (SECURITY DEFINER triggers/RPC, the same pattern this schema already uses
-- everywhere else) instead of opening a client-writable INSERT policy on
-- notifications, which would let any authenticated user spam/phish another
-- user_id with arbitrary notification content. notifications keeps zero
-- client-writable INSERT policies after this migration — RLS is not
-- loosened, the previously-broken feature is fixed via the same
-- already-established privileged-trigger pattern.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) task_assignees
-- ----------------------------------------------------------------------------
CREATE TABLE task_assignees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_project ON task_assignees(project_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- The realtime map on the project page needs task_id/user_id from DELETE
-- payloads to know which task to update, but Postgres logical replication
-- only sends the primary key on DELETE unless the table's replica identity
-- includes the full row (the same constraint documented in useRealtime.ts
-- for `tasks`, which sidesteps it by not needing old-row data on delete —
-- this table does need it, so it opts into FULL instead).
ALTER TABLE task_assignees REPLICA IDENTITY FULL;


-- ----------------------------------------------------------------------------
-- 2) is_active_project_member — same SECURITY DEFINER pattern as every other
-- permission helper, parameterized by a target user so it can validate an
-- assignee (not just the calling user).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_active_project_member(project_uuid uuid, target_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_uuid AND pm.user_id = target_user AND pm.status = 'active'
  );
$$;


-- ----------------------------------------------------------------------------
-- 3) Server-side stamping trigger — derives project_id from the task itself
-- (never trusts a client-supplied project_id, which could otherwise be used
-- to mismatch a task in one project against membership checks for another),
-- and stamps assigned_by/assigned_at server-side, same pattern as
-- archived_by/removed_by elsewhere in this schema. Also the single place
-- that rejects assigning a personal task (project_id IS NULL).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_task_assignee_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_project_id uuid;
BEGIN
  SELECT project_id INTO v_task_project_id FROM tasks WHERE id = NEW.task_id;
  IF v_task_project_id IS NULL THEN
    RAISE EXCEPTION 'Cannot assign a personal task or a task with no project';
  END IF;
  NEW.project_id := v_task_project_id;
  NEW.assigned_by := auth.uid();
  NEW.assigned_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_task_assignee_project ON task_assignees;
CREATE TRIGGER trg_enforce_task_assignee_project
BEFORE INSERT ON task_assignees
FOR EACH ROW EXECUTE FUNCTION enforce_task_assignee_project();


-- ----------------------------------------------------------------------------
-- 4) RLS: task_assignees
--    - Anyone who can view the project can see who's assigned (including
--      viewers/commenters — this is read-only visibility, not an edit right).
--    - Only owner/manager/editor can assign, and only to a currently-active
--      project member (project_id here is always the trigger-derived real
--      value, not client input, so this check can't be spoofed).
--    - Only owner/manager/editor can unassign.
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view task assignees" ON task_assignees FOR SELECT
  USING (can_view_project(project_id));

CREATE POLICY "Editors can assign active members" ON task_assignees FOR INSERT
  WITH CHECK (
    can_edit_project_content(project_id)
    AND is_active_project_member(project_id, user_id)
  );

CREATE POLICY "Editors can unassign" ON task_assignees FOR DELETE
  USING (can_edit_project_content(project_id));


-- ----------------------------------------------------------------------------
-- 5) Audit logging — reuses the existing generic log_audit_event() trigger.
-- task_assignees carries project_id directly (like project_members), so no
-- special-case branch is needed in that function; entity_type='task_assignees'
-- falls through to the standard project_id-present path.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_audit_task_assignees
  AFTER INSERT OR DELETE ON task_assignees
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- ----------------------------------------------------------------------------
-- 6) Notification: task assigned to you. Fully server-side — fires
-- automatically whenever a task_assignees row is inserted, no client call
-- needed (unlike the old, always-failing client insert).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_task_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title text;
  v_actor_name text;
BEGIN
  IF NEW.user_id = NEW.assigned_by THEN RETURN NEW; END IF;

  SELECT title INTO v_task_title FROM tasks WHERE id = NEW.task_id;
  SELECT full_name INTO v_actor_name FROM profiles WHERE id = NEW.assigned_by;

  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    'task_assigned',
    'You were assigned to "' || COALESCE(v_task_title, 'a task') || '"',
    'Assigned by ' || COALESCE(v_actor_name, 'someone'),
    '/projects/' || NEW.project_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assignee ON task_assignees;
CREATE TRIGGER trg_notify_task_assignee
AFTER INSERT ON task_assignees
FOR EACH ROW EXECUTE FUNCTION notify_task_assignee();


-- ----------------------------------------------------------------------------
-- 7) Notification: new comment on your task. This is the second half of the
-- pre-existing broken-notification bug above (task_commented never actually
-- fired). Fixed the same way — moved server-side.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_task_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_actor_name text;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = NEW.task_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF v_task.created_by IS NOT NULL AND v_task.created_by <> NEW.user_id THEN
    SELECT full_name INTO v_actor_name FROM profiles WHERE id = NEW.user_id;
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      v_task.created_by,
      'task_commented',
      'New comment on "' || COALESCE(v_task.title, 'a task') || '"',
      COALESCE(v_actor_name, 'Someone') || ': ' || left(NEW.content, 100),
      CASE WHEN v_task.project_id IS NOT NULL THEN '/projects/' || v_task.project_id::text ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_comment ON task_comments;
CREATE TRIGGER trg_notify_task_comment
AFTER INSERT ON task_comments
FOR EACH ROW EXECUTE FUNCTION notify_task_comment();


-- ----------------------------------------------------------------------------
-- 8) Mentions: create_mention_notifications RPC.
-- Mention *parsing* (matching "@name"/"@email" text against the active
-- member list) happens client-side, where the profile data already is —
-- deliberately kept simple, no server-side name-matching regex needed. This
-- RPC is the trust boundary: it independently re-validates every mentioned
-- id server-side before creating anything, so a client can't forge mentions
-- for users who aren't actually active project members (this is also what
-- keeps a removed member from receiving a new mention notification, and
-- keeps a non-member from ever learning the project exists via a mention).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_mention_notifications(comment_id_input uuid, mentioned_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment task_comments%ROWTYPE;
  v_task tasks%ROWTYPE;
  v_actor_name text;
  v_uid uuid;
BEGIN
  SELECT * INTO v_comment FROM task_comments WHERE id = comment_id_input;
  IF NOT FOUND THEN RETURN; END IF;

  -- Defense in depth: only the comment's own author may trigger mentions for it.
  IF v_comment.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the comment author can create mentions for it';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = v_comment.task_id;
  IF NOT FOUND OR v_task.project_id IS NULL THEN RETURN; END IF;

  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();

  FOREACH v_uid IN ARRAY mentioned_user_ids LOOP
    IF v_uid <> auth.uid() AND is_active_project_member(v_task.project_id, v_uid) THEN
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (
        v_uid,
        'mention',
        'You were mentioned in "' || COALESCE(v_task.title, 'a task') || '"',
        COALESCE(v_actor_name, 'Someone') || ' mentioned you: ' || left(v_comment.content, 100),
        '/projects/' || v_task.project_id::text
      );
    END IF;
  END LOOP;
END;
$$;


-- ----------------------------------------------------------------------------
-- 9) notifications.type: add access_request_approved / access_request_rejected.
-- Flagged as a clean TODO back in Step 21B ("adding one needs its own
-- migration") — this is that migration.
--
-- The original CHECK constraint (012) was defined inline with no explicit
-- name, so Postgres auto-generated one — rather than assume it followed the
-- usual <table>_<column>_check convention (if that guess were wrong, DROP
-- ... IF EXISTS would silently no-op and leave the old 5-value constraint
-- in place, permanently blocking the two new types via AND'd CHECK
-- enforcement), look it up directly and drop whatever it's actually named.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'notifications'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%type%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('task_assigned','task_commented','task_due','mention','vision_due','access_request_approved','access_request_rejected'));


-- ----------------------------------------------------------------------------
-- 10) Notification: your access request was approved / rejected.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_access_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name text;
  v_reviewer_name text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved','rejected') THEN RETURN NEW; END IF;

  SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;
  SELECT full_name INTO v_reviewer_name FROM profiles WHERE id = NEW.reviewed_by;

  IF NEW.status = 'approved' THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'access_request_approved',
      'Access approved for "' || COALESCE(v_project_name, 'a project') || '"',
      'Approved by ' || COALESCE(v_reviewer_name, 'a project manager'),
      '/projects/' || NEW.project_id::text
    );
  ELSE
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'access_request_rejected',
      'Access request declined for "' || COALESCE(v_project_name, 'a project') || '"',
      CASE WHEN NEW.review_note IS NOT NULL THEN 'Note: ' || NEW.review_note ELSE 'Reviewed by ' || COALESCE(v_reviewer_name, 'a project manager') END,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_access_request_status ON project_access_requests;
CREATE TRIGGER trg_notify_access_request_status
AFTER UPDATE ON project_access_requests
FOR EACH ROW EXECUTE FUNCTION notify_access_request_status();


-- ----------------------------------------------------------------------------
-- 11) Realtime: add task_assignees (idempotent, same pattern as 018).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_assignees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_assignees;
  END IF;
END $$;
