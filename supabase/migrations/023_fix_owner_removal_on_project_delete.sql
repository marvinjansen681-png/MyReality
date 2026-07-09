-- ============================================================================
-- STEP 21B — Fix: enforce_project_member_rules() (022) blocks legitimate
-- project hard-deletion.
--
-- Found during live verification: deleting a project cascades (ON DELETE
-- CASCADE) to its project_members rows, which fires the BEFORE DELETE
-- trigger added in 022 for EACH row — including the owner's. That trigger
-- correctly blocks removing the last active owner in the normal case (a
-- manager or the owner explicitly removing a membership row while the
-- project keeps existing), but it can't tell that difference from "the
-- whole project is being deleted anyway, so there's nothing left to leave
-- without an owner." Result: no project could ever be hard-deleted at all,
-- regressing the owner-only hard-delete capability verified in 021.
--
-- Fix: check whether the parent project row still exists before enforcing
-- either the owner-only-touches-owner rule or the last-owner rule. Same
-- technique used for the analogous audit_events cascade race in 019 —
-- during a cascading delete, the parent row is already gone from this
-- trigger's view by the time it fires, so its absence is exactly the
-- signal that this is cascade cleanup, not a standalone removal.
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_project_member_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_owners integer;
  v_project_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM projects WHERE id = OLD.project_id) INTO v_project_exists;

  IF v_project_exists AND OLD.role = 'owner' AND OLD.status = 'active' THEN
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
