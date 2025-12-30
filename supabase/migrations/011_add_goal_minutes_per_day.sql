-- Add minutes_per_day column to goals table for health goals
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS minutes_per_day INTEGER;

-- Create index on minutes_per_day for filtering health goals
CREATE INDEX IF NOT EXISTS idx_goals_minutes_per_day ON goals(minutes_per_day) WHERE minutes_per_day IS NOT NULL;

