-- Add screentime time window columns to goals table
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS screentime_start_hour INTEGER DEFAULT 18; -- 6pm default

ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS screentime_end_hour INTEGER DEFAULT 20; -- 8pm default

-- Create index on screentime time window fields for filtering screentime goals
CREATE INDEX IF NOT EXISTS idx_goals_screentime_window ON goals(screentime_start_hour, screentime_end_hour) 
WHERE screentime_start_hour IS NOT NULL AND screentime_end_hour IS NOT NULL;

