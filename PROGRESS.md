# PROGRESS.md
### Live Build Tracker — Updated by Claude Code after every step
### Last updated: 2026-07-09

---

## ▶️ CURRENT STATUS

```
NEXT STEP TO BUILD:  Step 21C? — no more steps currently requested. Step 21B
                     (Project Invite + Approval UI) is complete and fully
                     verified live.
OVERALL PROGRESS:    20 of 20 original steps + Step 21A + Step 21A.1 + Step 21B
                     all complete and fully verified live.
LAST COMMIT:         28fc6a0 (Step 21A + 21A.1, pushed) — Step 21B not yet
                     committed/pushed, see below.
APP STATUS:          npm run lint ✅ · npx tsc --noEmit ✅ · npm run build ✅ zero errors
                     ✅ Step 21B (invite links, approval flow, member management) built,
                     migrations 022+023 applied and verified live — 55/55 checks passing.
                     Raw invite tokens confirmed never stored (only SHA-256 hash). RLS was
                     tightened, never weakened — one real self-approval privilege-escalation
                     bug from Step 21A was found and fixed along the way (see Known Issue #8).
```

---

## 📋 STEP TRACKER

| # | Step | Status | Commit | Notes |
|---|---|---|---|---|
| 1 | Project Initialisation | ✅ Complete | step-1 | Next.js 14 + all packages + folder structure + design tokens |
| 2 | TypeScript Types | ✅ Complete | step-2 | All types from Section 8 — zero TS errors |
| 3 | Supabase Setup | ✅ Complete | step-3 | All 11 tables + RLS + visions bucket verified OK |
| 4 | Auth + Workspace Creation | ✅ Complete | step-4 | Login, signup, Google OAuth, workspace modal, middleware |
| 5 | App Shell (Sidebar + Header) | ✅ Complete | step-5 | Sidebar + Header + Zustand stores, mobile drawer, collapse |
| 6 | Dashboard | ✅ Complete | step-6 | 5 widgets, parallel Supabase queries, mobile grid |
| 7 | Vision Board | ✅ Complete | step-7 | DnD reorder, image upload, confetti, category filter |
| 8 | Weekly Planner | ✅ Complete | step-8 | Cross-day DnD, week nav, intention field, mobile tabs |
| 9 | Personal Task Tracker | ✅ Complete | step-9 | TipTap drawer, subtasks, bulk actions, filter/sort |
| 10 | Projects (Board + List + TaskDetail) | ✅ Complete | step-10 | Kanban DnD, list view, comments, activity log |
| 11 | Realtime Collaboration | ✅ Complete | step-11 | useRealtime hook, live board updates via postgres_changes |
| 12 | Notifications | ✅ Complete | step-12 | Bell dropdown, realtime INSERT, mark read/all |
| 13 | Team Management | ✅ Complete | step-13 | Invite, role change, remove member, email scaffolding |
| 14 | Command Palette (Cmd+K) | ✅ Complete | step-14 | Search, keyboard nav, recent items, Cmd+K shortcut |
| 15 | Settings | ✅ Complete | step-15 | Profile + avatar, workspace + logo, notif prefs toggles |
| 16 | Landing Page | ✅ Complete | step-16 | Hero, Features, How it works, Testimonials, CTA, Footer |
| 17 | PWA Setup | ✅ Complete | step-17 | Icons generated, manifest fixed, offline toast wired |
| 18 | Capacitor Android Setup | ✅ Complete | step-18 | capacitor.config.ts, android/ generated, privacy page |
| 19 | Resend Email Scaffolding | ✅ Complete | step-13 | Built in step-13, RESEND_ENABLED=false |
| 20 | Final QA | ✅ Complete | step-20 | Zero TS errors, npm run build clean, all lint fixed |
| 21A | Project Collaboration Security Foundation | ✅ Complete | step-21a | project_members/invites/access_requests/audit_events, RLS lockdown, permission helpers |
| 21A.1 | Project Archive/Delete Policy Hardening | ✅ Complete, verified live | step-21a-1 | Archive fields, owner-only archive/restore/delete trigger+policy, resolves Known Issue #6 |
| 21B | Project Invite + Approval UI | ✅ Complete, verified live | step-21b | Invite links, approval flow, member management, migrations 022+023 |

**Status icons:**
⬜ Not started | 🔄 In progress | ✅ Complete | ❌ Blocked

---

## 📝 STEP NOTES

### Step 1 — Project Initialisation
```
Status:     ✅ Complete
Started:    2026-06-08
Completed:  2026-06-08
Commit:     step-1
Notes:
  - Next.js 14.2.3 initialised with TypeScript strict mode
  - All 38 approved packages installed (npm install --legacy-peer-deps)
  - Full folder structure created per Section 7 of MYREALITY_BUILD.md
  - Design tokens written to app/globals.css (all CSS variables)
  - Tailwind config extended with custom colours, fonts, radius
  - Google Fonts: Playfair Display + DM Sans loaded in root layout.tsx
  - PWA manifest.json created in /public/
  - next.config.js set up with next-pwa (disabled in dev) + Capacitor export flag
  - All 14 Supabase migration SQL files created in /supabase/migrations/
  - .env.local created with Supabase credentials
  - Dev server confirmed running: localhost:3001
  - npx tsc --noEmit: ZERO errors
```

### Step 2 — TypeScript Types
```
Status:     ✅ Complete
Started:    2026-06-08
Completed:  2026-06-08
Commit:     step-2
Notes:
  - All types from Section 8 written to /types/index.ts
  - 10 union types, 12 interfaces, fully strict — no any, no inline types
  - npx tsc --noEmit: ZERO errors
```

### Step 3 — Supabase Setup
```
Status:     ✅ Complete
Started:    2026-06-08
Completed:  2026-06-08
Commit:     step-3
Supabase project URL: https://khcpvjtphzidwzbhtayh.supabase.co
Tables created:
  profiles, workspaces, workspace_members, projects, columns,
  tasks, task_comments, task_activity, weekly_plans, visions, notifications
RLS: enabled on all tables (verified via REST API — all 11 returned 200 OK)
Storage: visions bucket created
Realtime: enabled on tasks, task_comments, task_activity, notifications
Notes:
  - Supabase clients written: lib/supabase/client.ts (browser), server.ts, middleware.ts
  - Used @supabase/ssr 0.3.0 get/set/remove cookie API (not getAll/setAll)
  - Migration run manually in Supabase SQL editor by Marvin (env blocks direct DB connection)
  - Combined migration file: supabase/migrations/000_run_all.sql (for reference)
```

### Step 4 — Auth + Workspace Creation
```
Status:     ✅ Complete
Started:    2026-06-08
Completed:  2026-06-08
Commit:     step-4
Notes:
  - middleware.ts: session refresh + route protection for all /dashboard, /vision, etc.
  - LoginForm: email+password + Google OAuth + forgot password (Supabase magic link)
  - SignupForm: full name + email + password (min 8) + Google OAuth
  - Both forms: React Hook Form + Zod, inline errors, Sonner toasts, mobile-first
  - /app/auth/callback/route.ts: OAuth code exchange
  - /app/auth/signout/route.ts: POST to sign out
  - CreateWorkspaceModal: checks on mount if user has workspace, shows if not
    - Not dismissible — required before accessing dashboard
    - Creates workspace + workspace_member row (role: owner)
    - Auto-generates slug from workspace name
    - Slug collision handled with friendly error toast
  - AppLayout: server-side auth check, redirects to /login if no session
  - Dev server confirmed: localhost:3002, zero runtime errors
  - npx tsc --noEmit: ZERO errors
```

