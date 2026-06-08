# MYREALITY — CLAUDE CODE BUILD INSTRUCTIONS
### Strict Engineering Spec | Full Permissions | Browser-Tested Every Step | PWA + Android (Play Store)

---

## ⚠️ CRITICAL RULES — READ BEFORE ANYTHING ELSE

1. **DO NOT deviate** from this spec. If something is not mentioned here, ask before implementing.
2. **DO NOT make assumptions.** If a detail is unclear, stop and ask.
3. **DO NOT use placeholder data** unless explicitly told to. Build real, wired, functional code.
4. **DO NOT skip steps.** Build in the exact order defined in Section 11.
5. **DO NOT install packages** not listed in Section 3. Ask first.
6. **DO NOT create files or folders** outside the structure defined in Section 7.
7. **DO NOT use inline styles.** Use Tailwind utility classes only, plus CSS variables for design tokens.
8. **DO NOT use `any` in TypeScript.** Every type must be explicitly defined in `/types/index.ts`.
9. **DO NOT create mock auth.** Supabase Auth is the only auth system. No fake sessions.
10. **After completing each step: run the browser test protocol from Section 17, fix any failures, then report results before moving to the next step.**

---

## ⚡ PERMISSIONS

You have been granted full permissions for this project. This means:

- **File system:** Read, write, create, and delete any file in the project directory without asking.
- **Terminal:** Run any shell command needed — npm, npx, git, curl, etc.
- **Browser:** Open and control the browser to test the running app after every step.
- **Supabase:** Full access via the credentials in `.env.local` — run migrations, inspect tables, check RLS, manage storage.
- **Package manager:** Install packages from the approved list in Section 3 without asking. Ask only if a package NOT on the list is needed.
- **Git:** Commit after each completed and tested step with a descriptive commit message.

You do NOT need to ask permission to:
- Write or overwrite any project file
- Run `npm install`, `npm run dev`, `npm run build`
- Execute Supabase migrations
- Open the browser and navigate to localhost
- Commit to git

You MUST still ask before:
- Installing a package not in Section 3
- Creating a file not in Section 7
- Deviating from any design or behaviour spec in this document

---

## 1. PROJECT IDENTITY

- **App name:** MyReality
- **Tagline:** Build your life. Lead your team.
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Deployment target:** Vercel (web + PWA)
- **Mobile target:** Android via Capacitor (Google Play Store)
- **Database:** Supabase (PostgreSQL)
- **Repository name:** `myreality`
- **Android package ID:** `com.myreality.app`
- **PWA:** Yes — installable on all devices via browser "Add to Home Screen"

---

## 2. ENVIRONMENT VARIABLES

Create `.env.local` with exactly these keys and values.

```env
NEXT_PUBLIC_SUPABASE_URL=https://khcpvjtphzidwzbhtayh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3B2anRwaHppZHd6Ymh0YXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjA2NTAsImV4cCI6MjA5NjQ5NjY1MH0.4p82D4JmY4DHTfICyWmD_ZWPbqOpPFJLS4jz6ixbAAk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3B2anRwaHppZHd6Ymh0YXloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkyMDY1MCwiZXhwIjoyMDk2NDk2NjUwfQ.8bHyDN-0-glGPBWNO5vWZi_22Y88lHZPOiOFhTmKgs8
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never hardcode any of these values in source files. Always read from `process.env`.

**Note for Capacitor (Android):** When building the Android APK, `NEXT_PUBLIC_APP_URL` must be updated to the live Vercel production URL. The Android app loads the web app from the live URL via Capacitor's web view.

---

## 3. APPROVED PACKAGES — EXACT VERSIONS

Install only these. No alternatives. No extras without approval.

```json
{
  "dependencies": {
    "next": "14.2.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "5.4.5",
    "@supabase/supabase-js": "2.43.4",
    "@supabase/ssr": "0.3.0",
    "tailwindcss": "3.4.3",
    "framer-motion": "11.2.10",
    "@dnd-kit/core": "6.1.0",
    "@dnd-kit/sortable": "8.0.0",
    "@dnd-kit/utilities": "3.2.2",
    "zustand": "4.5.2",
    "react-hook-form": "7.51.5",
    "zod": "3.23.8",
    "@hookform/resolvers": "3.4.2",
    "@tiptap/react": "2.4.0",
    "@tiptap/starter-kit": "2.4.0",
    "@tiptap/extension-mention": "2.4.0",
    "recharts": "2.12.7",
    "date-fns": "3.6.0",
    "react-confetti": "6.1.0",
    "lucide-react": "0.390.0",
    "clsx": "2.1.1",
    "tailwind-merge": "2.3.0",
    "resend": "3.2.0",
    "sonner": "1.5.0",
    "next-pwa": "5.6.0",
    "@capacitor/core": "6.1.0",
    "@capacitor/cli": "6.1.0",
    "@capacitor/android": "6.1.0",
    "@capacitor/status-bar": "6.0.0",
    "@capacitor/splash-screen": "6.0.0",
    "@capacitor/push-notifications": "6.0.1",
    "workbox-webpack-plugin": "7.1.0"
  },
  "devDependencies": {
    "@types/node": "20.14.2",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "postcss": "8.4.38",
    "autoprefixer": "10.4.19"
  }
}
```

**Resend note:** Install the `resend` package and write all email helper functions in `/lib/email.ts`, but set a feature flag `RESEND_ENABLED = false` at the top of that file. All email calls must check this flag before sending. When the owner is ready to enable emails, they change it to `true` and add the API key — nothing else needs to change.

---

## 4. DESIGN SYSTEM — STRICT TOKENS

### 4.1 CSS Variables
Define these in `app/globals.css`. Use them everywhere via Tailwind config.

```css
:root {
  --bg-base: #0a0a0a;
  --bg-surface: #141414;
  --bg-card: #1c1c1c;
  --bg-hover: #242424;
  --border: #2e2e2e;
  --border-focus: #c9a84c;
  --gold: #c9a84c;
  --gold-light: #e8c97a;
  --gold-muted: rgba(201, 168, 76, 0.15);
  --text-primary: #f0ece0;
  --text-secondary: #a89f8c;
  --text-muted: #5a5248;
  --green: #4caf7d;
  --green-muted: rgba(76, 175, 125, 0.15);
  --red: #e05b5b;
  --red-muted: rgba(224, 91, 91, 0.15);
  --blue: #5b8fe0;
  --blue-muted: rgba(91, 143, 224, 0.15);
  --purple: #9b5be0;
  --purple-muted: rgba(155, 91, 224, 0.15);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
  --header-height: 56px;
}
```

### 4.2 Typography
Load from Google Fonts in `app/layout.tsx`. Use only these two:
- **Display / Headings:** `Playfair Display` — weights 400, 700, 900
- **Body / UI:** `DM Sans` — weights 300, 400, 500, 600

Never use Inter, Roboto, Arial, or system-ui.

### 4.3 Tailwind Config
Extend Tailwind with all CSS variables as named colours:

```ts
// tailwind.config.ts
colors: {
  base: 'var(--bg-base)',
  surface: 'var(--bg-surface)',
  card: 'var(--bg-card)',
  hover: 'var(--bg-hover)',
  border: 'var(--border)',
  gold: 'var(--gold)',
  'gold-light': 'var(--gold-light)',
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  muted: 'var(--text-muted)',
  green: 'var(--green)',
  red: 'var(--red)',
  blue: 'var(--blue)',
  purple: 'var(--purple)',
}
```

### 4.4 Component Rules
- All interactive elements must have a visible `:focus-visible` ring using `--border-focus`
- Hover states: background shifts to `--bg-hover`, border shifts to `--gold`
- Active/selected state: left border `3px solid var(--gold)` OR gold background with dark text
- Disabled state: `opacity-40 cursor-not-allowed`
- All cards: `bg-card border border-[var(--border)] rounded-[var(--radius-md)]`
- All modals: `bg-card border border-[var(--border)] rounded-[var(--radius-lg)]` with `backdrop-blur`

---

## 5. SUPABASE — DATABASE SCHEMA

Run these migrations in order. Store each as a `.sql` file in `/supabase/migrations/`.

### Migration 001 — Enable UUID extension
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Migration 002 — Workspaces
```sql
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url text,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
```

### Migration 003 — Workspace Members
```sql
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
```

### Migration 004 — Profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Migration 005 — Projects
```sql
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#c9a84c',
  icon text NOT NULL DEFAULT '📋',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

