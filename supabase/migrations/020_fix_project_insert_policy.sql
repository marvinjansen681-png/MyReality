-- ============================================================================
-- STEP 21A — Fix #2 for projects INSERT policy (019 did not resolve it)
--
-- 019's drop+recreate of "Workspace members can create projects" used the
-- same raw subquery it always had:
--   workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
-- Re-verification after 019 shows this still rejects every insert with
-- 42501, for a real, confirmed workspace_members row. This is the ONLY
-- remaining policy anywhere in the schema still using a raw, unwrapped
-- subquery against workspace_members from within another table's RLS
-- check — every other policy that needs this (is_workspace_admin,
-- can_view_project, etc.) goes through a SECURITY DEFINER function, which
-- sidesteps workspace_members' own (self-referential) RLS policy entirely.
-- A self-referential SELECT policy queried as a nested subquery from a
-- different table's INSERT check is a known Postgres/RLS trouble spot.
--
-- Fix: add an is_workspace_member() helper (same pattern as
-- is_workspace_admin) and use it here instead of the raw subquery.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_uuid AND wm.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Workspace members can create projects" ON projects;
CREATE POLICY "Workspace members can create projects" ON projects FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));
