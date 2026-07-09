-- ============================================================================
-- STEP 21E — Browser UAT finding: pending access requesters show as
-- "Unknown user" in the owner/manager review panel.
--
-- ROOT CAUSE: can_view_profile() (migration 024) only grants visibility once
-- the viewer and target already share an ACTIVE project membership or a
-- workspace membership. A user who has just requested access via an invite
-- link is, by definition, NOT YET an active member — that's exactly the
-- state the reviewer needs to evaluate. The approve/reject UI
-- (ProjectAccessRequests.tsx) already does the correct two-step profile
-- fetch (fetchProfilesByIds), but the RLS policy behind it silently returns
-- nothing for a first-time requester, so every fresh access request shows
-- "Unknown user" to the reviewer — there is no way to tell who you're
-- actually approving. Confirmed live during Step 21E's browser UAT: a real
-- request from Shafica appeared as "Unknown user" to Marvin despite her
-- profile row existing and being complete.
--
-- FIX: narrowly extend can_view_profile() (not the policy itself, which
-- already just calls this function) with one more case — a project
-- owner/manager can see the profile of anyone who has a project_access_requests
-- row on a project they manage. Scoped by the existing can_manage_project()
-- check, so this doesn't open profile visibility to anyone who isn't
-- actually in a position to review that specific request. Not a blanket
-- widening — mirrors the exact reasoning 024 already used for the
-- workspace/active-membership cases.
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
    )
    OR EXISTS (
      SELECT 1 FROM project_access_requests par
      WHERE par.user_id = target_user_id
        AND can_manage_project(par.project_id)
    );
$$;
