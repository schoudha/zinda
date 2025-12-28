-- Add target column to goals table for integer targets
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS target INTEGER;

-- Create index on target for filtering goals with targets
CREATE INDEX IF NOT EXISTS idx_goals_target ON goals(target) WHERE target IS NOT NULL;