### Migration 006 — Columns
```sql
CREATE TABLE columns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  color text NOT NULL DEFAULT '#2e2e2e',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
```

### Migration 007 — Tasks
```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  column_id uuid REFERENCES columns(id) ON DELETE SET NULL,
  title text NOT NULL,
  description jsonb,
  priority text NOT NULL DEFAULT 'none' CHECK (priority IN ('none','low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_to uuid[] DEFAULT '{}',
  labels text[] DEFAULT '{}',
  estimated_hours numeric,
  actual_hours numeric,
  parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  is_personal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### Migration 008 — Task Comments
```sql
CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
```

### Migration 009 — Task Activity
```sql
CREATE TABLE task_activity (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
```

### Migration 010 — Weekly Plans
```sql
CREATE TABLE weekly_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  day_index integer NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start, day_index)
);
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
```

### Migration 011 — Visions
```sql
CREATE TABLE visions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('Faith','Business','Finance','Family','Health','Personal')),
  image_url text,
  target_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','paused')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE visions ENABLE ROW LEVEL SECURITY;
```

### Migration 012 — Notifications
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task_assigned','task_commented','task_due','mention','vision_due')),
  title text NOT NULL,
  body text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### Migration 013 — RLS Policies

```sql
-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- WORKSPACES
CREATE POLICY "Members can view workspace" ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owner can update workspace" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- WORKSPACE MEMBERS
CREATE POLICY "Members can view other members" ON workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can insert members" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- PROJECTS
CREATE POLICY "Workspace members can view projects" ON projects FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace members can create projects" ON projects FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace members can update projects" ON projects FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- COLUMNS
CREATE POLICY "Workspace members can manage columns" ON columns FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

-- TASKS
CREATE POLICY "Workspace members can view tasks" ON tasks FOR SELECT
  USING (
    (is_personal = true AND created_by = auth.uid())
    OR
    (is_personal = false AND project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    ))
  );
