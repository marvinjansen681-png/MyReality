-- ============================================================================
-- BUGFIX — notify owner/manager of a new incoming access request
--
-- Found live: Shafica Boyce requested access to "Regal Bay Properties (Pty)
-- Ltd" via an invite link. The request landed correctly in
-- project_access_requests (visible in the project's own Activity tab), and
-- the Approve/Reject UI already existed (ProjectShareModal -> Requests tab
-- -> ProjectAccessRequests.tsx) — but nothing ever told Marvin a request was
-- waiting. notify_access_request_status() (026) only notifies the
-- REQUESTER once a decision is made; there was never a trigger notifying
-- the REVIEWER that a decision is needed. This fixes that gap.
-- ============================================================================

-- Extend the type CHECK to allow the new notification type (same pattern as
-- 026, which named this constraint explicitly so it can be referenced
-- directly here rather than looked up dynamically).
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('task_assigned','task_commented','task_due','mention','vision_due','access_request_approved','access_request_rejected','access_request_received'));


CREATE OR REPLACE FUNCTION notify_new_access_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name text;
  v_requester_name text;
  v_reviewer RECORD;
BEGIN
  SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;
  SELECT full_name INTO v_requester_name FROM profiles WHERE id = NEW.user_id;

  -- Every active owner/manager on the project gets notified — not just the
  -- project creator, since a manager can approve/reject too
  -- (can_manage_project() everywhere else in this schema treats owner and
  -- manager as the same reviewing tier).
  FOR v_reviewer IN
    SELECT user_id FROM project_members
    WHERE project_id = NEW.project_id AND status = 'active' AND role IN ('owner', 'manager')
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      v_reviewer.user_id,
      'access_request_received',
      COALESCE(v_requester_name, 'Someone') || ' requested access to "' || COALESCE(v_project_name, 'a project') || '"',
      'Requested ' || NEW.requested_role || ' access — review it in Share > Requests',
      '/projects/' || NEW.project_id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_access_request ON project_access_requests;
CREATE TRIGGER trg_notify_new_access_request
AFTER INSERT ON project_access_requests
FOR EACH ROW EXECUTE FUNCTION notify_new_access_request();