### Step 5 — App Shell
```
Status:     ✅ Complete
Started:    2026-06-08
Completed:  2026-06-08
Commit:     step-5
Notes:
  - uiStore: sidebarCollapsed (persisted to localStorage), sidebarMobileOpen, activeModal
  - workspaceStore: activeWorkspace (persisted)
  - Sidebar: desktop sticky with Framer Motion width animation (240px ↔ 64px)
    - Mobile: overlay drawer from left, backdrop, closes on nav click
    - Active route: gold left border + bg-hover
    - Collapsed: icon-only with tooltip on hover
    - Workspace name in header, logout button at bottom
  - Header: 56px sticky, safe-top for PWA notch support
    - Mobile: hamburger + centred logo + bell + avatar
    - Desktop: page title + search + bell + avatar dropdown
    - Avatar dropdown: profile name/email, settings, logout
    - Bell badge: shows unread notification count
  - AppLayout: server-side data fetch (profile + workspace), passes to components
  - All 7 routes return 200, zero TS errors
```

### Step 6 — Dashboard
```
Status:     ✅ Complete
Commit:     step-6
Notes:      ProgressRing, TodayTasks, UpcomingDeadlines, ActivityFeed, VisionHighlight
            Mobile single-col / desktop 3-col grid, time-aware greeting
```

### Step 7 — Vision Board
```
Status:     ✅ Complete
Commit:     step-7
Notes:      DnD reorder via @dnd-kit, category filter tabs, image upload to Supabase Storage
            VisionCard context menu (edit/achieve/pause/delete), react-confetti on achieve
```

### Step 8 — Weekly Planner
```
Status:     ✅ Complete
Commit:     step-8
Notes:      Cross-day DnD, week navigation, debounced upsert, mobile day picker tabs
            Weekly intention stored at day_index=7, inline text edit on items
```

### Step 9 — Personal Task Tracker
```
Status:     ✅ Complete
Commit:     step-9
Notes:      TipTap rich text in TaskDrawer, SubtaskList CRUD, filter tabs with counts
            300ms debounced search, sort options, bulk select pill bar
```

### Step 10 — Projects
```
Status:     ✅ Complete
Commit:     step-10
Notes:      Kanban board with cross-column DnD, list view, TaskDetail drawer
            Comments thread, activity log, TipTap description, auto-save 500ms
```

### Step 11 — Realtime Collaboration
```
Status:     ✅ Complete
Commit:     step-11
Notes:      useRealtime hook subscribes to workspace:{id}:tasks channel
            BoardView wired: INSERT/UPDATE/DELETE update local state + toast on other-user events
```

### Step 12 — Notifications
```
Status:     ✅ Complete
Commit:     step-12
Notes:      useNotifications hook: realtime INSERT on notifications:{userId} channel
            Header bell dropdown: type icons, unread gold highlight, mark-all-read
```

### Step 13 — Team Management
```
Status:     ✅ Complete
Commit:     step-13
Notes:      Member list with role badges, invite modal (email+role), change role menu
            Remove member, email scaffolding in lib/email.ts (RESEND_ENABLED=false)
```

### Step 14 — Command Palette
```
Status:     ✅ Complete
Commit:     step-14
Notes:      Cmd+K global shortcut via AppShell, searches tasks/projects/visions (ilike)
            Arrow-key navigation, recent items in localStorage, lazy-loaded via next/dynamic
```

### Step 15 — Settings
```
Status:     ✅ Complete
Completed:  2026-06-08
Commit:     step-15
Notes:      Profile section: update full_name, upload avatar → Supabase Storage (avatars bucket)
            Workspace section: update name, upload logo → workspace-logos bucket (owner only)
            Notification prefs: 5 toggles saved to profiles.notif_prefs column (auto-save)
            Danger zone: Delete Account button (contact support flow)
            Zero TypeScript errors
```

### Step 16 — Landing Page
```
Status:     ✅ Complete
Commit:     d3766f1
Notes:      Hero, Features, How it works, Testimonials, CTA, Footer
```

### Step 17 — PWA Setup
```
Status:     ✅ Complete
Commit:     101c5d3
Notes:      Icons generated, manifest start_url fixed, offline/online toast in AppShell
```

### Step 18 — Capacitor Android Setup
```
Status:     ✅ Complete
Commit:     048f020
Android folder generated: yes (locally, excluded by .gitignore)
Capacitor version: 6.1.0
Notes:      capacitor.config.ts + privacy policy page, server.url fallback fixed
```

### Step 19 — Resend Email Scaffolding
```
Status:     ✅ Complete
Commit:     1a7883a (built as part of step-13)
Notes:      lib/email.ts scaffolding in place
RESEND_ENABLED: false
```

### Step 20 — Final QA
```
Status:     ✅ Complete
Commit:     fc994ee
Notes:      Lint errors fixed, npm run build passes clean
Build output: ✓ Compiled successfully, 21/21 static pages generated
TypeScript errors: 0 (npx tsc --noEmit clean)
Mobile tested: per step checklists
```

---

### Step 21A — Project Collaboration Security Foundation
```
Status:     ✅ Complete (database-first foundation only — no invite/approval UI yet)
Started:    2026-07-09
Completed:  2026-07-09
Commit:     (uncommitted)

WHAT WAS BUILT
  - New migration: supabase/migrations/018_project_collaboration_security.sql
    - Tables: project_members, project_invites, project_access_requests, audit_events
    - tasks: added deleted_at, deleted_by, delete_reason (soft delete) and
      version, updated_by (versioning, auto-bumped by trigger on every update)
    - RLS helper functions: is_workspace_admin, project_role, is_project_member,
      project_workspace_id, can_view_project, can_manage_project,
      can_edit_project_content, can_comment_on_project (all SECURITY DEFINER,
      STABLE, fixed search_path — avoids RLS recursion)
    - Trigger: new projects auto-insert their creator into project_members as
      owner/active (handle_new_project + trg_project_created_owner)
    - Backfill: existing projects got their creator inserted as owner where missing
    - Generic audit trigger (log_audit_event) wired to projects, project_members,
      project_invites, project_access_requests, tasks, task_comments — strips
      token_hash from logged payloads as defense in depth
    - RLS tightened: projects/columns/tasks/task_comments no longer trust bare
      workspace membership — they now check can_view_project /
      can_edit_project_content / can_manage_project / can_comment_on_project.
      Personal tasks (is_personal = true) still gated on created_by only, unchanged.
    - Realtime: project_members, project_access_requests, audit_events added to
      supabase_realtime publication via an idempotent DO block
  - lib/permissions/projectPermissions.ts — typed helpers mirroring the DB rules:
    canManageProject, canEditProjectContent, canCommentOnProject,
    canViewAuditTrail, canDeleteTask(role, isCreator). No `any` types.
  - types/index.ts — added ProjectRole, ProjectMemberStatus, ProjectInviteRole,
    ProjectAccessRequestStatus, ProjectMember, ProjectInvite,
    ProjectAccessRequest, AuditEvent; Task gained deleted_at/deleted_by/
    delete_reason/version/updated_by
  - app/(app)/projects/[id]/page.tsx — now fetches the current user's
    project_members role for the project and passes it as `projectRole` to
    BoardView and ListView
  - components/projects/BoardView.tsx, ListView.tsx, BoardColumn.tsx — accept
    an optional projectRole/canEdit prop and hide add-task / drag-move /
    toggle-done affordances for viewers and commenters (RLS is the real
    backstop; this is just UX, not the security boundary)
  - app/(app)/projects/page.tsx — project creation now verifies (instead of
    assuming) that the owner-membership trigger ran, and toasts if it didn't

WHAT IS NOW SECURE
  - Project visibility, editing, commenting, and management are enforced in
    Postgres RLS by project-level role, not by blanket workspace membership
  - Workspace owner/admin retain override access to manage projects in their
    workspace even without an explicit project_members row
  - All collaboration-table writes and task/comment/project mutations are
    audit-logged with actor, before/after state, and no raw secrets
  - Personal tasks remain creator-only regardless of project membership

WHAT IS NOT BUILT YET (Step 21B)
  - No UI to create/share/revoke project invite links
  - No UI to request access, or to approve/reject pending requests
  - No UI to view/manage the project_members list (add/remove/change role)
  - No audit trail viewer UI
  - No token generation/hashing/redemption logic (project_invites.token_hash
    has no producer or consumer yet — schema only)
  - useProjects.ts / useTasks.ts hooks are still empty stubs; project pages
    still query Supabase directly

TESTING
  - npm run lint            → ✅ no warnings or errors
  - npx tsc --noEmit        → ✅ zero errors
  - npm run build           → ✅ compiled clean, 21/21 static pages
  - Migration SQL reviewed manually for balanced blocks/dependency order
    (helper functions defined before first use, triggers after their
    functions); could not run against live Supabase from this environment —
    NOT YET APPLIED to the Supabase project. Run it via the Supabase SQL
    editor or CLI before Step 21B depends on these tables.
```

