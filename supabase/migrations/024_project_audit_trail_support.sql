-- ============================================================================
-- STEP 21C — Project Audit Trail + Activity Visibility
--
-- Investigated before writing any UI code, per instruction. Found a
-- pre-existing gap (not introduced by this step, but a direct blocker for
-- it): `profiles` RLS only ever allowed a user to see their OWN row
-- ("Users can view own profile" USING (auth.uid() = id)). That means an
-- audit trail entry for an action by anyone other than the viewer could
-- never resolve a name/email — the profiles row simply isn't visible.
--
-- This also explains, independently of this step, why the
-- `profiles!<table>_<column>_fkey` embed pattern used elsewhere in the
-- app has never actually surfaced a teammate's name: those tables' user_id
-- columns have a foreign key to auth.users, not to profiles, so PostgREST
-- can't traverse that relationship under ANY hint name — it's a query-
-- syntax bug independent of RLS, on top of the RLS gap fixed here. Fixed
-- the two files this step touches (see code changes); flagged the rest as
-- a separate follow-up, not expanded here.
--
-- Fix: a per-row check, not a blanket "everyone can see everyone" policy —
-- you can see a profile if it's your own, or if you currently share an
-- active project membership or a workspace membership with that person.
-- ============================================================================

CREATE OR REPLACE FUNCTION can_view_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    target_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = target_user_id
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm1
      JOIN project_members pm2 ON pm2.project_id = pm1.project_id
      WHERE pm1.user_id = auth.uid() AND pm1.status = 'active'
        AND pm2.user_id = target_user_id AND pm2.status = 'active'
    );
$$;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "View own or collaborator profile" ON profiles FOR SELECT
  USING (can_view_profile(id));
