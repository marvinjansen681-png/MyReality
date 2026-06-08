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
