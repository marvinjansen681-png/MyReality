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