CREATE POLICY "Members can create tasks" ON tasks FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can update tasks" ON tasks FOR UPDATE
  USING (
    created_by = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Creator can delete tasks" ON tasks FOR DELETE USING (created_by = auth.uid());

-- TASK COMMENTS
CREATE POLICY "Workspace members can view comments" ON task_comments FOR SELECT
  USING (task_id IN (SELECT id FROM tasks));
CREATE POLICY "Members can add comments" ON task_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors can delete comments" ON task_comments FOR DELETE USING (user_id = auth.uid());

-- TASK ACTIVITY
CREATE POLICY "Members can view activity" ON task_activity FOR SELECT
  USING (task_id IN (SELECT id FROM tasks));
CREATE POLICY "System can insert activity" ON task_activity FOR INSERT WITH CHECK (user_id = auth.uid());

-- WEEKLY PLANS
CREATE POLICY "Users manage own weekly plans" ON weekly_plans FOR ALL USING (user_id = auth.uid());

-- VISIONS
CREATE POLICY "Users manage own visions" ON visions FOR ALL USING (user_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
```

### Migration 014 — Realtime
```sql
-- Enable realtime on these tables only
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## 6. SUPABASE STORAGE

Create one bucket: `visions`
- Public: false
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5MB
- RLS: users can only upload/delete their own files

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('visions', 'visions', false);
CREATE POLICY "Users can upload vision images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'visions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own vision images" ON storage.objects FOR SELECT
  USING (bucket_id = 'visions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own vision images" ON storage.objects FOR DELETE
  USING (bucket_id = 'visions' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 7. FOLDER STRUCTURE — EXACT

Do not create any folder or file not listed here without asking.

```
myreality/
├── app/
│   ├── globals.css
│   ├── layout.tsx                    ← root layout, fonts, Sonner toaster
│   ├── page.tsx                      ← marketing landing page
│   ├── (auth)/
│   │   ├── layout.tsx                ← centred auth layout
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                ← sidebar + header shell
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── vision/
│   │   │   └── page.tsx
│   │   ├── planner/
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   └── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── team/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   └── api/
│       ├── tasks/
│       │   └── route.ts
│       ├── projects/
│       │   └── route.ts
│       └── notifications/
│           └── route.ts
├── components/
│   ├── ui/                           ← shadcn base only
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── tooltip.tsx
│   │   ├── popover.tsx
│   │   └── scroll-area.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── CommandPalette.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── dashboard/
│   │   ├── TodayTasks.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── UpcomingDeadlines.tsx
│   │   └── VisionHighlight.tsx
│   ├── vision/
│   │   ├── VisionBoard.tsx
│   │   ├── VisionCard.tsx
│   │   └── VisionModal.tsx
│   ├── planner/
│   │   ├── WeekGrid.tsx
│   │   ├── DayColumn.tsx
│   │   └── PlannerItem.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   ├── TaskDrawer.tsx
│   │   └── SubtaskList.tsx
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── BoardView.tsx
│   │   ├── ListView.tsx
│   │   ├── BoardColumn.tsx
│   │   ├── TaskCard.tsx
│   │   └── TaskDetail.tsx
│   └── shared/
│       ├── Avatar.tsx
│       ├── PriorityBadge.tsx
│       ├── DatePicker.tsx
│       ├── RichTextEditor.tsx
│       ├── UserSelect.tsx
│       ├── LabelChip.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 ← createBrowserClient
│   │   ├── server.ts                 ← createServerClient
│   │   └── middleware.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   ├── useProjects.ts
│   │   ├── useVisions.ts
│   │   ├── useWeeklyPlan.ts
│   │   ├── useRealtime.ts
│   │   └── useNotifications.ts
│   ├── stores/
│   │   ├── uiStore.ts                ← sidebar collapsed, active modal
│   │   └── workspaceStore.ts         ← active workspace
│   └── utils/
│       ├── cn.ts                     ← clsx + tailwind-merge
│       ├── dates.ts                  ← date-fns helpers
│       └── activity.ts               ← log task activity helper
├── types/
│   └── index.ts                      ← ALL shared types here, no exceptions
├── middleware.ts                     ← Supabase session refresh + route protection
├── supabase/
│   └── migrations/
│       ├── 001_extensions.sql
│       ├── 002_workspaces.sql
│       ├── 003_workspace_members.sql
│       ├── 004_profiles.sql
│       ├── 005_projects.sql
│       ├── 006_columns.sql
│       ├── 007_tasks.sql
│       ├── 008_task_comments.sql
│       ├── 009_task_activity.sql
│       ├── 010_weekly_plans.sql
│       ├── 011_visions.sql
│       ├── 012_notifications.sql
│       ├── 013_rls_policies.sql
│       └── 014_realtime.sql
├── public/
│   ├── logo.svg
│   ├── icon-192.png                  ← PWA icon 192x192
│   ├── icon-512.png                  ← PWA icon 512x512
│   ├── apple-touch-icon.png          ← iOS home screen icon 180x180
│   └── manifest.json                 ← PWA web manifest
├── android/                          ← Generated by Capacitor (do not manually edit)
├── capacitor.config.ts               ← Capacitor configuration
├── .env.local
├── .gitignore
├── middleware.ts
├── next.config.js                    ← includes next-pwa config
├── postcss.config.js
├── tailwind.config.ts
└── package.json
```

---

## 8. TYPESCRIPT TYPES

All types live in `/types/index.ts`. Never define types inline in components.

```ts
// /types/index.ts

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'
export type WorkspacePlan = 'free' | 'pro' | 'team'
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type VisionCategory = 'Faith' | 'Business' | 'Finance' | 'Family' | 'Health' | 'Personal'
export type VisionStatus = 'active' | 'achieved' | 'paused'
export type NotificationType = 'task_assigned' | 'task_commented' | 'task_due' | 'mention' | 'vision_due'
export type ActivityAction = 'created' | 'updated' | 'commented' | 'assigned' | 'moved' | 'completed' | 'reopened'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  logo_url: string | null
  plan: WorkspacePlan
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: Profile
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string
  icon: string
  status: ProjectStatus
  created_by: string
  created_at: string
  updated_at: string
  columns?: Column[]
  member_count?: number
  task_count?: number
}

export interface Column {
  id: string
  project_id: string
  title: string
  color: string
  position: number
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  project_id: string | null
  column_id: string | null
  title: string
  description: Record<string, unknown> | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  position: number
  created_by: string
  assigned_to: string[]
  labels: string[]
  estimated_hours: number | null
  actual_hours: number | null
  parent_task_id: string | null
  is_personal: boolean
  created_at: string
  updated_at: string
  subtasks?: Task[]
  comments?: TaskComment[]
  assignees?: Profile[]
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: ActivityAction
  metadata: Record<string, unknown>
  created_at: string
  profile?: Profile
}

export interface WeeklyPlan {
  id: string
  user_id: string
  workspace_id: string | null
  week_start: string
  day_index: number
  items: PlanItem[]
  created_at: string
  updated_at: string
}

export interface PlanItem {
  id: string
  text: string
  done: boolean
  time: string | null
  color: string | null
}

export interface Vision {
  id: string
  user_id: string
  workspace_id: string | null
  title: string
  description: string | null
  category: VisionCategory
  image_url: string | null
  target_date: string | null
  status: VisionStatus
  position: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: string
}
```

---

## 9. COMPONENT BEHAVIOUR RULES

### Sidebar (components/layout/Sidebar.tsx)
- Default width: `var(--sidebar-width)` = 240px
- Collapsed width: `var(--sidebar-collapsed-width)` = 64px
- Collapse toggle: chevron button at bottom of sidebar
- Collapsed state: show icons only, no labels
- Collapsed state stored in `uiStore` (Zustand), persisted to `localStorage`
- Active route: left border `3px solid var(--gold)`, background `var(--bg-hover)`
- Workspace switcher at top (show workspace name + logo)
- Nav items: Dashboard, Vision, Planner, Tasks, Projects, Team, Settings
- Logout button at very bottom

### Header (components/layout/Header.tsx)
- Height: `var(--header-height)` = 56px
- Background: `var(--bg-surface)`, bottom border `1px solid var(--border)`
- Left: page title (changes per route)
- Right: search icon (opens CommandPalette) + notifications bell with unread badge + user avatar dropdown
- Notifications bell: shows count badge if unread > 0, max display "9+"

### CommandPalette (components/layout/CommandPalette.tsx)
- Triggered by: Cmd+K (Mac) or Ctrl+K (Windows)
- Searches: tasks, projects, visions (live as user types, min 2 chars)
- Keyboard navigation: arrow keys, Enter to select, Escape to close
- Groups results by type with section headers
- Shows last 5 recent navigations when empty

### Vision Board (components/vision/VisionBoard.tsx)
- Grid layout: `repeat(auto-fill, minmax(240px, 1fr))`
- Category filter bar above grid (All + 6 categories as pill buttons)
- Drag to reorder via `@dnd-kit/sortable`
- VisionCard shows: image (if any) | category badge | title | target date | status
- "Mark as Achieved" button → triggers `react-confetti` burst on the card
- Add/Edit via VisionModal (Dialog component)
- Image upload: drag-and-drop zone OR click to browse → uploads to Supabase Storage `visions/{userId}/{uuid}.jpg`
- Empty state: EmptyState component with icon and prompt text

### Weekly Planner (components/planner/WeekGrid.tsx)
- 7-column grid, Mon–Sun
- Week navigation: prev/next arrow buttons + "Today" button to return to current week
- Weekly intention field: single-line text input at top spanning all 7 columns
- Each DayColumn shows: day name + date number + list of PlanItems + "+ Add" button
- Today's column: gold border highlight
- PlanItem: checkbox (toggle done) + time label (optional) + text + delete button
- Clicking "+ Add" opens inline input at bottom of that day's column (not a modal)
- Incomplete items from previous day: shown with a grey "carried over" label, not auto-duplicated — user must manually carry them
- Drag PlanItems between days via `@dnd-kit`

### Task Tracker (components/tasks/TaskList.tsx)
- Personal tasks only (`is_personal = true`)
- Filters: All / Active / Done / Urgent / High (pill tabs)
- Sort: Priority / Due Date / Created (dropdown)
- Search: input that filters inline
- TaskItem: checkbox + title + priority badge + due date chip + assignee avatars + label chips
- Click task → opens TaskDrawer (slides in from right, 480px wide)
- Bulk select: checkbox on hover per item, bulk action bar appears at bottom when ≥1 selected
- Bulk actions: Mark Done, Change Priority, Delete

### Board View (components/projects/BoardView.tsx)
- Horizontal scroll for columns
- Each BoardColumn: header (title, color dot, task count, add button, options menu) + task cards + add card footer
- TaskCard shows: title + priority badge + due date + assignee avatars + comment count + label chips
- Drag cards between columns via `@dnd-kit/sortable`
- Drag columns to reorder via `@dnd-kit/sortable`
- Click card → opens TaskDetail drawer

### TaskDetail (components/projects/TaskDetail.tsx)
- Drawer slides in from right, width 520px
- Does NOT navigate to a new page
- Sections: Title (inline edit) → Description (TipTap editor) → Meta row (assignees, priority, due date, labels) → Subtasks → Time tracking → Comments → Activity log
- Comments: avatar + name + timestamp + text, newest at bottom, input at bottom
- Activity log: compact list, e.g. "Marvin moved this from Todo → In Progress · 2h ago"
- Closing drawer: click overlay or X button
- All edits auto-save with 500ms debounce (no save button)

### Realtime (lib/hooks/useRealtime.ts)
- Subscribe to channel `workspace:{workspaceId}:tasks` on mount
- On INSERT: add task to local state
- On UPDATE: update task in local state
- On DELETE: remove task from local state
- Unsubscribe on unmount
- Show a subtle toast (Sonner) when another user updates a task: "Alex moved 'Fix login bug' to Done"

---

## 10. AUTH FLOW

1. User visits `/` → marketing page with "Get Started" CTA
2. CTA → `/signup`
3. Signup form: full name + email + password (min 8 chars)
4. On success → Supabase creates user → trigger creates profile → redirect to `/app/dashboard`
5. First visit after signup → "Create your workspace" modal appears (required, not dismissible)
   - Fields: Workspace name (required), Slug (auto-generated from name, editable)
   - On submit → creates workspace + workspace_member row with role 'owner'
6. Login → `/login` → email + password → redirect to `/app/dashboard`
7. Google OAuth: button on both login and signup pages
8. Forgot password: link on login → Supabase magic link email
9. Session: managed by Supabase SSR via middleware, refreshed on every request
10. Protected routes: middleware redirects unauthenticated users to `/login`

---

## 11. BUILD ORDER — STRICTLY FOLLOW THIS SEQUENCE

Do not start a step until the previous step is fully complete, browser-tested per Section 12, and committed to git.

```
STEP 1  — Project initialisation
          • Next.js 14 + TypeScript + Tailwind + all packages from Section 3
          • Folder structure from Section 7 (create all files as empty stubs)
          • Design tokens in globals.css (Section 4.1)
          • Tailwind config with custom colours (Section 4.2)
          • Google Fonts loaded in root layout

STEP 2  — Types
          • Write all types from Section 8 into /types/index.ts
          • Confirm no TypeScript errors

STEP 3  — Supabase setup
          • /lib/supabase/client.ts (browser client)
          • /lib/supabase/server.ts (server client)
          • Run all 14 migrations from Section 5 in order
          • Set up Storage bucket from Section 6
          • Confirm all tables exist and RLS is enabled

STEP 4  — Middleware + Auth
          • /middleware.ts — session refresh + route protection
          • /app/(auth)/layout.tsx — centred auth shell
          • LoginForm component + /app/(auth)/login/page.tsx
          • SignupForm component + /app/(auth)/signup/page.tsx
          • Google OAuth button on both forms
          • On signup: create workspace modal flow
          • Confirm login, signup, and OAuth all work end-to-end

STEP 5  — App shell
          • /app/(app)/layout.tsx with Sidebar + Header
          • Sidebar with all nav items, collapse behaviour, active state
          • Header with page title, search icon, notifications bell, user avatar
          • uiStore and workspaceStore (Zustand)
          • Confirm shell renders correctly on all app routes

STEP 6  — Dashboard
          • All 5 dashboard widget components
          • Wire to Supabase: today's tasks, recent activity, upcoming deadlines
          • ProgressRing animates on load
          • VisionHighlight pulls a random active vision

STEP 7  — Vision Board
          • VisionBoard + VisionCard + VisionModal
          • Full CRUD wired to Supabase
          • Image upload to Supabase Storage
          • Category filter tabs
          • Drag to reorder (@dnd-kit)
          • Confetti on "Mark as Achieved"
          • Empty state

STEP 8  — Weekly Planner
          • WeekGrid + DayColumn + PlannerItem
          • Full CRUD wired to Supabase (weekly_plans table)
          • Week navigation
          • Weekly intention field
          • Drag items between days
          • Today column highlight
          • Carry-over label logic

STEP 9  — Personal Task Tracker
          • TaskList + TaskItem + TaskDrawer + SubtaskList
          • Full CRUD for personal tasks (is_personal = true)
          • Priority, due date, labels, subtasks
          • Filter tabs + sort + inline search
          • Bulk select + bulk actions
          • TaskDrawer: TipTap description, subtasks, time tracking fields

STEP 10 — Projects
          • Project list page + ProjectCard
          • Create project modal
          • BoardView + BoardColumn + TaskCard (dnd-kit drag between columns)
          • ListView (table with inline edit)
          • TaskDetail drawer (full: title, description, assignees, priority,
            due date, labels, subtasks, comments, activity log)
          • All wired to Supabase

STEP 11 — Realtime
          • useRealtime hook
          • Subscribe to tasks channel per workspace
          • Live board updates across users
          • Sonner toasts for other users' actions

STEP 12 — Notifications
          • useNotifications hook
          • Bell badge in Header
          • Notifications dropdown panel
          • Mark as read / mark all as read
          • Insert notifications on: task assigned, task commented, @mention

STEP 13 — Team Management
          • /app/(app)/team/page.tsx
          • List workspace members with roles
          • Invite by email (Resend email)
          • Change role / remove member

STEP 14 — Command Palette
          • CommandPalette component (Cmd+K)
          • Search tasks, projects, visions
          • Keyboard navigation
          • Recent items when empty

STEP 15 — Settings
          • /app/(app)/settings/page.tsx
          • Profile: update name, avatar upload
          • Workspace: update name, logo
          • Notifications preferences

STEP 16 — Landing Page
          • /app/page.tsx — marketing landing page
          • Sections: Hero, Features, How it works, CTA
          • Links to /login and /signup

STEP 17 — PWA Setup
          • Add manifest.json to /public/
          • Configure next-pwa in next.config.js
          • Add all PWA meta tags to app/layout.tsx
          • Generate icon-192.png, icon-512.png, apple-touch-icon.png
          • Test: visit app in Chrome → DevTools → Application tab
            → confirm manifest loads, service worker registers
          • Test: on Android Chrome, confirm "Add to Home Screen" prompt appears
          • Test: install PWA, open from home screen, confirm standalone mode
            (no browser address bar)
          • Test: go offline → dashboard still loads from cache

STEP 18 — Capacitor Android Setup
          • Install Capacitor packages
          • Create capacitor.config.ts
          • Add static export option to next.config.js (BUILD_TARGET=capacitor)
          • Run: BUILD_TARGET=capacitor npm run build
          • Run: npx cap init
          • Run: npx cap add android
          • Run: npx cap sync android
          • Confirm android/ folder generated with no errors
          • Add /app/privacy/page.tsx (privacy policy static page)
          • Document Android Studio steps for developer to follow
            (Claude Code cannot open Android Studio — hand off here)

STEP 19 — Resend Email Scaffolding
          • Create /lib/email.ts with RESEND_ENABLED = false
          • Implement all three email functions (disabled)
          • Wire invite email call into team invite flow
          • Wire task assigned email call into task assignment
          • Confirm console.log messages appear when actions trigger emails
          • Confirm no actual emails are sent (RESEND_ENABLED = false)

STEP 20 — Final QA
          • Fix all TypeScript errors (zero allowed in production)
          • Test all Supabase queries with RLS enabled
          • Test realtime on two browser windows
          • Test PWA install on Android device or emulator
          • Run BUILD_TARGET=capacitor npm run build — must complete with zero errors
          • Run npm run build (standard) — must complete with zero errors
          • Run npx tsc --noEmit — zero errors
          • Test on mobile viewport (320px minimum)
          • Verify all env vars are read from .env.local
          • Run npx cap sync android — must complete cleanly
```

---

## 12. BROWSER TESTING PROTOCOL — RUN AFTER EVERY STEP

After completing each build step, you must:

### 12.1 Start the dev server
```bash
npm run dev
```
Confirm it starts on `http://localhost:3000` with zero errors in the terminal.

### 12.2 Open the browser
Navigate to `http://localhost:3000` using the browser tool.

### 12.3 Mobile viewport check — REQUIRED ON EVERY STEP

Before running the step-specific checklist, always do this first:

1. Set browser viewport to **375px wide**
2. Confirm no horizontal scroll exists
3. Confirm all text is readable (not overflowing or truncated)
4. Confirm all buttons are tappable (min 44px)
5. Confirm no elements are hidden or broken at this width

Then set to **320px** and repeat. Fix any issues before continuing.

### 12.4 Run the step-specific checklist

Each step has a specific test checklist below. Run every item. If any item fails, fix it before marking the step done.

---

#### STEP 1 TEST — Project Init
- [ ] `http://localhost:3000` loads without a white screen or error
- [ ] No TypeScript errors in terminal
- [ ] Tailwind styles are applying (background should be `#0a0a0a`)
- [ ] Google Fonts (Playfair Display + DM Sans) are loading in browser DevTools Network tab

#### STEP 2 TEST — Types
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] All types from Section 8 are present in `/types/index.ts`

#### STEP 3 TEST — Supabase Setup
- [ ] Open Supabase dashboard → confirm all 12 tables exist
- [ ] Confirm RLS is enabled on every table (green shield icon)
- [ ] Confirm `visions` storage bucket exists
- [ ] Run a test query in Supabase SQL editor: `SELECT * FROM profiles LIMIT 1;` — no error

#### STEP 4 TEST — Auth
- [ ] Navigate to `http://localhost:3000/signup`
- [ ] Fill in name, email, password → submit
- [ ] Confirm user appears in Supabase Auth dashboard
- [ ] Confirm profile row was auto-created in `profiles` table
- [ ] Confirm "Create workspace" modal appears
- [ ] Create a workspace → confirm row in `workspaces` table
- [ ] Confirm `workspace_members` row created with role `owner`
- [ ] Confirm redirect to `/app/dashboard`
- [ ] Navigate to `http://localhost:3000/login` → log in with same credentials
- [ ] Confirm redirect to `/app/dashboard`
- [ ] Navigate to `http://localhost:3000/app/dashboard` while logged out → confirm redirect to `/login`
- [ ] Test Google OAuth button renders (full flow optional if credentials not configured)

#### STEP 5 TEST — App Shell
- [ ] Sidebar renders with all 7 nav items on desktop
- [ ] Click each nav item → correct route loads
- [ ] Collapse button hides labels, shows icons only
- [ ] Collapsed state persists on page refresh
- [ ] Header shows page title, search icon, bell icon, user avatar on desktop
- [ ] User avatar dropdown opens and shows Logout option
- [ ] Logout → redirects to `/login`
- [ ] **Mobile (375px):** sidebar is hidden by default — not visible
- [ ] **Mobile (375px):** hamburger menu button is visible in header
- [ ] **Mobile (375px):** tapping hamburger opens sidebar as overlay drawer
- [ ] **Mobile (375px):** tapping backdrop closes the sidebar
- [ ] **Mobile (375px):** tapping a nav item closes the sidebar and navigates
- [ ] **Mobile (375px):** header shows hamburger + logo + bell + avatar only
- [ ] **Mobile (320px):** no horizontal overflow

#### STEP 6 TEST — Dashboard
- [ ] Dashboard loads without errors
- [ ] ProgressRing animates on load
- [ ] TodayTasks widget renders (empty state if no tasks)
- [ ] UpcomingDeadlines widget renders
- [ ] ActivityFeed widget renders
- [ ] VisionHighlight renders (empty state if no visions)

#### STEP 7 TEST — Vision Board
- [ ] Vision Board page loads
- [ ] Add a vision with title, category, description → appears on board
- [ ] Add a vision with an image upload → image displays on card
- [ ] Category filter tabs work (click Faith → only Faith visions shown)
- [ ] Drag a vision card to reorder → new order persists on refresh
- [ ] Click "Mark as Achieved" → confetti fires → card moves/updates
- [ ] Delete a vision → removed from board
- [ ] Empty state shows when no visions exist
- [ ] **Mobile (375px):** cards display in single column
- [ ] **Mobile (375px):** category filter bar scrolls horizontally without wrapping
- [ ] **Mobile (375px):** tapping "Add Vision" opens a bottom sheet (not a centred modal)
- [ ] **Mobile (375px):** image upload works via tap

#### STEP 8 TEST — Weekly Planner
- [ ] Planner loads showing current week (Mon–Sun) on desktop
- [ ] Today's column has gold border on desktop
- [ ] Click "+ add" on a day → inline input appears → type and press Enter → item added
- [ ] Check off an item → strikethrough appears
- [ ] Delete an item → removed
- [ ] Click prev/next arrows → week changes correctly
- [ ] "Today" button returns to current week
- [ ] Weekly intention field saves on blur
- [ ] Drag item from one day to another → persists on refresh
- [ ] Data persists after page refresh (saved in Supabase)
- [ ] **Mobile (375px):** single day view shown (not 7 columns)
- [ ] **Mobile (375px):** day picker bar at top shows all 7 days as scrollable pills
- [ ] **Mobile (375px):** today's pill is gold
- [ ] **Mobile (375px):** tapping a day pill switches to that day
- [ ] **Mobile (375px):** "+ add" opens a bottom sheet input
- [ ] **Mobile (375px):** left/right arrows navigate between days

#### STEP 9 TEST — Task Tracker
- [ ] Task page loads
- [ ] Add a task with High priority and a due date → appears in list
- [ ] Add a task with Low priority → appears in list
- [ ] Filter by "High" → only high priority tasks shown
- [ ] Filter by "Done" → shows completed tasks only
- [ ] Check off a task → moves to done state
- [ ] Click a task → TaskDrawer slides in from right (desktop)
- [ ] Add a subtask in the drawer → appears in subtask list
- [ ] Check off subtask → strikethrough
- [ ] Bulk select 2 tasks → bulk action bar appears → "Mark Done" works
- [ ] Search input filters tasks in real time
- [ ] **Mobile (375px):** filter tabs scroll horizontally
- [ ] **Mobile (375px):** tapping a task opens a bottom sheet drawer (slides up)
- [ ] **Mobile (375px):** bottom sheet has drag handle at top
- [ ] **Mobile (375px):** bulk action bar is fixed at bottom of screen
- [ ] **Mobile (375px):** all task items are at least 44px tall

#### STEP 10 TEST — Projects
- [ ] Projects page loads with empty state
- [ ] Create a new project → appears as ProjectCard
- [ ] Open project → Board view renders with default columns
- [ ] Add a task card to "Todo" column → appears
- [ ] Drag card to "In Progress" on desktop → updates in Supabase
- [ ] Click task card → TaskDetail drawer opens (desktop: side drawer)
- [ ] Edit task title inline → auto-saves
- [ ] Add a comment → appears in comment thread
- [ ] Switch to List view → tasks appear in table format (desktop)
- [ ] **Mobile (375px):** board shows single column at a time
- [ ] **Mobile (375px):** column selector tabs at top (Todo | In Progress | Review | Done)
- [ ] **Mobile (375px):** tapping a column tab switches the visible column
- [ ] **Mobile (375px):** each task card has a ⋮ menu with "Move to..." option
- [ ] **Mobile (375px):** "Move to..." shows column options → moves the task
- [ ] **Mobile (375px):** TaskDetail opens as full-screen bottom sheet
- [ ] **Mobile (375px):** comment input is fixed at bottom, above keyboard
- [ ] **Mobile (375px):** List view shows card-style rows, not a data table

#### STEP 11 TEST — Realtime
- [ ] Open app in two browser windows, both logged into the same workspace
- [ ] In window 1: drag a task card to a different column
- [ ] In window 2: confirm the card moves without refreshing
- [ ] In window 1: add a comment to a task
- [ ] In window 2: confirm comment appears in real time
- [ ] Sonner toast appears in window 2 with the update message

#### STEP 12 TEST — Notifications
- [ ] Bell icon shows badge when there are unread notifications
- [ ] Click bell → dropdown opens with notification list
- [ ] Click a notification → navigates to the relevant task
- [ ] "Mark all as read" → badge disappears
- [ ] Assign a task to another user → that user gets a notification (check `notifications` table)

#### STEP 13 TEST — Team
- [ ] Team page loads with current member listed
- [ ] Invite form renders
- [ ] Enter an email → invite sent (check Resend dashboard or `workspace_members` table)
- [ ] Invited user appears as pending or member after accepting

#### STEP 14 TEST — Command Palette
- [ ] Press Cmd+K (or Ctrl+K) → palette opens
- [ ] Type 2+ characters → results appear grouped by type
- [ ] Arrow keys navigate results
- [ ] Press Enter on a result → navigates to correct route
- [ ] Press Escape → palette closes
- [ ] Empty state shows recent items

#### STEP 15 TEST — Settings
- [ ] Settings page loads
- [ ] Update full name → saves → header avatar/name updates
- [ ] Upload avatar → appears in header
- [ ] Update workspace name → saves

#### STEP 16 TEST — Landing Page
- [ ] `http://localhost:3000` shows marketing page (not redirected to dashboard)
- [ ] "Get Started" CTA links to `/signup`
- [ ] "Sign In" links to `/login`
- [ ] Page is responsive at mobile viewport

#### STEP 17 TEST — PWA
- [ ] Open Chrome DevTools → Application → Manifest → manifest.json loads with no errors
- [ ] Application → Service Workers → service worker is registered and active
- [ ] Application → Storage → Cache Storage shows cached routes
- [ ] On Android Chrome (real device or emulator): "Add to Home Screen" prompt appears
- [ ] Install PWA → open from home screen → no browser address bar (standalone mode)
- [ ] Theme colour (`#c9a84c` gold) appears in Android status bar
- [ ] Turn off wifi → navigate to `/app/dashboard` → page loads from cache
- [ ] Offline Sonner toast appears when a Supabase call fails
- [ ] App icons display correctly on home screen

#### STEP 18 TEST — Capacitor Android
- [ ] `BUILD_TARGET=capacitor npm run build` completes with zero errors
- [ ] `out/` folder generated with static HTML files
- [ ] `npx cap sync android` completes with zero errors
- [ ] `android/` folder exists and contains a valid Gradle project
- [ ] `/app/privacy/page.tsx` renders a readable privacy policy page
- [ ] Document handoff note: open `android/` in Android Studio to generate signed APK

#### STEP 19 TEST — Email Scaffolding
- [ ] `/lib/email.ts` exists with `RESEND_ENABLED = false`
- [ ] Invite a team member → console shows `[Email disabled] Would have sent workspace invite to: ...`
- [ ] Assign a task → console shows `[Email disabled] Would have sent task assigned email to: ...`
- [ ] No actual emails sent, no runtime errors

#### STEP 20 TEST — Final QA
- [ ] `npm run build` → zero errors
- [ ] `BUILD_TARGET=capacitor npm run build` → zero errors
- [ ] `npx tsc --noEmit` → zero errors
- [ ] `npx cap sync android` → zero errors
- [ ] All 7 nav routes load on 375px mobile viewport — no horizontal overflow
- [ ] Realtime: two browser windows, drag a task → updates in both instantly
- [ ] RLS: log out, open browser console, fetch Supabase tasks → returns no data
- [ ] PWA: install on device, confirm full app works from home screen icon

---

### 12.4 After tests pass
```bash
git add .
git commit -m "step {N} complete: {short description} — all browser tests passed"
```

### 12.5 If a test fails
- Fix the issue immediately
- Re-run the failing test
- Do not move to the next step until all tests for the current step pass
- If a fix requires changing the spec, stop and report it

---

## 13. ERROR HANDLING RULES

- Every Supabase query must handle the `error` return value
- On error: log to console AND show a Sonner toast (`toast.error(message)`)
- Never show raw Supabase error messages to the user — map to friendly messages
- Loading states: every data-fetching component must show a skeleton or spinner
- Empty states: every list/grid must show the EmptyState component when no data
- Form validation: React Hook Form + Zod schemas, inline error messages below fields
- 404: if a project or task ID does not exist, redirect to the parent list page

---

## 14. PERFORMANCE RULES

- Use `React.memo` on TaskCard and VisionCard (they re-render frequently)
- Paginate task lists: fetch 50 tasks at a time, load more on scroll
- Debounce search inputs: 300ms
- Debounce auto-save in TaskDetail: 500ms
- Images: use `next/image` for all images with explicit `width` and `height`
- Lazy load TaskDetail and CommandPalette with `next/dynamic`

---

## 15. ANIMATION RULES (Framer Motion)

Use Framer Motion only for these specific interactions:

| Interaction | Animation |
|---|---|
| Page transition | `opacity: 0→1, y: 10→0`, duration 0.25s |
| Card/item mount | `opacity: 0→1, y: 8→0`, duration 0.2s, stagger 0.05s |
| Modal open | `scale: 0.95→1, opacity: 0→1`, duration 0.2s |
| Drawer slide-in | `x: 100%→0`, duration 0.3s, ease "easeOut" |
| Sidebar collapse | `width` transition, duration 0.25s |
| Vision achieved | `react-confetti` component, 3 second duration |
| Notification toast | Sonner handles this, do not add custom animation |

Do not add animations beyond this list without asking.

---

## 16. MOBILE RESPONSIVE DESIGN — REQUIRED ON ALL SCREENS

The app must work perfectly on mobile. This is not optional and is not an afterthought. Every component must be designed and tested at both mobile (375px) and desktop (1280px+) simultaneously.

### 16.1 Breakpoint Strategy

Use Tailwind's breakpoint system consistently:

| Breakpoint | Width | Target |
|---|---|---|
| (default) | 0px+ | Mobile first — all base styles are mobile |
| `sm` | 640px+ | Large phones / small tablets |
| `md` | 768px+ | Tablets |
| `lg` | 1024px+ | Small desktop |
| `xl` | 1280px+ | Full desktop |

**Always write mobile styles first, then override for larger screens.** Never write desktop styles and try to shrink them down.

### 16.2 Sidebar — Mobile Behaviour

- **Mobile (< lg):** Sidebar is hidden off-screen by default. Opens as a full-height drawer overlay from the left when the hamburger menu is tapped. Backdrop overlay behind it. Tapping backdrop closes it.
- **Desktop (lg+):** Sidebar is always visible. Collapsible to icon-only mode.
- Hamburger menu button: visible only on mobile, in the Header left slot
- When a nav item is tapped on mobile, the sidebar closes automatically

```tsx
// Mobile sidebar: fixed overlay drawer
// Desktop sidebar: static sidebar in flex layout
<aside className="
  fixed inset-y-0 left-0 z-50 w-[240px]
  transform transition-transform duration-300
  -translate-x-full lg:translate-x-0 lg:static lg:z-auto
  data-[open=true]:translate-x-0
">
```

### 16.3 Header — Mobile Behaviour

- Mobile: hamburger icon (left) + app logo (centre) + notifications bell + avatar (right)
- Desktop: page title (left) + search icon + notifications bell + avatar (right)
- Search: on mobile, tapping search opens a full-screen search overlay (not a palette)
- Avatar: tapping opens a bottom sheet on mobile, dropdown on desktop

### 16.4 Dashboard — Mobile Layout

- Single column stack on mobile
- Widgets stack vertically in this order: greeting → progress ring → today's tasks → upcoming deadlines → vision highlight → activity feed
- ProgressRing: centred, 120px diameter on mobile
- No horizontal scroll on any widget

### 16.5 Vision Board — Mobile Layout

- Mobile: single column grid (`grid-cols-1`)
- sm: two columns (`sm:grid-cols-2`)
- lg+: auto-fill minmax(240px) grid
- Category filter bar: horizontally scrollable pill row (no wrap, scroll indicator)
- VisionModal: full-screen bottom sheet on mobile, centred dialog on desktop

### 16.6 Weekly Planner — Mobile Layout

- Mobile: **single day view** — show one day at a time with left/right swipe or arrow buttons to navigate between days
- A horizontal day picker bar at the top shows all 7 days (Mon–Sun) as compact pills — tap to jump to that day
- Today pill is gold
- Desktop: full 7-column grid as specified
- Weekly intention field: full width on both mobile and desktop
- Add task: tapping "+ add" opens a bottom sheet input on mobile

```tsx
// Day picker bar (mobile only)
<div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
  {days.map(day => (
    <button className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg ...">
      <span className="text-xs">{dayName}</span>
      <span className="text-lg font-bold">{dayNum}</span>
    </button>
  ))}
</div>
```

### 16.7 Task Tracker — Mobile Layout

- Filter tabs: horizontally scrollable, no wrap
- TaskItem: full width, tap anywhere to open drawer
- TaskDrawer: on mobile, opens as a **bottom sheet** that slides up from the bottom (full screen height minus 60px top safe area)
- Bottom sheet has a drag handle at top, can be dismissed by dragging down
- Bulk action bar: fixed at bottom of screen on mobile when items selected

### 16.8 Projects — Board View — Mobile Layout

- Mobile: **single column view** — show one column at a time
- Column selector: horizontal scrollable tabs at top (Todo | In Progress | Review | Done)
- Tapping a tab shows that column's cards
- Drag and drop between columns: on mobile, use a "Move to..." action button on each card (long press or tap a ⋮ menu) instead of drag-and-drop (dnd-kit drag is difficult on touch)
- Desktop: full horizontal scrolling board as specified

### 16.9 Projects — List View — Mobile Layout

- Mobile: card-style rows instead of a data table
- Each task is a card showing: title + priority badge + assignee avatar + due date
- Tap to open TaskDetail
- Desktop: full table with sortable columns

### 16.10 TaskDetail Drawer — Mobile Layout

- Mobile: full-screen bottom sheet (slides up, covers entire screen)
- Has a sticky header with task title + close (X) button
- Sections are vertically stacked, scrollable
- Comment input: fixed at the very bottom of the screen (above keyboard)
- Desktop: 520px side drawer as specified

### 16.11 Modals and Dialogs — Mobile Layout

All modals/dialogs must use bottom sheets on mobile:

```tsx
// Pattern for all modals
<Dialog>
  <DialogContent className="
    fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh] overflow-y-auto
    sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:rounded-xl sm:max-w-lg sm:mx-auto
  ">
```

### 16.12 Touch Targets

Every tappable element must be at minimum **44×44px** on mobile. Apply `min-h-[44px] min-w-[44px]` to all buttons, checkboxes, and interactive elements. This is a hard rule — no exceptions.

### 16.13 Typography — Mobile Scaling

| Element | Mobile | Desktop |
|---|---|---|
| Page title | `text-xl` | `text-3xl` |
| Section heading | `text-lg` | `text-2xl` |
| Card title | `text-sm` | `text-base` |
| Body text | `text-sm` | `text-sm` |
| Meta/label | `text-xs` | `text-xs` |

### 16.14 Spacing — Mobile

- Page padding: `px-4 py-5` on mobile, `px-7 py-8` on desktop
- Card padding: `p-4` on mobile, `p-5` on desktop
- Gap between cards: `gap-3` on mobile, `gap-4` on desktop

### 16.15 Safe Areas (for PWA and Capacitor)

Add safe area insets to handle notches and home indicator bars on modern Android phones:

```css
/* In globals.css */
.safe-top { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

Apply `safe-top` to the Header and `safe-bottom` to any fixed bottom bars (bulk action bar, comment input).

### 16.16 No Horizontal Scroll Rule

Zero horizontal scroll is allowed anywhere in the app at any viewport width from 320px upward. Test this explicitly. Common causes:
- Fixed-width elements wider than viewport
- Flex rows without `flex-wrap` or `overflow-x-auto`
- Absolute-positioned elements bleeding outside parent

If a component cannot fit in 320px width, it must scroll internally (with `overflow-x-auto`) or reflow to a vertical layout.

### 16.17 Mobile Test Viewports

Every component must be tested at these exact widths before the step is marked complete:
- **320px** — smallest Android phones
- **375px** — iPhone SE / standard Android
- **414px** — iPhone Pro Max / large Android
- **768px** — tablet portrait
- **1280px** — desktop

---

### 16.1 Web App Manifest
Create `public/manifest.json`:

```json
{
  "name": "MyReality",
  "short_name": "MyReality",
  "description": "Build your life. Lead your team.",
  "start_url": "/app/dashboard",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#c9a84c",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "business"],
  "screenshots": []
}
```

### 16.2 next-pwa Config
In `next.config.js`, wrap the config with `next-pwa`:

```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 }
      }
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 604800 }
      }
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
      }
    }
  ]
})
module.exports = withPWA({ /* rest of next config */ })
```

### 16.3 PWA Meta Tags
Add these to the `<head>` in `app/layout.tsx`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#c9a84c" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="MyReality" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="mobile-web-app-capable" content="yes" />
```

