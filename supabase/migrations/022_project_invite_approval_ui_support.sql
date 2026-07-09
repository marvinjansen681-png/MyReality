-- ============================================================================
-- STEP 21B — Project Invite + Approval UI: RLS gaps closed, RPC support added
--
-- Reviewed the Step 21A RLS surface against what the invite/approval UI
-- needs before writing any frontend code. Found and fixed one real gap and
-- one real privilege-escalation bug; added the rest as SECURITY DEFINER RPC
-- functions rather than loosening RLS, per the "don't weaken RLS" directive.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- FIX (security bug, not just a gap): the original Step 21A UPDATE policy on
-- project_access_requests was
--   USING (user_id = auth.uid() OR can_manage_project(project_id))
-- with NO WITH CHECK. Postgres reuses USING as WITH CHECK when none is given,
-- which means a requester could update their OWN row and set status directly
-- to 'approved' — self-approving their own access request. That was latent
-- but harmless until now; it becomes a real privilege escalation the moment
-- an approval-triggered auto-membership-grant exists (added below). Fixed by
-- splitting authorization: only owner/manager may move a request to
-- approved/rejected; self-service update is removed for this step (no
-- "cancel my own request" UI is being built here, so there's nothing
-- legitimate for a requester to self-update to).
--
-- Same issue existed on INSERT: a requester could INSERT their own row with
-- status already set to 'approved'. Fixed by forcing status = 'pending' on
-- self-insert.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users create own access requests" ON project_access_requests;
CREATE POLICY "Users create own access requests" ON project_access_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Owner or manager reviews access requests" ON project_access_requests;
CREATE POLICY "Owner or manager reviews access requests" ON project_access_requests FOR UPDATE
  USING (can_manage_project(project_id))
  WITH CHECK (can_manage_project(project_id) AND status IN ('approved', 'rejected'));


-- ----------------------------------------------------------------------------
-- GAP: project_members had INSERT/UPDATE/DELETE policies scoped to
-- can_manage_project(), which is true for BOTH owner and manager — meaning a
-- manager could currently change an owner's role or remove an owner
-- entirely, and nothing stopped removing the last active owner. Neither was
-- part of the Step 21A spec but both are now explicitly required. RLS can
-- only gate by row, not by "how many other rows exist", so this needs a
-- trigger (same reasoning as the archive/restore trigger in 021).
--
-- This trigger also does the removed_at/removed_by stamping asked for in
-- this step: server-side, not trusting client-supplied values, mirroring
-- the archived_by pattern from 021.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_project_member_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_owners integer;
BEGIN
  IF OLD.role = 'owner' AND OLD.status = 'active' THEN
    IF NOT can_own_project(OLD.project_id) THEN
      RAISE EXCEPTION 'Only the project owner can change or remove another owner''s membership';
    END IF;

    IF TG_OP = 'DELETE'
       OR (NEW.role IS DISTINCT FROM 'owner' OR NEW.status IS DISTINCT FROM 'active') THEN
      SELECT count(*) INTO v_remaining_owners
      FROM project_members
      WHERE project_id = OLD.project_id AND role = 'owner' AND status = 'active' AND id <> OLD.id;
      IF v_remaining_owners = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last active owner of a project';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.status = 'removed' AND OLD.status IS DISTINCT FROM 'removed' THEN
    NEW.removed_at := now();
    NEW.removed_by := auth.uid();
  ELSIF NEW.status IS DISTINCT FROM 'removed' THEN
    NEW.removed_at := NULL;
    NEW.removed_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_member_rules ON project_members;
CREATE TRIGGER trg_enforce_project_member_rules
BEFORE UPDATE OR DELETE ON project_members
FOR EACH ROW EXECUTE FUNCTION enforce_project_member_rules();


