-- ============================================================================
-- STEP 21H — Project Chat
--
-- Adds project_chat_messages: quick, project-scoped communication that sits
-- alongside goals/tasks/comments/Activity, not a replacement for any of
-- them. Same established patterns throughout: RLS is permissive at the
-- table level, a trigger narrows exactly which fields can change and by
-- whom (021/029/030's "RLS + trigger" pattern), sender/actor fields are
-- always stamped server-side, and mentions reuse the exact
-- is_active_project_member() re-validation already used by
-- create_mention_notifications (026) and create_goal_mention_notifications
-- (029) — a client can't forge a mention notification for a non-member.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) project_chat_messages
-- ----------------------------------------------------------------------------
CREATE TABLE project_chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to_message_id uuid REFERENCES project_chat_messages(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_chat_messages_project_created ON project_chat_messages(project_id, created_at);
CREATE INDEX idx_project_chat_messages_sender ON project_chat_messages(sender_id);
CREATE INDEX idx_project_chat_messages_deleted ON project_chat_messages(deleted_at);
ALTER TABLE project_chat_messages ENABLE ROW LEVEL SECURITY;

-- Live message list needs old-row user_id-equivalent (sender_id) on
-- UPDATE/DELETE payloads, same reasoning documented in useRealtime.ts /
-- 026's task_assignees table.
ALTER TABLE project_chat_messages REPLICA IDENTITY FULL;


-- ----------------------------------------------------------------------------
-- 2) Insert: server-stamps sender_id, and rejects a reply-to from a
-- different project (defense in depth — the column is included per the
-- brief's "optional if useful", but no reply-thread UI is built this step).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_chat_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reply_project uuid;
BEGIN
  NEW.sender_id := auth.uid();

  IF NEW.reply_to_message_id IS NOT NULL THEN
    SELECT project_id INTO v_reply_project FROM project_chat_messages WHERE id = NEW.reply_to_message_id;
    IF v_reply_project IS DISTINCT FROM NEW.project_id THEN
      RAISE EXCEPTION 'Cannot reply to a message from a different project';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_chat_message_insert
BEFORE INSERT ON project_chat_messages
FOR EACH ROW EXECUTE FUNCTION enforce_chat_message_insert();


-- ----------------------------------------------------------------------------
-- 3) Update: the real enforcement layer for edit vs. delete vs. moderation.
--    - The sender may edit their own content (stamps edited_at) as long as
--      it isn't already deleted, and/or soft-delete their own message.
--    - Anyone else touching the row must be owner/manager, and may ONLY
--      flip deleted_at from null to a value (moderation soft-delete) —
--      never edit someone else's content, never undelete, never touch a
--      message that's already deleted.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_chat_message_edit_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'Cannot change the sender of a chat message';
  END IF;
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    RAISE EXCEPTION 'Cannot move a chat message to a different project';
  END IF;

  IF OLD.sender_id = auth.uid() THEN
    IF NEW.content IS DISTINCT FROM OLD.content THEN
      IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit a deleted message';
      END IF;
      NEW.edited_at := now();
    END IF;
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NEW.deleted_at IS NOT NULL THEN
      NEW.deleted_by := auth.uid();
    END IF;
  ELSE
    IF NOT can_manage_project(OLD.project_id) THEN
      RAISE EXCEPTION 'Not authorized to modify this message';
    END IF;
    IF NEW.content IS DISTINCT FROM OLD.content THEN
      RAISE EXCEPTION 'Only the sender can edit message content';
    END IF;
    IF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Managers can only soft-delete an active message';
    END IF;
    NEW.deleted_by := auth.uid();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_chat_message_edit_rules
BEFORE UPDATE ON project_chat_messages
FOR EACH ROW EXECUTE FUNCTION enforce_chat_message_edit_rules();


-- ----------------------------------------------------------------------------
-- 4) RLS: project_chat_messages
--    - View: any active project member (can_view_project already excludes
--      removed members and non-members).
--    - Send: owner/manager/editor/commenter (can_comment_on_project) —
--      viewer is read-only.
--    - Update: permissive at the RLS layer (sender, or owner/manager);
--      trigger #3 above is the actual fine-grained gate.
--    - No DELETE policy at all — messages are soft-deleted only, same
--      "archive/soft-delete is the reversible default" decision as 021/029.
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view project chat" ON project_chat_messages FOR SELECT
  USING (can_view_project(project_id));

CREATE POLICY "Commenters can send project chat messages" ON project_chat_messages FOR INSERT
  WITH CHECK (can_comment_on_project(project_id));

CREATE POLICY "Sender or manager can update project chat messages" ON project_chat_messages FOR UPDATE
  USING (
    (sender_id = auth.uid() AND can_view_project(project_id))
    OR can_manage_project(project_id)
  );


-- ----------------------------------------------------------------------------
-- 5) Mentions — mirrors create_goal_mention_notifications (029) /
-- create_mention_notifications (026) exactly, pointed at chat messages.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_chat_mention_notifications(message_id_input uuid, mentioned_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message project_chat_messages%ROWTYPE;
  v_actor_name text;
  v_uid uuid;
BEGIN
  SELECT * INTO v_message FROM project_chat_messages WHERE id = message_id_input;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_message.sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the message author can create mentions for it';
  END IF;

  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();

  FOREACH v_uid IN ARRAY mentioned_user_ids LOOP
    IF v_uid <> auth.uid() AND is_active_project_member(v_message.project_id, v_uid) THEN
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (
        v_uid,
        'mention',
        COALESCE(v_actor_name, 'Someone') || ' mentioned you in project chat',
        left(v_message.content, 100),
        '/projects/' || v_message.project_id::text
      );
    END IF;
  END LOOP;
END;
$$;


-- ----------------------------------------------------------------------------
-- 6) Audit logging — reuses the existing generic log_audit_event() trigger.
-- project_chat_messages carries project_id directly, so no special-casing
-- is needed for project/workspace resolution; this CREATE OR REPLACE only
-- adds SEND/EDIT/DELETE_MESSAGE action labels, the same way 029 added
-- COMPLETE/REOPEN/ARCHIVE/RESTORE for project_goals.
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

  IF TG_TABLE_NAME = 'project_chat_messages' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'SEND';
    ELSIF TG_OP = 'UPDATE' THEN
      IF (v_old->>'deleted_at') IS NULL AND (v_new->>'deleted_at') IS NOT NULL THEN
        v_action := 'DELETE_MESSAGE';
      ELSIF (v_old->>'content') IS DISTINCT FROM (v_new->>'content') THEN
        v_action := 'EDIT';
      ELSE
        -- No user-visible change (e.g. a no-op update) — skip logging noise.
        RETURN NEW;
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

CREATE TRIGGER trg_audit_project_chat_messages
  AFTER INSERT OR UPDATE ON project_chat_messages
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- ----------------------------------------------------------------------------
-- 7) Realtime: add project_chat_messages (idempotent, same pattern as every
-- prior migration).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_chat_messages;
  END IF;
END $$;