### 16.4 App Icons
Generate and place these files in `/public/`:
- `icon-192.png` — 192×192px, dark background (`#0a0a0a`), gold "MR" monogram or logo
- `icon-512.png` — 512×512px, same design
- `apple-touch-icon.png` — 180×180px, same design
- Use sharp corners (not rounded — the OS applies rounding)

### 16.5 Offline Behaviour
- When offline, the service worker serves cached pages
- Supabase calls that fail offline: show a Sonner toast "You're offline — changes will sync when reconnected"
- The dashboard, vision board, planner, and task list must load from cache when offline (data may be stale — that is acceptable)

---

## 17. CAPACITOR — ANDROID BUILD

### 17.1 Capacitor Config
Create `capacitor.config.ts` in the project root:

```ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.myreality.app',
  appName: 'MyReality',
  webDir: 'out',
  server: {
    url: process.env.NEXT_PUBLIC_APP_URL,
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0a0a'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
}

export default config
```

**Important:** The `server.url` points to the live Vercel deployment. The Android app is a thin shell (WebView) that loads the live web app. This means:
- No separate API or backend needed for Android
- App updates deploy automatically when Vercel deploys — no Play Store update required for UI/logic changes
- Only native plugin changes require a new APK submission

### 17.2 Play Store Strategy — Private First