---

### Step 21A — Live verification (post-migration-018)
```
Date:       2026-07-09
Method:     No projects existed yet in production (0 rows), so backfill/visibility
            couldn't be checked against real historical data. Instead: signed in
            as the two real users (Marvin — workspace "Marvin"; Shafica Boyce —
            workspace "Regalbay Property Management") via Supabase admin-generated
            sessions, and drove the exact REST calls the app makes (same effect as
            clicking through the UI, verified against real RLS). Created temporary
            test projects/tasks to exercise the full flow, then deleted all of it —
            production DB confirmed back to its exact pre-test state afterward.

CONFIRMED WORKING
  - New tables/columns from 018 all present live (project_members, project_invites,
    project_access_requests, audit_events; tasks.deleted_at/deleted_by/
    delete_reason/version/updated_by)
  - Owner-membership trigger: inserting a project (via service role, simulating
    the still-broken user path — see issues below) auto-creates a project_members
    owner/active row every time
  - RLS correctly enforced for the *existing* helper-function-based policies:
    can_view_project, can_manage_project, can_edit_project_content,
    can_comment_on_project all evaluated correctly for the real owner (Marvin)
    across SELECT/UPDATE on projects, INSERT on columns, INSERT on project_invites
  - Project tasks: create/load/update all work; version bumped 1→2 on update by
    trg_bump_task_version; updated_by correctly set to the acting user
  - Personal tasks unaffected — still create/load fine for the creator
  - task_comments insert works for a commenting-capable role
  - audit_events captures actor_id correctly for real authenticated actions
    (was NULL only for the two rows made via service role during setup, as
    expected — service role has no auth.uid())
  - Cross-user isolation (item 7): Shafica — a real user in a completely
    separate workspace — could see ZERO rows across projects, project_members,
    audit_events, tasks, and task_comments for Marvin's test project. Confirmed
    both by direct id lookup and by listing everything she can see.
  - Workspace-owner override path (is_workspace_admin) works as designed

ISSUES FOUND (both pre-existing, not introduced by 018 — see Known Issues #4/#5)
  - #4 HIGH: the projects INSERT policy ("Workspace members can create
    projects") rejects every authenticated insert with a 42501 RLS error, even
    for a real workspace member inserting into their own workspace_id. Isolated
    by testing: personal-task insert, project_invites insert, and
    workspace_members self-insert all succeeded fine for the same user/session —
    only the projects INSERT is broken. Root cause not confirmed (no raw SQL/
    psql access from this environment to inspect pg_policies directly), but the
    fix is safe either way: drop + recreate the policy verbatim.
  - #5 MEDIUM: deleting a project throws a foreign-key violation from
    audit_events, because cascading child deletes (project_members, tasks) try
    to log audit rows referencing the parent project after it's already gone
    from the transaction's view.
  - Fix for both is written in supabase/migrations/019_step21a_verification_fixes.sql
    — NOT YET APPLIED. Needs to be run before Step 21B (invite/approval UI) or
    before anyone tries to create a real project.

NOT YET RE-VERIFIED (blocked on 019 being applied)
  - Real backfill check against actual historical data (moot — no projects
    existed pre-018 to backfill; the backfill INSERT ... WHERE NOT EXISTS logic
    was reviewed and is correct, just untested against real rows)
  - End-to-end project creation through the actual UI (blocked by issue #4)
```

---

### Step 21A — Re-verification (post-migration-019)
```
Date:       2026-07-09
Method:     Same approach as before (real user sessions via Supabase admin-
            generated magic links, driving real REST calls against production).

ITEM 1 (workspace member creates a project) — STILL FAILING
  019's drop+recreate of the projects INSERT policy used the exact same raw
  subquery it always had. Re-tested 4 ways (supabase-js, raw fetch, minimal
  payload, full payload) — identical 42501 error every time. This is the ONLY
  policy left anywhere in the schema using a raw, unwrapped subquery against
  workspace_members from within a different table's RLS check; every other
  policy that needs "is this user in this workspace" goes through a
  SECURITY DEFINER function (is_workspace_admin, can_view_project, etc.),
  which sidesteps workspace_members' own self-referential SELECT policy
  entirely. That combination — a self-referential RLS policy queried as a
  nested subquery from another table's check — is a known Postgres/RLS
  trouble spot, and is the most likely explanation, though it couldn't be
  confirmed with certainty without raw pg_policies access (still unavailable
  from this environment). New fix: supabase/migrations/020_fix_project_insert_policy.sql
  adds is_workspace_member() (identical pattern to is_workspace_admin) and
  points the policy at it instead. NOT YET APPLIED.

ITEMS 2–9, 11 — all re-verified successfully, using a service-role-seeded
project as a workaround for item 1 still being broken (everything AFTER
creation — membership, visibility, columns, tasks, updates, version bump,
updated_by, personal tasks, comments, member/invite/access-request audit
logging, cross-user isolation on a second, fully-unrelated project — was
driven by the real users' own sessions, not service role):
  2. ✅ owner/active project_members row auto-created
  3. ✅ creator sees the new project
  4. ✅ creator creates columns and tasks
  5. ✅ creator updates and moves tasks
  6. ✅ version incremented 1 -> 2 -> 3 across two updates
  7. ✅ updated_by set to the acting user both times
  8. ✅ personal tasks still work, isolated from project tasks
  9. ✅ audit_events logged for every entity/action tested: projects INSERT,
     tasks INSERT/UPDATE, task_comments INSERT, project_members INSERT/UPDATE,
     project_invites INSERT/UPDATE, project_access_requests INSERT/UPDATE —
     10/10 combinations present, actor_id correctly populated for every
     real-user action
  11. ✅ cross-user isolation re-confirmed on a fresh, fully-unrelated project:
     the other user saw zero rows across projects/project_members/tasks/
     task_comments/audit_events — both by direct id lookup and by listing.
     (Sanity check: that same other user WAS correctly able to see the main
     test project once explicitly added to its project_members — proving
     visibility isn't just "broken for everyone", it's role-based as designed.)

ITEM 10 (delete no longer FK-violates) — FIXED, but surfaced a new gap (#6)
  Re-tested via service-role delete (RLS-bypassing, the same way the original
  bug was found) on two different projects — one with only columns/tasks/
  comments, one with members/invites/access_requests/comments too. Both
  deleted cleanly with no FK error. 019's fix to log_audit_event() works.
  However: the FIRST delete attempt (through the real users' own authenticated
  sessions, as the actual app would do it) silently affected 0 rows and left
  the projects in place — because there is no RLS DELETE policy on `projects`
  for the authenticated role at all. This isn't something 018/019 broke; it
  never existed. Logged as Known Issue #6 — needs a product decision (who's
  allowed to delete a project — owner only? owner+manager?) before Step 21B
  ships any delete UI.

ITEM 12 (DB returned to pre-test state) — YES, WITH ONE SERIOUS CAVEAT
  A cleanup script used `.ilike('name', '__%')` meaning to match test data
  prefixed with a literal "__", but `_` is a SQL wildcard for "any one
  character" — so `__%` matched every workspace name, including the two real
  ones, and deleted them via the service-role client. Caught immediately with
  a full row-count audit across all 15 tables right after (only workspaces
  and workspace_members were affected — everything else was correctly empty,
  matching pre-test state). Restored both workspaces and their
  workspace_members rows using the exact id/name/owner_id/role/joined_at
  values captured earlier in this same conversation. Two fields could not be
  restored exactly since they'd never been read before deletion: `slug`
  (reconstructed as a reasonable guess) and `created_at`/`updated_at` (now
  stamped at restoration time, ~2026-07-09, instead of the true original
  dates, ~2026-06-08/09). Full details in Known Issue #7 — Marvin should
  double-check Settings → Workspace for both workspaces.

BOTTOM LINE
  Step 21A's schema, triggers, and RLS logic (everything EXCEPT the one
  pre-existing projects-INSERT policy) are confirmed correct and safe on live
  Supabase. Project creation through the real app is still blocked pending
  020. Do not proceed to Step 21B until 020 is applied and item 1 passes.
```

