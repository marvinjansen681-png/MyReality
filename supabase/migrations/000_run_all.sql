-- MyReality — Combined Migration File
-- Run this entire file in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/khcpvjtphzidwzbhtayh/sql/new
--
-- Paste all of this, click "Run", done.

-- =========================================
-- 001 — Enable UUID extension
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- 002 — Workspaces
-- =========================================
CREATE TABLE IF NOT EXISTS workspaces (
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

-- =========================================
-- 003 — Workspace Members
-- =========================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 004 — Profiles
-- =========================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================
-- 005 — Projects
-- =========================================
CREATE TABLE IF NOT EXISTS projects (
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

-- =========================================
-- 006 — Columns
-- =========================================
CREATE TABLE IF NOT EXISTS columns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  color text NOT NULL DEFAULT '#2e2e2e',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 007 — Tasks
-- =========================================
CREATE TABLE IF NOT EXISTS tasks (
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

-- =========================================
-- 008 — Task Comments
-- =========================================
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 009 — Task Activity
-- =========================================
CREATE TABLE IF NOT EXISTS task_activity (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 010 — Weekly Plans
-- =========================================
CREATE TABLE IF NOT EXISTS weekly_plans (
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

-- =========================================
-- 011 — Visions
-- =========================================
CREATE TABLE IF NOT EXISTS visions (
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

-- =========================================
-- 012 — Notifications
-- =========================================
CREATE TABLE IF NOT EXISTS notifications (
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

-- =========================================
-- 013 — RLS Policies
-- =========================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- WORKSPACES
DROP POLICY IF EXISTS "Members can view workspace" ON workspaces;
CREATE POLICY "Members can view workspace" ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Owner can update workspace" ON workspaces;
CREATE POLICY "Owner can update workspace" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owner can insert workspace" ON workspaces;
CREATE POLICY "Owner can insert workspace" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- WORKSPACE MEMBERS
DROP POLICY IF EXISTS "Members can view other members" ON workspace_members;
CREATE POLICY "Members can view other members" ON workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can insert members" ON workspace_members;
CREATE POLICY "Admins can insert members" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));
DROP POLICY IF EXISTS "Owner can insert self as member" ON workspace_members;
CREATE POLICY "Owner can insert self as member" ON workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- PROJECTS
DROP POLICY IF EXISTS "Workspace members can view projects" ON projects;
CREATE POLICY "Workspace members can view projects" ON projects FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Workspace members can create projects" ON projects;
CREATE POLICY "Workspace members can create projects" ON projects FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Workspace members can update projects" ON projects;
CREATE POLICY "Workspace members can update projects" ON projects FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- COLUMNS
DROP POLICY IF EXISTS "Workspace members can manage columns" ON columns;
CREATE POLICY "Workspace members can manage columns" ON columns FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

-- TASKS
DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
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
DROP POLICY IF EXISTS "Members can create tasks" ON tasks;
CREATE POLICY "Members can create tasks" ON tasks FOR INSERT
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;
CREATE POLICY "Members can update tasks" ON tasks FOR UPDATE
  USING (
    created_by = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );
DROP POLICY IF EXISTS "Creator can delete tasks" ON tasks;
CREATE POLICY "Creator can delete tasks" ON tasks FOR DELETE USING (created_by = auth.uid());

-- TASK COMMENTS
DROP POLICY IF EXISTS "Workspace members can view comments" ON task_comments;
CREATE POLICY "Workspace members can view comments" ON task_comments FOR SELECT
  USING (task_id IN (SELECT id FROM tasks));
DROP POLICY IF EXISTS "Members can add comments" ON task_comments;
CREATE POLICY "Members can add comments" ON task_comments FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Authors can delete comments" ON task_comments;
CREATE POLICY "Authors can delete comments" ON task_comments FOR DELETE USING (user_id = auth.uid());

-- TASK ACTIVITY
DROP POLICY IF EXISTS "Members can view activity" ON task_activity;
CREATE POLICY "Members can view activity" ON task_activity FOR SELECT
  USING (task_id IN (SELECT id FROM tasks));
DROP POLICY IF EXISTS "System can insert activity" ON task_activity;
CREATE POLICY "System can insert activity" ON task_activity FOR INSERT WITH CHECK (user_id = auth.uid());

-- WEEKLY PLANS
DROP POLICY IF EXISTS "Users manage own weekly plans" ON weekly_plans;
CREATE POLICY "Users manage own weekly plans" ON weekly_plans FOR ALL USING (user_id = auth.uid());

-- VISIONS
DROP POLICY IF EXISTS "Users manage own visions" ON visions;
CREATE POLICY "Users manage own visions" ON visions FOR ALL USING (user_id = auth.uid());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- =========================================
-- 014 — Realtime
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =========================================
-- Storage: visions bucket
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('visions', 'visions', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload vision images" ON storage.objects;
CREATE POLICY "Users can upload vision images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'visions' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own vision images" ON storage.objects;
CREATE POLICY "Users can view own vision images" ON storage.objects FOR SELECT
  USING (bucket_id = 'visions' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own vision images" ON storage.objects;
CREATE POLICY "Users can delete own vision images" ON storage.objects FOR DELETE
  USING (bucket_id = 'visions' AND auth.uid()::text = (storage.foldername(name))[1]);


-- =========================================
-- 015 — Patch: notif_prefs + avatars/logos storage
-- =========================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT '{
    "task_assigned": true,
    "task_commented": true,
    "task_due": true,
    "mention": true,
    "vision_due": true
  }'::jsonb;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',          'avatars',          true),
  ('workspace-logos',  'workspace-logos',  true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Workspace logo upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workspace-logos');

CREATE POLICY "Workspace logos are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'workspace-logos');

CREATE POLICY "Workspace logo update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'workspace-logos');
