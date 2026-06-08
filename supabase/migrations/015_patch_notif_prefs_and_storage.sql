-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: notif_prefs column + storage buckets
-- Run this in the Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add notif_prefs JSONB column to profiles (default: all notifications on)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT '{
    "task_assigned": true,
    "task_commented": true,
    "task_due": true,
    "mention": true,
    "vision_due": true
  }'::jsonb;

-- 2. Add logo_url column to workspaces (if not already present)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS logo_url text;

-- 3. Create storage buckets for avatars and workspace logos
-- (Supabase storage.buckets table — these are idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',          'avatars',          true),
  ('workspace-logos',  'workspace-logos',  true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies — allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Storage RLS policies — workspace logos (any workspace member can upload)
CREATE POLICY "Workspace logo upload by owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workspace-logos');

CREATE POLICY "Workspace logos are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'workspace-logos');

CREATE POLICY "Workspace logo update by owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'workspace-logos');