---

### Step 21A — Re-verification (post-migration-020)
```
Date:       2026-07-09
Method:     Same real-user-session approach as before. This time, cleanup
            discipline was tightened per explicit instruction: every row
            created during the test is tracked in an exact-id ledger as it's
            created, and cleanup only ever deletes `.eq('id', <exact id from
            ledger>)` — no `ilike`, no name-based matching, no wildcards
            anywhere in the script. workspaces/workspace_members were only
            ever read (never written) this round.

ITEM 1 (workspace member creates a project) — STILL FAILING, THIRD ATTEMPT
  020 replaced the raw-subquery policy with an is_workspace_member()
  SECURITY DEFINER function — the same pattern used successfully by every
  other policy in the schema. Re-tested via a real authenticated insert:
  identical 42501 "new row violates row-level security policy for table
  projects" error, byte-for-byte the same as before 020.

  Because the exact same failure now persists across two structurally
  different policy definitions (raw subquery in 019, SECURITY DEFINER
  function in 020), the policy's own logic is very unlikely to still be the
  cause. Something else is blocking every INSERT into `projects`
  unconditionally — candidates include a stray RESTRICTIVE policy, the old
  policy not actually having been replaced (e.g. a duplicate under a
  different name still in effect), or a base privilege issue — none of which
  can be told apart without direct SQL introspection, which isn't available
  from this environment (no psql/DB connection string, only the PostgREST
  API via anon/service-role keys).

  STOPPING the guess-a-new-fix cycle here rather than trying a 4th blind
  fix. Needs one read-only diagnostic from Marvin before continuing — exact
  query is in Known Issue #4.

  Since the insert failed at the very first step, NOTHING else in this
  round's items 2-9 could be tested (they all depend on a project existing)
  and the script aborted immediately and cleanly.

ITEM 10 (DB returned to pre-test state) — trivially true, nothing to clean up
  Pre-test snapshot: 2 workspaces, 2 workspace_members, 0 projects, 0 tasks.
  Post-test snapshot: identical, byte-for-byte — 2 workspaces (same ids,
  names, slugs, owner_ids, plan, logo_url), 2 workspace_members (same ids/
  roles), 0 projects, 0 tasks, 0 of everything else. Zero writes occurred
  against workspaces or workspace_members this round (read-only queries
  only). No service-role delete ran against any table — the ledger of
  created rows was empty because creation itself failed.

WORKSPACE SLUG CHECK (requested)
  Read directly from the DB (not yet re-checked in the app UI — Marvin
  should confirm in Settings):
    - "Marvin" workspace: slug = "marvin"
    - "Regalbay Property Management" workspace: slug = "regalbay-property-management"
  Both are the reconstructed values from the incident during the previous
  round (the true original slugs were never read before that accidental
  deletion, so these are best-effort guesses, not confirmed originals).

BOTTOM LINE
  Do not proceed to Step 21B. Project creation is still completely broken
  in production after 3 fix attempts. No real data was touched this round —
  confirmed clean before and after. Need Marvin to run the diagnostic query
  in Known Issue #4 and share the output before attempting another fix.
```

---

### Step 21A — Root cause found and fixed (final)
```
Date:       2026-07-09
Method:     A sequence of increasingly targeted read-only diagnostics run by
            Marvin in the Supabase SQL editor, each ruling out one layer:

  1. `pg_policies` for `projects` — confirmed exactly one INSERT policy, no
     stray RESTRICTIVE policies, pointing at is_workspace_member(workspace_id)
     as expected. RLS enabled, not forced. Policy itself: innocent.

  2. `pg_proc` ownership/prosecdef check — is_workspace_member and
     is_workspace_admin both SECURITY DEFINER, owned by postgres, identical
     to the proven-working project_members-reading functions. Function
     privilege model: innocent.

  3. `pg_proc` overload check — exactly one signature per function name, no
     duplicate/overloaded versions that a positional vs. named call could
     resolve differently. Overloading: innocent.

  4. Direct RPC call (`marvin.rpc('is_workspace_member', {...})`) in the same
     session, immediately before attempting the insert — returned `true`.
     The function itself: innocent, and proven to evaluate correctly in the
     exact real-world request context.

  5. A `DO` block run directly in the SQL editor, simulating the real JWT
     via `SET LOCAL ROLE authenticated` + `request.jwt.claims`, baking
     `auth.uid()`, the function result, and the INSERT outcome into one
     RAISE EXCEPTION message (guaranteeing rollback either way) — returned
     `auth.uid=<Marvin's id> is_workspace_member=t insert_result=INSERT SUCCEEDED`.
     This was the breakthrough: the exact same insert, in a manually
     simulated session, succeeded. Postgres/RLS itself: innocent.

  6. Realized every API-layer test up to this point had requested the row
     back (`.select()` / `Prefer: return=representation`) — necessary for
     grabbing the new id for further test steps, but never isolated as a
     variable. Tested a bare raw-fetch INSERT with `Prefer: return=minimal`
     (no RETURNING): succeeded (201, row confirmed created via service-role
     check). This isolated the actual variable.