-- ----------------------------------------------------------------------------
-- Approval side-effects: approving a request should reliably (a) provision
-- project_members and (b) increment the invite's used_count, as one atomic
-- server-side action rather than 2-3 separate client writes that could
-- partially fail. The UI's "Approve" button becomes a single UPDATE
-- (status = 'approved'); this trigger does the rest.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_access_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO project_members (project_id, user_id, role, status, added_by)
    VALUES (NEW.project_id, NEW.user_id, NEW.requested_role, 'active', NEW.reviewed_by)
    ON CONFLICT (project_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
          status = 'active',
          added_by = EXCLUDED.added_by,
          added_at = now(),
          removed_by = NULL,
          removed_at = NULL;

    IF NEW.invite_id IS NOT NULL THEN
      UPDATE project_invites SET used_count = used_count + 1 WHERE id = NEW.invite_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_access_request_approval ON project_access_requests;
CREATE TRIGGER trg_handle_access_request_approval
AFTER UPDATE ON project_access_requests
FOR EACH ROW EXECUTE FUNCTION handle_access_request_approval();


-- ----------------------------------------------------------------------------
-- Defense in depth: even though the RPC below is the intended entry point
-- for creating a request from an invite, the direct INSERT policy still
-- technically allows a signed-in user to insert a request referencing any
-- invite_id/project_id pair. This trigger validates that if invite_id is
-- set, it's a real, matching, currently-valid invite — independent of
-- whatever inserted the row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_project_access_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite project_invites%ROWTYPE;
BEGIN
  IF NEW.invite_id IS NOT NULL THEN
    SELECT * INTO v_invite FROM project_invites WHERE id = NEW.invite_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invite not found';
    END IF;
    IF v_invite.project_id <> NEW.project_id THEN
      RAISE EXCEPTION 'Invite does not match project';
    END IF;
    IF v_invite.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'This invite link has been revoked';
    END IF;
    IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
      RAISE EXCEPTION 'This invite link has expired';
    END IF;
    IF v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN
      RAISE EXCEPTION 'This invite link has reached its usage limit';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_project_access_request ON project_access_requests;
CREATE TRIGGER trg_validate_project_access_request
BEFORE INSERT ON project_access_requests
FOR EACH ROW EXECUTE FUNCTION validate_project_access_request();


-- ============================================================================
-- RPC: get_invite_status — safe, minimal invite preview for the landing page.
-- Callable by anyone, including signed-out visitors (SECURITY DEFINER, same
-- pattern as every other permission helper). Never returns token_hash.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_invite_status(token_hash_input text)
RETURNS TABLE (
  invite_id uuid,
  project_id uuid,
  project_name text,
  project_icon text,
  project_color text,
  default_role text,
  approval_required boolean,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_invite project_invites%ROWTYPE;
  v_project projects%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM project_invites pi WHERE pi.token_hash = token_hash_input;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::boolean, 'not_found'::text;
    RETURN;
  END IF;

  SELECT * INTO v_project FROM projects p WHERE p.id = v_invite.project_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT v_invite.id, v_invite.project_id, NULL::text, NULL::text, NULL::text, v_invite.default_role, v_invite.approval_required, 'not_found'::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_invite.id,
    v_invite.project_id,
    v_project.name,
    v_project.icon,
    v_project.color,
    v_invite.default_role,
    v_invite.approval_required,
    CASE
      WHEN v_invite.revoked_at IS NOT NULL THEN 'revoked'
      WHEN v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN 'expired'
      WHEN v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN 'max_uses_reached'
      ELSE 'valid'
    END;
END;
$$;


-- ============================================================================
-- RPC: redeem_project_invite — the ONLY path that turns a valid invite into
-- either a pending access request or (approval_required = false only) actual
-- membership. Requires an authenticated caller. Re-validates everything
-- server-side regardless of what the preview showed, and increments
-- used_count atomically with the membership grant it corresponds to (never
-- for a merely-pending request — that happens on approval, via the trigger
-- above, so used_count always reflects actual grants, not just clicks).
-- ============================================================================
CREATE OR REPLACE FUNCTION redeem_project_invite(token_hash_input text)
RETURNS TABLE (
  result text,
  invalid_reason text,
  project_id uuid,
  project_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite project_invites%ROWTYPE;
  v_project projects%ROWTYPE;
  v_uid uuid := auth.uid();
  v_existing_member project_members%ROWTYPE;
  v_existing_request project_access_requests%ROWTYPE;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Must be signed in to redeem an invite';
  END IF;

  SELECT * INTO v_invite FROM project_invites pi WHERE pi.token_hash = token_hash_input;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, 'not_found'::text, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_project FROM projects p WHERE p.id = v_invite.project_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, 'not_found'::text, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  v_status := CASE
    WHEN v_invite.revoked_at IS NOT NULL THEN 'revoked'
    WHEN v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN 'expired'
    WHEN v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN 'max_uses_reached'
    ELSE 'valid'
  END;

  IF v_status <> 'valid' THEN
    RETURN QUERY SELECT 'invalid'::text, v_status, v_invite.project_id, v_project.name, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_existing_member FROM project_members pm
    WHERE pm.project_id = v_invite.project_id AND pm.user_id = v_uid AND pm.status = 'active';
  IF FOUND THEN
    RETURN QUERY SELECT 'already_member'::text, NULL::text, v_invite.project_id, v_project.name, v_existing_member.role;
    RETURN;
  END IF;

  IF v_invite.approval_required THEN
    SELECT * INTO v_existing_request FROM project_access_requests par
      WHERE par.project_id = v_invite.project_id AND par.user_id = v_uid;

    IF FOUND AND v_existing_request.status = 'pending' THEN
      RETURN QUERY SELECT 'pending_existing'::text, NULL::text, v_invite.project_id, v_project.name, v_existing_request.requested_role;
      RETURN;
    END IF;

    IF FOUND THEN
      UPDATE project_access_requests
        SET status = 'pending', invite_id = v_invite.id, requested_role = v_invite.default_role,
            requested_at = now(), reviewed_by = NULL, reviewed_at = NULL, review_note = NULL
        WHERE id = v_existing_request.id;
    ELSE
      INSERT INTO project_access_requests (project_id, invite_id, user_id, requested_role, status)
      VALUES (v_invite.project_id, v_invite.id, v_uid, v_invite.default_role, 'pending');
    END IF;

    RETURN QUERY SELECT 'pending_created'::text, NULL::text, v_invite.project_id, v_project.name, v_invite.default_role;
    RETURN;
  ELSE
    INSERT INTO project_members (project_id, user_id, role, status, added_by)
    VALUES (v_invite.project_id, v_uid, v_invite.default_role, 'active', v_invite.created_by)
    ON CONFLICT (project_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, status = 'active', added_by = EXCLUDED.added_by,
          added_at = now(), removed_by = NULL, removed_at = NULL;

    UPDATE project_invites SET used_count = used_count + 1 WHERE id = v_invite.id;

    RETURN QUERY SELECT 'added'::text, NULL::text, v_invite.project_id, v_project.name, v_invite.default_role;
    RETURN;
  END IF;
END;
$$;
