-- Fix: weekly_plans day_index constraint must allow 7 (used for weekly intention)
ALTER TABLE weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_day_index_check;
ALTER TABLE weekly_plans ADD CONSTRAINT weekly_plans_day_index_check CHECK (day_index BETWEEN 0 AND 7);