The app will be built with full Play Store capability but published as **internal/private** initially:

- Build and sign the APK for personal use first
- Test thoroughly on a real Android device
- When the owner decides to release publicly, submit for Play Store review
- **Internal testing track** on Google Play Console allows installing on personal devices without public listing — use this first

### 17.3 Android Build Steps
Run these commands in order after the web app is deployed to Vercel:

```bash
# 1. Build the Next.js app as static export
npm run build

# 2. Initialise Capacitor (first time only)
npx cap init MyReality com.myreality.app --web-dir=out

# 3. Add Android platform (first time only)
npx cap add android

# 4. Sync web assets into Android project
npx cap sync android

# 5. Open in Android Studio for final build + signing
npx cap open android
```

### 17.3 Android Studio Steps (manual — Claude Code cannot do this)
These steps must be done by the developer in Android Studio:

1. Open the `android/` folder in Android Studio
2. Wait for Gradle sync to complete
3. Go to **Build → Generate Signed Bundle/APK**
4. Choose **Android App Bundle (.aab)** for Play Store
5. Create a new keystore (keep this file safe — you cannot republish without it)
6. Build release AAB
7. Upload to Google Play Console

### 17.4 next.config.js — Static Export for Capacitor
Add this to `next.config.js` — controlled by an env var so it only applies during Android builds:

```js
// Only export statically when building for Capacitor/Android
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'
module.exports = withPWA({
  output: isCapacitorBuild ? 'export' : undefined,
  // ... rest of config
})
```

Build command for Android: `BUILD_TARGET=capacitor npm run build`

### 17.5 Play Store Requirements (developer must prepare)
- **Google Play Developer Account** — one-time $25 USD fee at play.google.com/console
- **App icons:** 512×512px PNG (no alpha channel) for Play Store listing
- **Feature graphic:** 1024×500px banner image
- **Screenshots:** minimum 2 phone screenshots (can be taken from Android emulator)
- **Privacy Policy URL:** required for Play Store — create a simple page at `myreality.vercel.app/privacy`
- **Short description:** max 80 characters
- **Full description:** max 4000 characters
- **Content rating:** complete the questionnaire in Play Console (will be rated "Everyone")

### 17.6 Privacy Policy Page
Add `/app/privacy/page.tsx` — a simple static page covering:
- What data is collected (email, name, task data)
- How it's stored (Supabase, South Africa/global)
- User rights (delete account = delete all data)
- Contact email for privacy queries

---

## 18. RESEND — EMAIL (BUILT BUT DISABLED)

Create `/lib/email.ts` with this structure:

```ts
// Set to true when Resend API key is configured and emails should send
const RESEND_ENABLED = false

export async function sendWorkspaceInvite(params: {
  toEmail: string
  toName: string
  fromName: string
  workspaceName: string
  inviteUrl: string
}): Promise<void> {
  if (!RESEND_ENABLED) {
    console.log('[Email disabled] Would have sent workspace invite to:', params.toEmail)
    return
  }
  // Resend implementation here
}

export async function sendTaskAssignedEmail(params: {
  toEmail: string
  toName: string
  taskTitle: string
  projectName: string
  assignedBy: string
  taskUrl: string
}): Promise<void> {
  if (!RESEND_ENABLED) {
    console.log('[Email disabled] Would have sent task assigned email to:', params.toEmail)
    return
  }
  // Resend implementation here
}

export async function sendPasswordResetEmail(params: {
  toEmail: string
  resetUrl: string
}): Promise<void> {
  if (!RESEND_ENABLED) {
    console.log('[Email disabled] Would have sent password reset to:', params.toEmail)
    return
  }
  // Resend implementation here
}
```