ROOT CAUSE
  Requesting `RETURNING` (via `.select()`/`return=representation`) makes
  Postgres evaluate the table's SELECT policy on the brand-new row as part
  of the same INSERT statement. That SELECT policy (`can_view_project`)
  depends on the `project_members` owner row created by the AFTER INSERT
  trigger (`trg_project_created_owner`) — and evaluating that check via
  RETURNING can race against the trigger, surfacing as a 42501 "violates
  row-level security policy" error on the INSERT itself, rather than a
  silently-empty RETURNING result. Confirmed both directions: fails with
  RETURNING requested, succeeds without it, every single time.

  019 and 020 were not wasted, but they weren't fixing this: 019's
  audit_events FK fix (issue #5) was a real, separate, correctly-diagnosed
  bug. 020's function-based rewrite of the INSERT policy wasn't the actual
  fix for issue #4, but it's a harmless, reasonable consistency improvement
  over the old raw subquery regardless, and stays in place.

FIX
  app/(app)/projects/page.tsx: project creation now pre-generates the id
  client-side (`crypto.randomUUID()`), inserts WITHOUT chaining `.select()`
  (no RETURNING requested — confirmed via lint/tsc/build), then issues a
  separate follow-up `.select('*').eq('id', projectId).single()` to load the
  created row. This sidesteps the RETURNING-vs-trigger race entirely. No
  further database migration was required for this specific bug.

FINAL VERIFICATION (mirroring the app's actual new insert pattern exactly)
  25/25 checks passing:
  1.  ✅ workspace member creates a project (pre-gen id, no RETURNING, then
      separate fetch) — this is the fix, verified working
  2.  ✅ project_members owner row auto-created
  3.  ✅ creator can view the project immediately
  4.  ✅ creator creates columns, tasks, comments; updates and moves tasks
  5.  ✅ task version incremented 1 -> 2 -> 3 across two updates
  6.  ✅ updated_by correctly set to the acting user
  7.  ✅ audit_events logged projects/project_members/tasks/task_comments
      INSERT and UPDATE actions, correct actor_id throughout
  8.  ✅ cross-user isolation: Shafica saw zero rows across projects,
      project_members, tasks, comments, and audit_events
  9.  ✅ personal tasks still work, unaffected
  10. ✅ deleting the project (with columns/tasks/comments) succeeds with no
      FK violation, confirmed actually gone from the DB
  Cleanup used only exact ids captured during this run — no ilike/wildcard/
  name-based matching anywhere. workspaces/workspace_members were read-only
  this round and confirmed byte-identical before and after.

BOTTOM LINE
  Step 21A is now fully verified and safe. All ten originally-requested
  checks pass against live production data, via real authenticated user
  sessions, with the actual application code path (not a workaround).
  Ready for Step 21B — Project Invite + Approval UI.
```

---

### Step 21A.1 — Project Archive/Delete Policy Hardening
```
Status:     ✅ Complete — migration applied, fully verified live
Started:    2026-07-09
Completed:  2026-07-09

DECISION (recorded per explicit product direction)
  Project deletion is not a normal collaboration feature. Archiving is the
  default, reversible, safe action exposed to users. Hard delete is
  restricted at the database layer to the project owner only, and is not
  exposed anywhere in the normal UI — it exists for future admin/cleanup
  tooling, not for regular use. This directly resolves Known Issue #6 (no
  DELETE policy existed on projects at all).

  Permission matrix for archive/restore/hard-delete of the PROJECT ITSELF
  (distinct from managing its content — members/invites/columns/tasks,
  which managers can still do via the existing can_manage_project()):
    - owner:      can archive, restore, hard-delete
    - manager:    cannot archive, restore, or hard-delete the project
    - editor:     cannot
    - commenter:  cannot
    - viewer:     cannot
    - workspace owner/admin: override, same pattern as can_manage_project

WHAT WAS BUILT
  - New migration: supabase/migrations/021_project_archive_hardening.sql
    - projects gains archived_at, archived_by, archive_reason
    - can_own_project(project_uuid) — owner-or-workspace-admin check, same
      SECURITY DEFINER pattern as every other permission function
    - A BEFORE UPDATE trigger (enforce_project_archive_owner_only) is the
      actual enforcement mechanism, not a second RLS policy — RLS can only
      restrict by row, not by column, and managers legitimately need to keep
      updating name/description/color/icon via the existing UPDATE policy.
      The trigger specifically watches archived_at for changes and rejects
      the update outright (RAISE EXCEPTION) unless can_own_project() is
      true. It also stamps archived_by/archived_at/status server-side
      rather than trusting whatever the client sent, and clears
      archived_by/archive_reason and resets status on restore.
    - New DELETE policy, owner-only: "Owner can hard-delete project"
    - log_audit_event() now labels projects UPDATEs that flip archived_at
      as ARCHIVE or RESTORE instead of a generic UPDATE, so the audit trail
      reads clearly
  - types/index.ts: Project gained archived_at, archived_by, archive_reason
  - lib/permissions/projectPermissions.ts: canArchiveProject(role),
    canRestoreProject(role) — both owner-only, mirroring the DB decision
  - app/(app)/projects/page.tsx: the project listing query now excludes
    status = 'archived' by default (`.neq('status', 'archived')`) — this is
    plumbing to make "archived projects don't show up normally" true, not
    an archive UI. No archive/restore/delete button exists anywhere.

NOT BUILT (by design, per explicit instruction)
  - No archive/restore/delete button or menu anywhere in the UI
  - No "view archived projects" screen
  - Steps 21B's invite/approval UI is still untouched

TESTING — live verification results (2026-07-09, post-021)
  Method: real authenticated sessions for every create/update/delete (no
  service role used for writes at all this round — service role was
  read-only, for before/after snapshots only). Cleanup used exact ids
  only, and doubled as the actual test of "owner can hard-delete" (items
  8/9) rather than a separate service-role wipe. 39/39 security-relevant
  assertions passed:

  1.  ✅ Owner can archive a project
  2.  ✅ Owner can restore an archived project
  3.  ✅ archived_by stamped server-side to the actual actor (28a9ef78...),
      not trusting any client-supplied value
  4.  ✅ status synced correctly both ways (active -> archived -> active),
      archive_reason preserved while archived and cleared on restore
  5.  ✅ Manager cannot archive — rejected with an explicit trigger error
      ("Only the project owner can archive or restore this project")
  6.  ✅ Editor cannot archive — confirmed by effect (archived_at/status
      unchanged after the attempt). Mechanism differs from #5: editor
      fails the general "Managers can update projects" RLS USING clause
      before the archive trigger ever runs, so the UPDATE matches 0 rows
      and returns success with no error, rather than raising an exception.
      Same security outcome (categorically blocked), different layer.
  7.  ✅ Viewer cannot archive — same 0-row-silent-block mechanism as editor
  8.  ✅ Manager cannot hard-delete — DELETE matched 0 rows, project
      confirmed still present afterward
  9.  ✅ Owner CAN hard-delete — proven twice: once on an isolated
      throwaway project, once on the main test project (with
      project_members/comments/tasks/columns attached, cascading cleanly
      with no FK error — reconfirms 019's fix through the real owner-only
      DELETE path rather than service role)
  10. ✅ Archived project excluded from a `.neq('status','archived')`
      query, still returned by an explicit `.eq('status','archived')` query
  11. ✅ audit_events labels the archive action ARCHIVE (not generic UPDATE)
  12. ✅ audit_events labels the restore action RESTORE
  13. ✅ Manager CAN still edit ordinary fields (tested: description) while
      holding manager role — confirms the trigger only intercepts
      archived_at changes, not the general update policy
  14. ✅ Cross-user isolation intact on a fresh, fully unrelated project:
      Shafica couldn't see it, archive it, or delete it
  15. ✅ Personal tasks unaffected — created, loaded, and cleaned up
      normally via the creator's own session
  16. ✅ DB returned to pre-test state — 0 projects, 0 tasks, 0
      project_members, workspaces/workspace_members byte-identical
      before/after (read-only this round, never written to)

  npm run lint / npx tsc --noEmit / npm run build were all already
  confirmed clean before requesting migration application.
```

---

### Step 21B — Project Invite Link + Approval UI
```
Status:     ✅ Complete — migrations applied, fully verified live
Started:    2026-07-09
Completed:  2026-07-09

PRODUCT RULE (as directed)
  An invite link does NOT grant access by default. Flow is always:
  open link -> sign in -> explicit "Request Access"/"Join" click -> (if
  approval_required) owner/manager approves -> membership granted. Even
  the approval_required=false "auto-approve" case still requires an
  explicit click on the landing page — never fires from merely loading
  the URL (deliberately, so link-preview bots/crawlers can't consume it).

WHAT WAS BUILT
  - supabase/migrations/022_project_invite_approval_ui_support.sql
    - FIX (real bug, not just a gap): the Step 21A UPDATE policy on
      project_access_requests had no WITH CHECK, so Postgres reused USING
      as the check — a requester could update their own row straight to
      status='approved', self-approving. Latent until this step adds an
      approval-triggered auto-membership grant, at which point it becomes
      a real privilege escalation. Fixed: only owner/manager may move a
      request to approved/rejected; self-service INSERT is now forced to
      status='pending'.
    - enforce_project_member_rules() trigger: manager can no longer change
      an owner's role or remove an owner; no operation can ever leave a
      project with zero active owners. Also stamps removed_at/removed_by
      server-side on soft-delete (status -> 'removed').
    - handle_access_request_approval() trigger: approving a request is a
      single UPDATE (status='approved') — the trigger atomically
      provisions project_members and increments the invite's used_count,
      instead of the client doing 2-3 separate writes that could partially
      fail.
    - validate_project_access_request() trigger: defense-in-depth check
      that a request's invite_id (if any) is real, matches the project,
      and is still valid — independent of what inserted the row.
    - get_invite_status(token_hash) — SECURITY DEFINER RPC, callable by
      signed-out visitors, returns only safe preview fields (project name/
      icon/color, default_role, approval_required, validity status).
      Never returns token_hash.
    - redeem_project_invite(token_hash) — SECURITY DEFINER RPC, requires
      auth.uid(). The only path that turns a valid invite into a pending
      request or (approval_required=false only) actual membership.
      Re-validates everything server-side regardless of what the preview
      showed.
  - supabase/migrations/023_fix_owner_removal_on_project_delete.sql
    - Found during live verification: 022's owner-protection trigger also
      fires on the CASCADE delete of project_members when a project itself
      is deleted, and blocked it as "removing the last owner" — regressing
      021's owner-hard-delete. Fixed by checking whether the parent project
      row still exists before enforcing the owner rules (same technique as
      019's audit_events cascade fix).
  - lib/invites/projectInvites.ts — generateInviteToken (Web Crypto
    getRandomValues, 256 bits), hashInviteToken (Web Crypto SHA-256),
    createProjectInvite, revokeProjectInvite, getInviteByToken,
    redeemProjectInvite. No raw token is ever logged or sent anywhere
    except embedded in the URL the creator copies themselves.
  - components/projects/ProjectShareModal.tsx — tabbed (Invite Link /
    Requests / Members) modal, owner+manager only. Create invite (role,
    approval toggle defaulting true, expiry, max uses), one-time copyable
    link display, revoke, small recent-activity feed from audit_events.
  - components/projects/ProjectAccessRequests.tsx — pending request list,
    approve/reject with optional review note.
  - components/projects/ProjectMembersPanel.tsx — active member list,
    role change, remove (soft delete) — UI hides actions the DB would
    reject anyway (canModifyMemberRow mirrors the DB trigger).
  - app/invite/project/[token]/page.tsx — handles every state: not signed
    in (preview + sign in/up CTA), invalid/revoked/expired/max-used,
    already a member (read-only pre-check, no click needed), pending
    request already exists, and the explicit request/join action.
  - middleware.ts — /invite/* made public so the preview screen renders
    before sign-in.
  - components/auth/LoginForm.tsx + SignupForm.tsx — now respect a
    redirectTo query param (Google OAuth path too, via /auth/callback's
    existing next param) so signing in from an invite link returns you to
    it. app/(auth)/login and signup page.tsx wrapped in Suspense — required
    by Next.js for useSearchParams() in a statically-prerendered page,
    caught by npm run build.
  - lib/permissions/projectPermissions.ts — canManageInvites,
    canReviewAccessRequests, canModifyMemberRow (mirrors DB trigger rules).

NOT BUILT (deliberate scope cuts, not oversights)
  - Notifications for request/approval/rejection: the notifications table's
    type column is CHECK-constrained to 5 existing values with no room for
    an access-request type. Adding one needs its own migration; left as a
    clean TODO rather than shoehorned into an existing type or faked.
  - Ownership transfer: the member role-change dropdown excludes 'owner' —
    transferring ownership is a bigger, separate decision than a role edit.
  - redirectTo isn't carried through email/password signup's email-
    confirmation step (only through Google OAuth and password login) —
    would require touching more of the shared auth/check-email flow than
    this step's scope justified.
  - Full audit-trail page — a small "recent activity" list lives inside
    the share modal instead, per "do not overbuild."

LIVE VERIFICATION (real authenticated sessions throughout; service role
used only for read-only snapshots and for deleting project_invites/
project_access_requests rows this test created — those two tables have no
DELETE policy for any role, same as the rest of the schema; every actual
project delete went through the owner's own real session, which is also
what exercises item 9 for real):
  A.  ✅ owner creates invite link
  B.  ✅ raw token is NOT stored — token_hash confirmed to be the SHA-256
      digest, not the raw token; checked the full invite row AND the
      audit_events entries for it, raw token absent from both
  C.  ✅ invite link opens — preview RPC succeeds for a true anonymous
      client (no session at all), returns only safe fields
  D.  ✅ unsigned visitor's redeem attempt is rejected outright ("Must be
      signed in to redeem an invite")
  E.  ✅ signed-in user can request access (approval_required=true ->
      pending_created)
  F.  ✅ owner/manager can see the pending request
  G.  ✅ owner/manager can approve
  H.  ✅ approved user becomes an active project_members row with the
      correct role; used_count incremented at approval time, not request
      time
  I.  ✅ approved user can now SELECT the project
  J.  ✅ rejected user gets no project_members row and still can't see
      the project (separate project, since a user can only have one
      access-request row per project)
  K.  ✅ revoked link's preview shows revoked; redeem attempt returns
      invalid/revoked
  L.  ✅ same for an expired link (expires_at in the past)
  M.  ✅ same for a maxed-out link (used_count >= max_uses)
  N.  ✅ viewer, commenter, and editor are each rejected by RLS attempting
      to create an invite (42501); manager, in contrast, succeeds —
      confirming the restriction is role-scoped, not a blanket failure
  O.  ✅ cross-user isolation on a fresh, fully unrelated project: can't
      list its invites, can't list its access requests, can't see the
      project itself. (The preview RPC does work for a non-member — by
      design, invite links must be previewable before you have any
      relationship to the project — but it reveals only the same safe
      fields, never token_hash or anything else.)
  P.  ✅ audit_events covers project_invites INSERT/UPDATE, project_access_
      requests INSERT/UPDATE, and project_members INSERT (the approval-
      triggered one)
  Q.  ✅ cleanup used only exact ids captured during the run — no ilike,
      no wildcards, no name-pattern matching, no service-role delete
      against any table with an owner-scoped DELETE policy. First pass hit
      the 022 cascade bug (see above); after 023, full retry succeeded and
      the database was confirmed byte-identical to its pre-test state:
      0 projects, 0 project_members, 0 project_invites, 0
      project_access_requests, workspaces/workspace_members unchanged.

  TOTAL: 55/55 checks passing (42 in the first pass + 13 confirming the
  023 fix and completing cleanup).

BOTTOM LINE
  Step 21B is complete and safe. RLS was tightened during this step (one
  real privilege-escalation bug fixed, one real gap closed) and never
  weakened — no client code uses the service role, and no RLS policy was
  bypassed to make anything work.
```

---

## 🚧 KNOWN ISSUES

| # | Issue | Step | Severity | Status |
|---|---|---|---|---|
| 1 | Realtime board: postgres_changes INSERT filter compared `tasks.project_id` to the workspace ID (always false), so live "new task" updates/toasts never fired for teammates | 11 | Medium | ✅ Fixed |
| 2 | Team invite: profile lookup by email used `.single()` (errors on 0 rows) instead of `.maybeSingle()` for an expected-optional result | 13 | Low | ✅ Fixed |
| 3 | `public/sw.js` and `public/workbox-*.js` (generated by next-pwa at build time) were untracked and risked being committed as stale build artifacts | 17 | Low | ✅ Fixed (added to .gitignore) |
| 4 | **RESOLVED.** Live production DB: the `projects` INSERT rejected every attempt with a 42501 RLS error, even for a valid workspace member. Root cause was never the RLS policy — three diagnostics proved the policy, the `is_workspace_member()`/`is_workspace_admin()` functions, `auth.uid()` resolution, and even a raw SQL insert via a simulated JWT context all worked correctly (`is_workspace_member` returned `true` via direct RPC call, and a manual `INSERT` in a rolled-back transaction succeeded). The actual bug: Postgres's `RETURNING` clause (triggered by `.select()` in supabase-js / `Prefer: return=representation`) evaluates the table's SELECT policy on the brand-new row, and that check can race against the `AFTER INSERT` trigger that creates the `project_members` owner row the SELECT policy depends on — confirmed empirically: the exact same insert succeeds with `Prefer: return=minimal` (no RETURNING) and fails with `return=representation`, every single time, both ways, reproducibly. **Fix:** `app/(app)/projects/page.tsx` now pre-generates the project id client-side (`crypto.randomUUID()`), inserts without chaining `.select()` (no RETURNING requested), then does a separate follow-up `SELECT` to load the created row. No further database migration was needed for this specific bug — 019 and 020 turned out not to be the fix, but 019's audit fix (#5) was real and independent, and 020's function-based policy is a harmless, reasonable improvement over the old raw subquery either way. **Verified end-to-end: 25/25 checks passing**, including this exact creation flow through a real authenticated session. | 21A verification | ~~High~~ | ✅ Fixed and verified (root cause: app-code RETURNING race, not RLS) |
| 5 | Live production DB: deleting a project threw `insert or update on table "audit_events" violates foreign key constraint "audit_events_project_id_fkey"`. Fixed by 019 — confirmed via service-role delete (RLS bypassed, matching how the bug was originally found) that both a project with children and one with members/invites/access_requests/comments now delete cleanly with no FK error. **Fixed and verified.** | 21A verification | Medium | ✅ Fixed and verified |
| 6 | Live production DB: there is no RLS DELETE policy on `projects` for the `authenticated` role at all — not added by 018, and never existed in 013/000 either. A real user's delete (even the project owner) silently affects 0 rows (no error, just doesn't delete) because RLS default-denies with no matching policy. Only discovered because service-role deletes (which bypass RLS) were used to verify issue #5. Not part of the original Step 21A spec (which only specified view/insert/update authorization), but flagging since "who can delete a project" needs an explicit answer before Step 21B ships a delete button. | 21A verification | Medium | ⬜ Not fixed — needs a product decision (who can delete a project?) before adding the policy |
| 7 | **Incident (self-inflicted, during verification cleanup):** a cleanup script used `.ilike('name', '__%')` intending to match test-data names starting with a literal double-underscore. In SQL `LIKE`/`ILIKE`, `_` is a single-character wildcard, not a literal — so `__%` matched *any* name of 2+ characters, including both real workspaces ("Regalbay Property Management" and "Marvin"), and the script deleted them via the service-role client (bypasses RLS). **Caught immediately** via a full row-count audit across every table right after. Restored both workspaces and their workspace_members rows with their exact original `id`, `name`, `owner_id`, `role`, and `joined_at` (all captured earlier in the same session from prior read-only queries) — full audit confirmed no other table was affected (projects/tasks/etc. were all correctly empty before and after, matching pre-verification state). **Two fields could not be restored exactly** because they were never read before deletion: `workspaces.slug` (guessed as `regalbay-property-management` / `marvin`) and `workspaces.created_at`/`updated_at` (now stamped at restoration time instead of the true original creation date, ~2026-06-08/09). `logo_url` and `plan` were restored as `null`/`'free'`, which matches what every prior query showed. Marvin should check Settings → Workspace for both workspaces to confirm name/logo look right, and mention it if the slug is used anywhere (e.g. a shareable link) that depended on its exact original value. | 21A verification | **High (data)** | ✅ Restored (see caveats above) |
| 8 | **Privilege escalation (found and fixed before ever being exploitable):** the Step 21A UPDATE policy on `project_access_requests` had `USING (user_id = auth.uid() OR can_manage_project(project_id))` with no `WITH CHECK`. Postgres reuses `USING` as the check when none is given, so a requester could update their own row and set `status = 'approved'` directly — self-approving. Harmless in isolation (nothing consumed that status transition yet), but Step 21B adds a trigger that auto-grants `project_members` on approval, which would have turned this into a real, exploitable escalation. Fixed in migration 022 before that trigger went live: self-service UPDATE removed entirely (only owner/manager can move a request to approved/rejected), and INSERT now forces `status = 'pending'` so a request can never be created already-approved either. | 21B | **High** | ✅ Fixed in 022, verified live |
| 9 | Migration 022's `enforce_project_member_rules()` trigger fires on the cascading delete of `project_members` when a project is deleted, and its "don't remove the last owner" check couldn't tell that apart from a standalone removal — briefly regressing 021's owner-hard-delete (blocked with "Cannot remove the last active owner of a project" for every project, no exceptions). Found immediately during Step 21B's live verification (4 test-cleanup deletes failed). Fixed in migration 023 by checking whether the parent project row still exists before enforcing the owner rules — same technique as the 019 audit_events cascade fix. Re-verified: owner hard-delete works normally again. | 21B | Medium | ✅ Fixed in 023, verified live |

---

## 🔑 ENVIRONMENT CHECKLIST

| Item | Status | Value |
|---|---|---|
| Supabase URL | ✅ | https://khcpvjtphzidwzbhtayh.supabase.co |
| Supabase Anon Key | ✅ | eyJhbGci...bAAk (in .env.local) |
| Supabase Service Role Key | ✅ | eyJhbGci...Kgs8 (in .env.local) |
| Resend API Key | ⬜ | Not set — RESEND_ENABLED=false until added |
| Google OAuth Client ID | ⬜ | Configure in Supabase Auth dashboard |
| Vercel deployment URL | ⬜ | Set after first deploy |
| GitHub repo connected | ✅ | https://github.com/shaficajansen96-beep/MyReality |

---

## 📦 DEPLOYMENT STATUS

| Environment | URL | Status | Last deployed |
|---|---|---|---|
| Local | http://localhost:3001 | ✅ Running | 2026-06-08 |
| Supabase | https://khcpvjtphzidwzbhtayh.supabase.co | ✅ Project active | — |
| GitHub | https://github.com/shaficajansen96-beep/MyReality | ✅ Repo ready | — |
| Vercel (production) | — | Not deployed yet | — |
| Android APK | — | Not built yet | — |

---

## 🗒️ SESSION LOG

| Date | Steps worked on | Outcome |
|---|---|---|
| 2026-06-08 | Step 1 | Complete — Next.js + all packages + folder structure + design tokens |
| 2026-06-08 | Step 2 | Complete — all TypeScript types written, zero errors |
| 2026-06-08 | Step 3 | Complete — 11 tables + RLS + storage bucket verified in Supabase |
| 2026-06-08 | Steps 6–15 | Complete — all core app features built and committed |
| 2026-06-10 | Audit | Full audit (tsc/lint/build all clean). Fixed broken realtime task-insert filter, `.single()` -> `.maybeSingle()` on team invite lookup, gitignored generated PWA service worker files. Updated stale step 16-20 notes. |
| 2026-07-09 | Step 21A | Complete — project_members/invites/access_requests/audit_events schema, RLS lockdown, permission helpers, minimal role wiring into board/list views. Migration not yet applied to live Supabase. |
| 2026-07-09 | Step 21A verification | Migration 018 applied by Marvin. Verified live: new schema, trigger, RLS, personal tasks, cross-user isolation, audit logging all correct. Found 2 pre-existing bugs blocking real usage: projects INSERT policy rejects everyone (High), project deletion FK-violates on audit_events (Medium). Fixes written in 019_step21a_verification_fixes.sql, not yet applied. All test data created during verification was cleaned up; DB confirmed back to pre-test state. |
| 2026-07-09 | Step 21A re-verification | Migration 019 applied by Marvin. Re-verified: 019 fixed the delete FK violation (confirmed) but did NOT fix the projects INSERT policy — still 42501 on every insert, reproduced 4 ways. New root-cause hypothesis + fix in 020_fix_project_insert_policy.sql (not yet applied). Items 2-9, 11 all re-verified passing (36/38 checks). New gap found: no DELETE policy on projects for authenticated role at all (Known Issue #6, needs a product decision). **Incident**: a cleanup script's `.ilike('name','__%')` wildcard bug deleted both real workspaces via the service-role client; caught immediately via full-table audit, restored both workspaces + workspace_members with original ids/names/owners/roles/timestamps captured earlier in-session. slug and created_at/updated_at could not be restored exactly (see Known Issue #7) — Marvin should check Settings → Workspace for both. |
| 2026-07-09 | Step 21A re-verification (3rd pass) | Migration 020 applied by Marvin. Project creation is STILL broken — identical 42501 error, now the third consecutive fix attempt to fail the same way. Since two structurally different policy definitions (raw subquery, then SECURITY DEFINER function) both fail identically, root cause is very likely NOT the policy logic itself. Stopped guessing further; need Marvin to run a read-only `pg_policies` diagnostic query (given in Known Issue #4) before another attempt. Cleanup discipline tightened this round per explicit instruction — exact-id ledger only, no ilike/wildcards; since item 1 failed immediately, nothing was created and nothing needed cleanup. Confirmed via full snapshot: workspaces/workspace_members completely untouched (read-only this round), DB state identical before and after. |
| 2026-07-09 | Step 21A — root cause found, fixed, fully verified | Marvin ran a sequence of read-only diagnostics (pg_policies, pg_proc ownership, pg_proc overloads, direct RPC call, a rolled-back DO block simulating the real JWT) that progressively ruled out the policy, the functions, their ownership, overloading, and even Postgres/RLS itself — a manual insert in the simulated session succeeded. That isolated the real variable: every prior test had requested `RETURNING` (`.select()`), and `RETURNING` races the AFTER INSERT trigger's SELECT-policy dependency. Confirmed by testing `Prefer: return=minimal` (no RETURNING): succeeded immediately. Fixed in app/(app)/projects/page.tsx — pre-generate id client-side, insert without `.select()`, separate follow-up fetch. No further migration needed. Re-verified all 10 originally-requested items end-to-end using the app's real new insert pattern through real authenticated sessions: **25/25 checks passing.** Step 21A is now fully safe. Ready for Step 21B. |
| 2026-07-09 | Step 21A.1 — archive/delete hardening, built and fully verified | Built per explicit decision: archiving is the default reversible action, hard delete is owner-only and not exposed in the UI. Migration 021 adds archived_at/archived_by/archive_reason, can_own_project(), a BEFORE UPDATE trigger enforcing owner-only archive/restore (managers keep general edit rights), an owner-only DELETE policy (resolves Known Issue #6), and ARCHIVE/RESTORE audit labeling. Applied by Marvin, then verified live using only real authenticated sessions for every write (service role was read-only this round) — cleanup doubled as the actual "owner can hard-delete" test rather than a separate wipe. **39/39 security-relevant checks passed.** Two test-script assertions initially read as failures (editor/viewer archive attempts) turned out to be a false negative in the test's expectations, not a security gap: editor/viewer are blocked one layer earlier (the general update policy silently matches 0 rows) rather than by the trigger's explicit exception (which is what blocks manager) — same outcome, different mechanism. No real workspace/user records touched. Step 21A.1 is safe. Ready for Step 21B. |
| 2026-07-09 | Step 21B — invite/approval UI, built and fully verified | Built the full invite-link + approval + member-management system: ProjectShareModal, ProjectAccessRequests, ProjectMembersPanel, the /invite/project/[token] landing page, and lib/invites/projectInvites.ts (client-side Web Crypto token generation/hashing — only SHA-256 hash ever reaches the DB). Reviewed RLS before writing UI code per instruction and found a real one: the Step 21A access-request UPDATE policy had no WITH CHECK, letting a requester self-approve — harmless until this step's approval-triggered auto-membership grant would have made it exploitable. Fixed in migration 022 before that trigger went live. Also added owner-protection on project_members (manager can't touch an owner's row, no path to zero owners) and two SECURITY DEFINER RPCs (get_invite_status, redeem_project_invite) so the invite-preview/redeem flow never needs service-role or broadened RLS. Live verification's first pass (42/48) caught a real regression: the new owner-protection trigger also fired during a project's cascade-delete of its own project_members, blocking all project hard-deletion. Fixed same-day in migration 023 (mirrors the 019 audit_events cascade fix), re-verified: **55/55 checks passing total.** No real workspace/user data touched; cleanup used exact ids only, service role used solely for read-only snapshots and deleting this test's own project_invites/project_access_requests rows (tables with no DELETE policy for any role). Step 21B is safe. Not yet committed to git. |

---

## HOW CLAUDE CODE MUST UPDATE THIS FILE

After completing each step, Claude Code must update PROGRESS.md as follows:

1. **Update the STATUS block at the top** — change the next step number and overall progress count
2. **Update the step tracker table** — change ⬜ to ✅, add commit hash, add brief notes
3. **Update the step notes section** — fill in status, started/completed timestamps, commit, and any important notes for the next session
4. **Log any new issues** in the Known Issues table
5. **Update environment checklist** if any new credentials were confirmed
6. **Add a session log entry** with today's date and what was done
7. **Commit PROGRESS.md** as part of the step commit — never commit it separately

**The PROGRESS.md commit is part of the step commit. Example:**
```bash
git add .
git commit -m "step-4: auth flow with Google OAuth and workspace creation — tested ✓"
# PROGRESS.md is included in this commit automatically via `git add .`
```

---

*This file is the single source of truth for where the build is.*
*Claude Code owns it. Claude Code keeps it accurate. Always.*
