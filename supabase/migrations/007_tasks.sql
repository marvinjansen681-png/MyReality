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