All email function calls throughout the app must go through this file. Never call Resend directly from a component or API route.

---

## 19. VERCEL DEPLOYMENT

1. Push code to GitHub repo `myreality`
2. Connect repo to Vercel
3. Set all env vars from Section 2 in Vercel dashboard
4. Set `NEXT_PUBLIC_APP_URL` to the Vercel production URL (e.g. `https://myreality.vercel.app`)
5. Enable Supabase Auth redirect URLs for both the Vercel domain AND `http://localhost:3000`
6. `npm run build` must pass before any deployment is considered complete
7. After first live deploy, update `capacitor.config.ts` `server.url` with the live Vercel URL and rebuild the Android APK

---

## 20. WHAT TO DO WHEN UNCERTAIN

If at any point during the build you are:
- Unsure about a design decision → **STOP. Ask.**
- About to install a package not in Section 3 → **STOP. Ask.**
- About to create a file not in Section 7 → **STOP. Ask.**
- Finding a conflict between two parts of this spec → **STOP. Point it out.**
- Tempted to simplify or skip a feature → **STOP. Ask if it can be deferred.**

The answer to uncertainty is always: **ask, don't assume.**

---

*MyReality Build Spec v2.0*
*Author: Senior Engineering Plan for Claude Code execution*
*Platforms: Web (Vercel) + PWA (installable) + Android (Google Play Store)*
*Status: Ready to build — start at Step 1*
